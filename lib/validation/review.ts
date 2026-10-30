import { z } from "zod";

export const teacherCriterionScoreSchema = z.object({
  criterion_id: z.string().uuid("ID kriteria tidak valid."),
  score: z.coerce
    .number()
    .min(0, "Skor kriteria minimal 0.")
    .max(100, "Skor kriteria maksimal 100."),
  teacher_note: z.string().max(500).optional(),
});

export const saveTeacherReviewSchema = z
  .object({
    submissionId: z.string().uuid("ID submission tidak valid."),
    action: z.enum([
      "save_draft",
      "request_revision",
      "finalize_score",
      "publish_result",
    ]),
    criterionScores: z
      .array(teacherCriterionScoreSchema)
      .min(1, "Skor per kriteria wajib diisi."),
    teacherFeedback: z
      .string()
      .trim()
      .min(5, "Feedback guru wajib diisi minimal 5 karakter."),
    correctionReason: z.string().trim().max(500).optional(),
    revisionReason: z.string().trim().max(1000).optional(),
    revisionDeadline: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.action === "request_revision") {
        return Boolean(
          data.revisionReason && data.revisionReason.trim().length >= 5
        );
      }
      return true;
    },
    {
      message:
        "Alasan revisi dan kriteria yang perlu diperbaiki wajib diisi saat meminta revisi.",
      path: ["revisionReason"],
    }
  );

export type SaveTeacherReviewInput = z.infer<typeof saveTeacherReviewSchema>;

export interface EnrichedTeacherCriterionScore {
  criterion_id: string;
  criterion_name: string;
  weight: number;
  ai_score: number | null;
  teacher_score: number;
  weighted_score: number;
  teacher_note: string | null;
}

/**
 * Menghitung ulang nilai akhir berbobot di server berdasarkan skor kriteria yang ditetapkan guru
 * dan bobot rubrik resmi dari database.
 */
export function calculateTeacherFinalWeightedScore(
  officialCriteria: Array<{ id: string; name: string; weight: number }>,
  teacherInputs: Array<{
    criterion_id: string;
    score: number;
    teacher_note?: string;
  }>,
  aiCriteriaResults: Array<{ criterion_id: string; score: number | null }>
): {
  enrichedScores: EnrichedTeacherCriterionScore[];
  finalWeightedScore: number;
} {
  const teacherMap = new Map(
    teacherInputs.map((item) => [item.criterion_id, item])
  );
  const aiMap = new Map(
    aiCriteriaResults.map((item) => [item.criterion_id, item.score])
  );

  let totalWeighted = 0;

  const enrichedScores: EnrichedTeacherCriterionScore[] = officialCriteria.map(
    (crit) => {
      const input = teacherMap.get(crit.id);
      const rawScore = input ? Number(input.score) : 0;
      const clampedScore = Math.max(0, Math.min(100, rawScore));
      const weight = Number(crit.weight);
      const weighted = (clampedScore * weight) / 100;

      totalWeighted += weighted;

      return {
        criterion_id: crit.id,
        criterion_name: crit.name,
        weight,
        ai_score: aiMap.get(crit.id) ?? null,
        teacher_score: Number(clampedScore.toFixed(2)),
        weighted_score: Number(weighted.toFixed(2)),
        teacher_note: input?.teacher_note?.trim() || null,
      };
    }
  );

  return {
    enrichedScores,
    finalWeightedScore: Number(totalWeighted.toFixed(2)),
  };
}