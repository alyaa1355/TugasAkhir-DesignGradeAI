import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { createSignedAssetUrl } from "@/lib/supabase/storage";
import {
  StudentWorkStatusBadge,
  resolveStudentWorkState,
} from "@/components/shared/status-badge";
import { SubmissionWorkspace } from "@/features/submissions/submission-workspace";
import { AIAssessmentPanel } from "@/features/assessment/ai-assessment-panel";
import { StudentFeedbackPanel } from "@/features/assessment/student-feedback-panel";
import type { AssignmentStatus, SubmissionStatus } from "@/types/database";

async function StudentAssignmentDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  await requireRole(["student"]);
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      `
      *,
      classes(name),
      assignment_rubrics(
        rubric_version_id,
        rubric_versions(
          version_number,
          total_weight,
          rubric_criteria(
            id,
            name,
            description,
            weight,
            performance_descriptors,
            sort_order
          )
        )
      ),
      submissions(
        id,
        version_number,
        status,
        submission_note,
        is_late,
        submitted_at,
        created_at,
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
          published_at,
          criterion_scores
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (!assignment) {
    notFound();
  }

  const submissions = (
    Array.isArray(assignment.submissions) ? assignment.submissions : []
  ).sort((a: any, b: any) => b.version_number - a.version_number);

  const latestSubmission = submissions[0];

  const workState = resolveStudentWorkState(
    assignment.status as AssignmentStatus,
    latestSubmission?.status as SubmissionStatus | undefined
  );

  // Buat Signed URL sementara untuk aset pada submission terbaru
  const rawAssets = Array.isArray(latestSubmission?.submission_assets)
    ? latestSubmission.submission_assets
    : [];

  const existingAssetsWithSignedUrls = await Promise.all(
    rawAssets.map(
      async (asset: {
        id: string;
        asset_type: string;
        storage_path: string | null;
        figma_url: string | null;
        file_size: number | null;
        mime_type: string | null;
      }) => ({
        id: asset.id,
        assetType: asset.asset_type,
        signedUrl: await createSignedAssetUrl(asset.storage_path, 3600),
        figmaUrl: asset.figma_url,
        fileSize: asset.file_size,
        mimeType: asset.mime_type,
      })
    )
  );

  const nonDraftAttempts = submissions.filter(
    (s: any) => s.status !== "draft"
  ).length;
  const canSubmitOrUpdate =
    assignment.status === "published" &&
    (latestSubmission?.status === "draft" ||
      (nonDraftAttempts < assignment.max_attempts &&
        (!latestSubmission ||
          latestSubmission.status === "revision_requested" ||
          assignment.allow_revision)));

  const nextVersionNumber =
    latestSubmission?.status === "draft"
      ? latestSubmission.version_number
      : (latestSubmission?.version_number ?? 0) + 1;

  const rubricLink = Array.isArray(assignment.assignment_rubrics)
    ? assignment.assignment_rubrics[0]
    : assignment.assignment_rubrics;
  const criteria =
    rubricLink?.rubric_versions?.rubric_criteria?.sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    ) ?? [];

  return (
    <div className="space-y-8">
      {/* Header Tugas */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E5E2DC] pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
              {assignment.design_type.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-[11px] text-[#63615C]">
              Platform: {assignment.target_platform}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {assignment.title}
          </h1>
          <p className="font-mono text-xs text-[#63615C]">
            Tenggat:{" "}
            {new Date(assignment.deadline).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • Percobaan: {nonDraftAttempts} / {assignment.max_attempts}
          </p>
        </div>

        <StudentWorkStatusBadge state={workState} />
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Brief & Area Pengumpulan */}
        <div className="lg:col-span-7 space-y-6">
          <section className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[#1E3A5F]">
              01 // TUJUAN PEMBELAJARAN & BRIEF DESAIN
            </h2>
            <p className="text-xs font-medium text-[#141413] whitespace-pre-line">
              {assignment.learning_objectives}
            </p>
            <div className="pt-3 border-t border-[#E5E2DC]">
              <p className="text-xs leading-relaxed text-[#575551] whitespace-pre-line">
                {assignment.design_brief}
              </p>
            </div>
          </section>

          {latestSubmission && (
            <StudentFeedbackPanel
              review={
                Array.isArray(latestSubmission.teacher_reviews)
                  ? latestSubmission.teacher_reviews[0] ?? null
                  : latestSubmission.teacher_reviews ?? null
              }
            />
          )}

          {/* Komponen Pengumpulan Karya */}
          <SubmissionWorkspace
            assignmentId={assignment.id}
            allowedModes={assignment.allowed_submission_types ?? ["image", "figma"]}
            canSubmitOrUpdate={canSubmitOrUpdate}
            nextVersionNumber={nextVersionNumber}
            existingNote={latestSubmission?.submission_note}
            existingAssets={existingAssetsWithSignedUrls}
          />

          {latestSubmission && (
            <AIAssessmentPanel
              submissionId={latestSubmission.id}
              submissionStatus={latestSubmission.status}
              viewerRole="student"
              showScoreToStudent={Boolean(assignment.show_ai_score_before_review)}
              assessment={
                Array.isArray(latestSubmission.ai_assessments)
                  ? latestSubmission.ai_assessments[0] ?? null
                  : latestSubmission.ai_assessments ?? null
              }
            />
          )}

          {/* Riwayat Versi Submission */}
          {submissions.length > 0 && (
            <section className="p-5 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/60 space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-wider text-[#575551]">
                RIWAYAT VERSI SUBMISSION
              </h2>
              <div className="space-y-2">
                {submissions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-[6px] bg-white border border-[#E5E2DC] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                        v{sub.version_number}
                      </span>
                      <span className="text-[#575551]">
                        {sub.submitted_at
                          ? `Dikirim ${new Date(sub.submitted_at).toLocaleString("id-ID")}`
                          : "Disimpan sebagai Draft"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] uppercase text-[#141413]">
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Kolom Kanan: Indikator Rubrik */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/70 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
              <h2 className="text-xs font-semibold uppercase font-mono tracking-wider">
                Standar Rubrik Penilaian
              </h2>
              <span className="font-mono text-[11px] font-medium text-[#1F513F] bg-[#EAF2EE] px-2 py-0.5 rounded-[3px]">
                TOTAL 100%
              </span>
            </div>

            <div className="space-y-3">
              {criteria.map(
                (c: {
                  id: string;
                  name: string;
                  description: string;
                  weight: number;
                }) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-[6px] bg-white border border-[#E5E2DC] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#141413]">
                        {c.name}
                      </span>
                      <span className="font-mono text-xs font-medium text-[#1E3A5F] tabular-nums">
                        {c.weight}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#575551] leading-relaxed">
                      {c.description}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 rounded-[8px] bg-[#EFECE6] animate-pulse" />
          <div className="h-80 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
        </div>
      }
    >
      <StudentAssignmentDetailContent paramsPromise={params} />
    </Suspense>
  );
}