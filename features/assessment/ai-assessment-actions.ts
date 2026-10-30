"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/permissions/auth";
import { SUBMISSION_BUCKET } from "@/lib/supabase/storage";
import {
  invokeGeminiDesignAssessment,
  AssessmentProviderError,
} from "@/lib/ai/gemini-provider";
import { calculateServerWeightedScore } from "@/lib/ai/score-calculator";
import { PROMPT_VERSION } from "@/lib/ai/prompt-builder";
import { getServerEnv } from "@/lib/env";
import type { RubricCriterionDefinition } from "@/lib/ai/schema";

export async function runSubmissionAIAssessmentAction(
  submissionId: string,
  options?: { forceRetry?: boolean }
) {
  const session = await requireAuthenticatedUser();
  const supabase = await createClient();
  const env = getServerEnv();

  // 1. Ambil submission beserta assignment, snapshot rubrik, dan aset gambar
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select(
      `
      id,
      assignment_id,
      student_id,
      version_number,
      status,
      submission_note,
      assignments(
        id,
        teacher_id,
        title,
        design_type,
        target_platform,
        learning_objectives,
        design_brief,
        instructions,
        assignment_rubrics(
          rubric_version_id,
          rubric_versions(
            id,
            version_number,
            rubric_criteria(
              id,
              name,
              description,
              weight,
              performance_descriptors,
              assessment_guidance,
              sort_order
            )
          )
        )
      ),
      submission_assets(
        id,
        asset_type,
        storage_path,
        figma_url,
        mime_type
      ),
      ai_assessments(
        id,
        status,
        calculated_score
      )
    `
    )
    .eq("id", submissionId)
    .single();

  if (subErr || !submission) {
    return { error: "Data submission tidak ditemukan." };
  }

  const assignment = Array.isArray(submission.assignments)
    ? submission.assignments[0]
    : submission.assignments;

  if (!assignment) {
    return { error: "Data tugas terkait tidak ditemukan." };
  }

  // 2. Validasi hak akses pemicu assessment (Pemilik karya, Guru kelas, atau Admin)
  const isOwnerStudent = submission.student_id === session.userId;
  const isAssignedTeacher = assignment.teacher_id === session.userId;
  const isAdmin = session.profile.role === "admin";

  if (!isOwnerStudent && !isAssignedTeacher && !isAdmin) {
    return { error: "Anda tidak memiliki izin untuk memicu evaluasi AI ini." };
  }

  // 3. Idempotency Check: Cegah pemanggilan AI berulang tanpa alasan
  const existingAssessments = Array.isArray(submission.ai_assessments)
    ? submission.ai_assessments
    : [];
  const activeOrCompleted = existingAssessments.find((a) =>
    ["processing", "completed", "incomplete_evidence"].includes(a.status)
  );

  if (activeOrCompleted && !options?.forceRetry) {
    return {
      alreadyProcessed: true,
      assessmentId: activeOrCompleted.id,
      status: activeOrCompleted.status,
    };
  }

  // 4. Pastikan berkas gambar dan kriteria rubrik tersedia
  const assets = Array.isArray(submission.submission_assets)
    ? submission.submission_assets
    : [];
  const primaryImageAsset = assets.find((a) => a.storage_path && a.mime_type);

  if (!primaryImageAsset?.storage_path || !primaryImageAsset.mime_type) {
    return {
      error:
        "Berkas gambar desain tidak ditemukan pada submission ini untuk dianalisis.",
    };
  }

  const rubricLink = Array.isArray(assignment.assignment_rubrics)
    ? assignment.assignment_rubrics[0]
    : assignment.assignment_rubrics;
  const rawRubricVersions = rubricLink?.rubric_versions;
  const rubricVersion = Array.isArray(rawRubricVersions)
    ? rawRubricVersions[0]
    : rawRubricVersions;
  const rawCriteria = (rubricVersion?.rubric_criteria ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );

  if (!rubricVersion?.id || rawCriteria.length === 0) {
    return {
      error: "Snapshot rubrik penilaian belum tersedia pada tugas ini.",
    };
  }

  const officialCriteria: RubricCriterionDefinition[] = rawCriteria.map(
    (c: {
      id: string;
      name: string;
      description: string;
      weight: number;
      performance_descriptors: Record<string, string>;
      assessment_guidance: string | null;
    }) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      weight: Number(c.weight),
      performance_descriptors: c.performance_descriptors ?? {},
      assessment_guidance: c.assessment_guidance,
    })
  );

  // 5. Unduh gambar dari Private Storage Bucket di sisi server
  const { data: imageBlob, error: downloadErr } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .download(primaryImageAsset.storage_path);

  if (downloadErr || !imageBlob) {
    return {
      error: "Gagal membaca berkas gambar dari penyimpanan privat server.",
    };
  }

  const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());

  // 6. Buat record ai_assessments berstatus 'processing' & update status submission
  const { data: assessmentRecord, error: insertAssessErr } = await supabase
    .from("ai_assessments")
    .insert({
      submission_id: submission.id,
      rubric_version_id: rubricVersion.id,
      model_name: env.GEMINI_MODEL || "gemini-2.5-flash",
      prompt_version: PROMPT_VERSION,
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertAssessErr || !assessmentRecord) {
    return { error: "Gagal menginisialisasi catatan analisis AI di database." };
  }

  await supabase
    .from("submissions")
    .update({ status: "processing" })
    .eq("id", submission.id);

  // 7. Panggil Gemini Vision API & Hitung Skor Berbobot di Server
  try {
    const aiResult = await invokeGeminiDesignAssessment({
      imageBytes,
      mimeType: primaryImageAsset.mime_type,
      assignmentTitle: assignment.title,
      designType: assignment.design_type,
      targetPlatform: assignment.target_platform,
      learningObjectives: assignment.learning_objectives,
      designBrief: assignment.design_brief,
      instructions: assignment.instructions,
      studentNote: submission.submission_note,
      figmaUrlProvided: Boolean(assets.find((a) => a.figma_url)),
      criteria: officialCriteria,
    });

    const calculation = calculateServerWeightedScore(
      officialCriteria,
      aiResult.output.criteria
    );

    const finalAiStatus = calculation.hasInsufficientEvidence
      ? "incomplete_evidence"
      : "completed";

    await supabase
      .from("ai_assessments")
      .update({
        model_name: aiResult.modelUsed,
        status: finalAiStatus,
        criteria_results: calculation.normalizedCriteria,
        calculated_score: calculation.calculatedScore,
        summary: aiResult.output.summary,
        error_code: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assessmentRecord.id);

    await supabase
      .from("submissions")
      .update({ status: "awaiting_teacher_review" })
      .eq("id", submission.id);

    revalidatePath(`/student/assignments/${assignment.id}`);
    revalidatePath(`/teacher/assignments/${assignment.id}`);
    revalidatePath(`/teacher/reviews/${submission.id}`);

    return {
      success: true,
      assessmentId: assessmentRecord.id,
      calculatedScore: calculation.calculatedScore,
      status: finalAiStatus,
    };
  } catch (err) {
    const safeErrorCode =
      err instanceof AssessmentProviderError ? err.code : "UPSTREAM_AI_ERROR";
    const safeMessage =
      err instanceof Error
        ? err.message
        : "Analisis AI gagal diproses. Karya Anda tetap tersimpan dengan aman.";

    // Sesuai spesifikasi Bagian 23: Jangan buat nilai palsu, simpan status failed & pertahankan submission
    await supabase
      .from("ai_assessments")
      .update({
        status: "failed",
        error_code: safeErrorCode,
        summary: safeMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assessmentRecord.id);

    await supabase
      .from("submissions")
      .update({ status: "failed" })
      .eq("id", submission.id);

    revalidatePath(`/student/assignments/${assignment.id}`);
    revalidatePath(`/teacher/assignments/${assignment.id}`);

    return {
      error: safeMessage,
      errorCode: safeErrorCode,
    };
  }
}