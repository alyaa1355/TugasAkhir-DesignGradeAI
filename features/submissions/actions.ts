"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";
import { getServerEnv } from "@/lib/env";
import {
  submissionMetadataSchema,
  verifyImageMagicBytes,
} from "@/lib/validation/submission";
import {
  SUBMISSION_BUCKET,
  buildSafeSubmissionStoragePath,
} from "@/lib/supabase/storage";
import { runSubmissionAIAssessmentAction } from "@/features/assessment/ai-assessment-actions";

export async function submitDesignWorkAction(formData: FormData) {
  const session = await requireRole(["student"]);
  const env = getServerEnv();

  const rawMeta = {
    assignmentId: String(formData.get("assignmentId") ?? ""),
    submissionMode: String(formData.get("submissionMode") ?? "image"),
    figmaUrl: formData.get("figmaUrl")
      ? String(formData.get("figmaUrl"))
      : undefined,
    figmaArtifactType: formData.get("figmaArtifactType")
      ? String(formData.get("figmaArtifactType"))
      : undefined,
    submissionNote: formData.get("submissionNote")
      ? String(formData.get("submissionNote"))
      : undefined,
    intent: String(formData.get("intent") ?? "submit_final"),
  };

  const parsedMeta = submissionMetadataSchema.safeParse(rawMeta);
  if (!parsedMeta.success) {
    return {
      error:
        parsedMeta.error.issues[0]?.message ?? "Data pengumpulan tidak valid.",
    };
  }

  const meta = parsedMeta.data;
  if (meta.submissionMode === "figma" && !meta.figmaUrl) {
    return {
      error: "Tautan Figma wajib diisi untuk jalur pengumpulan Figma.",
    };
  }

  const file = formData.get("designImage") as File | null;
  if (!file || file.size === 0) {
    return {
      error:
        meta.submissionMode === "figma"
          ? "Harap sertakan tangkapan layar (PNG/JPG/WebP) dari frame Figma yang akan dinilai."
          : "Harap pilih berkas gambar desain (PNG, JPG, atau WebP) untuk diunggah.",
    };
  }

  if (file.size > env.MAX_UPLOAD_SIZE_BYTES) {
    const maxMb = (env.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      error: `Ukuran berkas melebihi batas maksimal server (${maxMb} MB).`,
    };
  }

  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const magicCheck = verifyImageMagicBytes(fileBuffer, file.type);

  if (!magicCheck.valid || !magicCheck.detectedExt) {
    return {
      error:
        "Format berkas tidak valid atau rusak. Gunakan berkas gambar asli berformat PNG, JPG, atau WebP.",
    };
  }

  const supabase = await createClient();

  // 1. Ambil detail tugas & verifikasi status serta deadline
  const { data: assignment, error: assignErr } = await supabase
    .from("assignments")
    .select(
      "id, class_id, status, deadline, late_submission_policy, max_attempts, allowed_submission_types, allow_revision"
    )
    .eq("id", meta.assignmentId)
    .single();

  if (assignErr || !assignment) {
    return { error: "Tugas tidak ditemukan atau Anda tidak memiliki akses." };
  }

  if (assignment.status !== "published") {
    return {
      error: "Tugas ini sudah ditutup dan tidak lagi menerima pengumpulan baru.",
    };
  }

  const isPastDeadline = new Date() > new Date(assignment.deadline);
  if (isPastDeadline && assignment.late_submission_policy === "strict_reject") {
    return {
      error:
        "Tenggat waktu pengumpulan telah berakhir dan tugas ini tidak menerima pengumpulan terlambat.",
    };
  }

  // 2. Periksa riwayat submission siswa pada tugas ini untuk menentukan versi
  const { data: existingSubs } = await supabase
    .from("submissions")
    .select("id, version_number, status")
    .eq("assignment_id", assignment.id)
    .eq("student_id", session.userId)
    .order("version_number", { ascending: false });

  const history = existingSubs ?? [];
  const latestSub = history[0];

  // Hitung jumlah submission non-draft yang sudah pernah dikirim
  const submittedAttemptsCount = history.filter(
    (s) => s.status !== "draft"
  ).length;

  const isUpdatingExistingDraft = latestSub?.status === "draft";

  if (!isUpdatingExistingDraft && submittedAttemptsCount >= assignment.max_attempts) {
    return {
      error: `Anda telah mencapai batas maksimal percobaan pengumpulan (${assignment.max_attempts}x) untuk tugas ini.`,
    };
  }

  if (
    latestSub &&
    !isUpdatingExistingDraft &&
    latestSub.status !== "revision_requested" &&
    !assignment.allow_revision
  ) {
    return {
      error: "Pengumpulan ulang tidak diizinkan kecuali diminta revisi oleh guru.",
    };
  }

  const nextVersionNumber = isUpdatingExistingDraft
    ? latestSub.version_number
    : (latestSub?.version_number ?? 0) + 1;

  // 3. Unggah berkas ke Private Storage Bucket
  const storagePath = buildSafeSubmissionStoragePath({
    classId: assignment.class_id,
    assignmentId: assignment.id,
    studentId: session.userId,
    versionNumber: nextVersionNumber,
    extension: magicCheck.detectedExt,
  });

  const { error: uploadError } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      error: `Gagal mengunggah berkas ke penyimpanan aman: ${uploadError.message}`,
    };
  }

  const targetStatus = meta.intent === "submit_final" ? "submitted" : "draft";
  let submissionId: string;

  // 4. Simpan metadata submission ke database (dengan kompensasi hapus file jika gagal)
  if (isUpdatingExistingDraft) {
    const { data: updatedSub, error: updateErr } = await supabase
      .from("submissions")
      .update({
        status: targetStatus,
        submission_note: meta.submissionNote || null,
        is_late: isPastDeadline,
        submitted_at:
          targetStatus === "submitted" ? new Date().toISOString() : null,
      })
      .eq("id", latestSub.id)
      .select("id")
      .single();

    if (updateErr || !updatedSub) {
      await supabase.storage.from(SUBMISSION_BUCKET).remove([storagePath]);
      return { error: "Gagal memperbarui draf submission di database." };
    }
    submissionId = updatedSub.id;

    // Bersihkan catatan aset draft lama sebelum menggantinya dengan yang baru
    await supabase
      .from("submission_assets")
      .delete()
      .eq("submission_id", submissionId);
  } else {
    const { data: newSub, error: insertErr } = await supabase
      .from("submissions")
      .insert({
        assignment_id: assignment.id,
        student_id: session.userId,
        version_number: nextVersionNumber,
        status: targetStatus,
        submission_note: meta.submissionNote || null,
        is_late: isPastDeadline,
        submitted_at:
          targetStatus === "submitted" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (insertErr || !newSub) {
      // Kompensasi: Hapus file dari storage jika transaksi DB gagal
      await supabase.storage.from(SUBMISSION_BUCKET).remove([storagePath]);
      return {
        error: "Gagal menyimpan catatan submission. Berkas telah dibersihkan.",
      };
    }
    submissionId = newSub.id;
  }

  // 5. Simpan catatan aset gambar & tautan Figma (jika ada)
  const assetRecords = [
    {
      submission_id: submissionId,
      asset_type:
        meta.submissionMode === "figma" ? "supporting_screenshot" : "image",
      storage_path: storagePath,
      figma_url: meta.submissionMode === "figma" ? meta.figmaUrl ?? null : null,
      mime_type: file.type,
      file_size: file.size,
    },
  ];

  const { error: assetErr } = await supabase
    .from("submission_assets")
    .insert(assetRecords);

  if (assetErr) {
    await supabase.storage.from(SUBMISSION_BUCKET).remove([storagePath]);
    return { error: "Gagal mencatat metadata berkas submission." };
  }

  if (targetStatus === "submitted") {
    await runSubmissionAIAssessmentAction(submissionId);
  }

  revalidatePath("/student");
  revalidatePath(`/student/assignments/${assignment.id}`);
  revalidatePath("/teacher");

  return {
    success: true,
    submissionId,
    versionNumber: nextVersionNumber,
    status: targetStatus,
  };
}