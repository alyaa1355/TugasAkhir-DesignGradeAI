"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";
import {
  saveTeacherReviewSchema,
  calculateTeacherFinalWeightedScore,
  type SaveTeacherReviewInput,
} from "@/lib/validation/review";
import type { SubmissionStatus, TeacherReviewStatus } from "@/types/database";

export async function saveTeacherReviewAction(input: SaveTeacherReviewInput) {
  const session = await requireRole(["teacher", "admin"]);
  const parsed = saveTeacherReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Data review guru tidak valid.",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 1. Ambil submission beserta assignment, kriteria rubrik resmi, hasil AI, dan review guru sebelumnya
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select(
      `
      id,
      assignment_id,
      student_id,
      version_number,
      status,
      assignments(
        id,
        title,
        teacher_id,
        assignment_rubrics(
          rubric_version_id,
          rubric_versions(
            id,
            rubric_criteria(id, name, weight, sort_order)
          )
        )
      ),
      ai_assessments(
        id,
        calculated_score,
        criteria_results
      ),
      teacher_reviews(
        id,
        criterion_scores,
        final_score,
        teacher_feedback,
        status
      )
    `
    )
    .eq("id", data.submissionId)
    .single();

  if (subErr || !submission) {
    return { error: "Submission tidak ditemukan." };
  }

  const assignment = Array.isArray(submission.assignments)
    ? submission.assignments[0]
    : submission.assignments;

  if (!assignment) {
    return { error: "Data penugasan tidak ditemukan." };
  }

  // Validasi otorisasi kepemilikan kelas/tugas di sisi server
  if (
    assignment.teacher_id !== session.userId &&
    session.profile.role !== "admin"
  ) {
    return {
      error:
        "FORBIDDEN: Anda hanya dapat menilai submission pada kelas yang menjadi kewenangan Anda.",
    };
  }

  const rubricLink = Array.isArray(assignment.assignment_rubrics)
    ? assignment.assignment_rubrics[0]
    : assignment.assignment_rubrics;

  const rubricVersion = Array.isArray(rubricLink?.rubric_versions)
    ? rubricLink.rubric_versions[0]
    : rubricLink?.rubric_versions;

  const officialCriteria = (rubricVersion?.rubric_criteria ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );

  if (officialCriteria.length === 0) {
    return { error: "Kriteria rubrik resmi tidak ditemukan pada tugas ini." };
  }

  const aiAssessments = Array.isArray(submission.ai_assessments)
    ? submission.ai_assessments
    : submission.ai_assessments
      ? [submission.ai_assessments]
      : [];
  const latestAi = aiAssessments[0] ?? null;
  const aiCriteriaResults = Array.isArray(latestAi?.criteria_results)
    ? latestAi.criteria_results
    : [];

  // 2. Hitung ulang skor berbobot secara ketat di sisi server
  const { enrichedScores, finalWeightedScore } =
    calculateTeacherFinalWeightedScore(
      officialCriteria,
      data.criterionScores,
      aiCriteriaResults
    );

  // 3. Tentukan status teacher_review dan status submission berdasarkan aksi guru
  const reviewStatusMap: Record<
    SaveTeacherReviewInput["action"],
    TeacherReviewStatus
  > = {
    save_draft: "draft",
    request_revision: "revision_requested",
    finalize_score: "finalized",
    publish_result: "published",
  };

  const targetReviewStatus = reviewStatusMap[data.action];

  let targetSubmissionStatus: SubmissionStatus =
    submission.status as SubmissionStatus;
  if (data.action === "request_revision") {
    targetSubmissionStatus = "revision_requested";
  } else if (data.action === "publish_result") {
    targetSubmissionStatus = "graded";
  } else if (
    data.action === "save_draft" ||
    data.action === "finalize_score"
  ) {
    targetSubmissionStatus = "awaiting_teacher_review";
  }

  const existingReviews = Array.isArray(submission.teacher_reviews)
    ? submission.teacher_reviews
    : submission.teacher_reviews
      ? [submission.teacher_reviews]
      : [];
  const existingReview = existingReviews[0] ?? null;

  const previousAuditSnapshot = existingReview
    ? {
      source: "previous_teacher_review",
      status: existingReview.status,
      final_score: existingReview.final_score,
      criterion_scores: existingReview.criterion_scores,
    }
    : {
      source: "initial_ai_assessment",
      ai_calculated_score: latestAi?.calculated_score ?? null,
      ai_criteria_results: aiCriteriaResults,
    };

  const reviewPayload = {
    submission_id: submission.id,
    ai_assessment_id: latestAi?.id ?? null,
    teacher_id: session.userId,
    criterion_scores: enrichedScores,
    final_score: finalWeightedScore,
    teacher_feedback: data.teacherFeedback,
    revision_reason:
      data.action === "request_revision" ? data.revisionReason || null : null,
    revision_deadline:
      data.action === "request_revision" && data.revisionDeadline
        ? new Date(data.revisionDeadline).toISOString()
        : null,
    status: targetReviewStatus,
    published_at:
      data.action === "publish_result" ? new Date().toISOString() : null,
  };

  // 4. Simpan ke tabel teacher_reviews (Upsert berdasarkan submission_id)
  const { error: upsertErr } = await supabase
    .from("teacher_reviews")
    .upsert(reviewPayload, { onConflict: "submission_id" });

  if (upsertErr) {
    return {
      error: `Gagal menyimpan review guru: ${upsertErr.message}`,
    };
  }

  // 5. Perbarui status pada tabel submissions
  await supabase
    .from("submissions")
    .update({ status: targetSubmissionStatus })
    .eq("id", submission.id);

  // 6. Catat riwayat perubahan nilai ke assessment_audit_logs
  await supabase.from("assessment_audit_logs").insert({
    submission_id: submission.id,
    actor_id: session.userId,
    action: data.action,
    previous_values: previousAuditSnapshot,
    new_values: {
      review_status: targetReviewStatus,
      submission_status: targetSubmissionStatus,
      final_score: finalWeightedScore,
      criterion_scores: enrichedScores,
      revision_reason: reviewPayload.revision_reason,
    },
    reason:
      data.correctionReason?.trim() ||
      (data.action === "request_revision"
        ? data.revisionReason
        : `Aksi review guru: ${data.action}`),
  });

  // 7. Buat notifikasi nyata untuk siswa jika hasil diterbitkan atau diminta revisi
  if (data.action === "publish_result") {
    await supabase.from("notifications").insert({
      user_id: submission.student_id,
      title: "Nilai Final Desain Telah Diterbitkan",
      message: `Guru telah mengesahkan nilai akhir (${finalWeightedScore.toFixed(
        1
      )}/100) beserta umpan balik untuk tugas "${assignment.title}".`,
      notification_type: "grade_published",
    });
  } else if (data.action === "request_revision") {
    await supabase.from("notifications").insert({
      user_id: submission.student_id,
      title: "Permintaan Revisi Karya Desain",
      message: `Guru meminta revisi pada karya v${submission.version_number} untuk tugas "${assignment.title}". Silakan periksa catatan perbaikan.`,
      notification_type: "revision_requested",
    });
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/reviews");
  revalidatePath(`/teacher/reviews/${submission.id}`);
  revalidatePath(`/teacher/assignments/${assignment.id}`);
  revalidatePath("/student");
  revalidatePath(`/student/assignments/${assignment.id}`);

  return {
    success: true,
    finalScore: finalWeightedScore,
    reviewStatus: targetReviewStatus,
    submissionStatus: targetSubmissionStatus,
  };
}