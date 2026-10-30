"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";
import {
  createAssignmentSchema,
  type CreateAssignmentInput,
} from "@/lib/validation/assignment";

export async function createAssignmentAction(input: CreateAssignmentInput) {
  const session = await requireRole(["teacher", "admin"]);
  const parsed = createAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data penugasan belum lengkap.",
    };
  }

  const supabase = await createClient();
  const data = parsed.data;
  const status = data.publishImmediately ? "published" : "draft";

  const { data: assignment, error: assignError } = await supabase
    .from("assignments")
    .insert({
      class_id: data.classId,
      teacher_id: session.userId,
      title: data.title,
      description: data.description,
      learning_objectives: data.learningObjectives,
      design_brief: data.designBrief,
      instructions: data.instructions || null,
      design_type: data.designType,
      target_platform: data.targetPlatform,
      target_user: data.targetUser || null,
      allowed_submission_types: data.allowedSubmissionTypes,
      max_attempts: data.maxAttempts,
      deadline: new Date(data.deadline).toISOString(),
      late_submission_policy: data.lateSubmissionPolicy,
      show_ai_score_before_review: data.showAiScoreBeforeReview,
      allow_revision: data.allowRevision,
      status,
      published_at: data.publishImmediately ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (assignError || !assignment) {
    return { error: "Gagal menyimpan penugasan ke database." };
  }

  // Kunci tautan ke rubric_version_id (snapshot immutable)
  const { error: linkError } = await supabase.from("assignment_rubrics").insert({
    assignment_id: assignment.id,
    rubric_version_id: data.rubricVersionId,
  });

  if (linkError) {
    return { error: "Gagal mengaitkan snapshot rubrik pada tugas ini." };
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/assignments");
  revalidatePath("/student");

  return { assignmentId: assignment.id };
}