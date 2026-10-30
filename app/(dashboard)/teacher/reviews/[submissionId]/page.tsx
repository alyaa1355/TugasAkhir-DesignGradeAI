import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, History, FileText } from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { createSignedAssetUrl } from "@/lib/supabase/storage";
import { AIAssessmentPanel } from "@/features/assessment/ai-assessment-panel";
import { TeacherReviewWorkspace } from "@/features/assessment/teacher-review-workspace";

async function TeacherSubmissionReviewContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await paramsPromise;
  const { userId, profile } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      `
      id,
      assignment_id,
      student_id,
      version_number,
      status,
      submission_note,
      is_late,
      submitted_at,
      profiles:student_id(full_name),
      assignments!inner(
        id,
        title,
        teacher_id,
        design_type,
        target_platform,
        learning_objectives,
        design_brief,
        classes(name),
        assignment_rubrics(
          rubric_version_id,
          rubric_versions(
            version_number,
            rubric_criteria(
              id,
              name,
              description,
              weight,
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
        mime_type,
        file_size
      ),
      ai_assessments(
        id,
        model_name,
        prompt_version,
        status,
        calculated_score,
        summary,
        error_code,
        completed_at,
        criteria_results
      ),
      teacher_reviews(
        id,
        status,
        final_score,
        teacher_feedback,
        revision_reason,
        revision_deadline,
        criterion_scores,
        published_at,
        updated_at
      ),
      assessment_audit_logs(
        id,
        action,
        reason,
        created_at
      )
    `
    )
    .eq("id", submissionId)
    .single();

  if (!submission) {
    notFound();
  }

  const assignment = Array.isArray(submission.assignments)
    ? submission.assignments[0]
    : submission.assignments;

  if (
    !assignment ||
    (assignment.teacher_id !== userId && profile.role !== "admin")
  ) {
    notFound();
  }

  const student = Array.isArray(submission.profiles)
    ? submission.profiles[0]
    : submission.profiles;

  const assets = Array.isArray(submission.submission_assets)
    ? submission.submission_assets
    : [];
  const primaryImageAsset = assets.find((a) => a.storage_path);
  const signedImageUrl = await createSignedAssetUrl(
    primaryImageAsset?.storage_path ?? null,
    3600
  );
  const figmaLink = assets.find((a) => a.figma_url)?.figma_url ?? null;

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

  const aiAssessments = Array.isArray(submission.ai_assessments)
    ? submission.ai_assessments
    : submission.ai_assessments
      ? [submission.ai_assessments]
      : [];
  const latestAi = aiAssessments[0] ?? null;

  const teacherReviews = Array.isArray(submission.teacher_reviews)
    ? submission.teacher_reviews
    : submission.teacher_reviews
      ? [submission.teacher_reviews]
      : [];
  const existingReview = teacherReviews[0] ?? null;

  const auditLogs = (
    Array.isArray(submission.assessment_audit_logs)
      ? submission.assessment_audit_logs
      : []
  ).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-8">
      {/* Header Meja Kurasi */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div className="space-y-1.5">
          <Link
            href="/teacher/reviews"
            className="inline-flex items-center gap-1.5 text-xs text-[#575551] hover:text-[#141413]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Antrean Meja Review
          </Link>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
              VERSI v{submission.version_number}
            </span>
            <span className="font-mono text-xs text-[#63615C]">
              • Siswa: <strong className="text-[#141413]">{student?.full_name}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {assignment.title}
          </h1>
        </div>

        <span className="font-mono text-xs uppercase px-3 py-1 rounded-[4px] border border-[#E5E2DC] bg-[#F7F6F2]">
          STATUS KARYA: {submission.status}
        </span>
      </div>

      {/* Layout Split 12 Kolom: Kiri (Preview & Konteks Tugas), Kanan (Editor Skor & Review Guru) */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Panel Kiri: Preview Desain, Tautan Figma, Informasi Tugas & Audit Log */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
          <section className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F]">
                PANEL PREVIEW DESAIN SISWA
              </span>
              {signedImageUrl && (
                <a
                  href={signedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-[#1E3A5F] hover:underline inline-flex items-center gap-1"
                >
                  <span>Buka Ukuran Penuh</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {signedImageUrl ? (
              <div className="rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2] p-2 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signedImageUrl}
                  alt="Artefak desain siswa"
                  className="max-h-[440px] w-full object-contain mx-auto rounded"
                />
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#63615C]">
                Pratinjau gambar tidak tersedia.
              </div>
            )}

            {figmaLink && (
              <div className="p-3 rounded-[6px] bg-[#EBF0F5]/60 border border-[#1E3A5F]/20 flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-[#1E3A5F] truncate pr-2">
                  {figmaLink}
                </span>
                <a
                  href={figmaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 font-medium text-[#1E3A5F] hover:underline"
                >
                  <span>Buka File Figma</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {submission.submission_note && (
              <div className="p-3 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] text-xs space-y-1">
                <p className="font-mono text-[10px] uppercase text-[#63615C]">
                  Catatan Siswa:
                </p>
                <p className="text-[#141413] whitespace-pre-line">
                  {submission.submission_note}
                </p>
              </div>
            )}
          </section>

          {/* Panel Ringkasan Brief Tugas */}
          <section className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/70 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#575551]">
              <FileText className="h-3.5 w-3.5 text-[#1E3A5F]" />
              <span>REFERENSI BRIEF & TUJUAN</span>
            </div>
            <p className="font-medium text-[#141413]">
              {assignment.learning_objectives}
            </p>
            <p className="text-[#575551] leading-relaxed whitespace-pre-line">
              {assignment.design_brief}
            </p>
          </section>

          {/* Panel Trigger Ulang AI (Jika Diperlukan Guru) */}
          <AIAssessmentPanel
            submissionId={submission.id}
            submissionStatus={submission.status}
            viewerRole="teacher"
            showScoreToStudent={true}
            assessment={latestAi}
          />

          {/* Riwayat Audit Log Perubahan Nilai */}
          {auditLogs.length > 0 && (
            <section className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white space-y-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#575551]">
                <History className="h-3.5 w-3.5 text-[#1E3A5F]" />
                <span>RIWAYAT AUDIT PENILAIAN ({auditLogs.length})</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {auditLogs.map(
                  (log: {
                    id: string;
                    action: string;
                    reason: string | null;
                    created_at: string;
                  }) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-[5px] bg-[#F7F6F2] border border-[#E5E2DC] text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="font-semibold uppercase text-[#1E3A5F]">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[#63615C]">
                          {new Date(log.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {log.reason && (
                        <p className="text-[#575551]">{log.reason}</p>
                      )}
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>

        {/* Panel Kanan: Meja Koreksi Skor & Pengesahan Nilai Final */}
        <div className="lg:col-span-7">
          <TeacherReviewWorkspace
            submissionId={submission.id}
            officialCriteria={officialCriteria}
            aiCriteriaResults={
              Array.isArray(latestAi?.criteria_results)
                ? latestAi.criteria_results
                : []
            }
            aiCalculatedScore={
              latestAi?.calculated_score !== null &&
                latestAi?.calculated_score !== undefined
                ? Number(latestAi.calculated_score)
                : null
            }
            aiSummary={latestAi?.summary ?? null}
            existingReview={existingReview}
          />
        </div>
      </div>
    </div>
  );
}

export default function TeacherSubmissionReviewPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="h-96 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <TeacherSubmissionReviewContent paramsPromise={params} />
    </Suspense>
  );
}