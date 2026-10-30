import { z } from "zod";

export const aiCriterionAssessmentSchema = z.object({
  criterion_id: z.string().min(1, "criterion_id wajib diisi."),
  score: z
    .number()
    .min(0, "Skor minimal 0.")
    .max(100, "Skor maksimal 100.")
    .nullable(),
  assessment_status: z.enum(["assessable", "insufficient_evidence"]),
  evidence: z
    .array(z.string())
    .min(1, "Minimal satu bukti pengamatan visual wajib disertakan."),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  reason: z.string().min(5, "Alasan penilaian ringkas wajib diisi."),
});

export const aiStructuredAssessmentOutputSchema = z.object({
  criteria: z.array(aiCriterionAssessmentSchema).min(1),
  overall_score: z.number().min(0).max(100).optional(),
  summary: z.string().min(10, "Ringkasan evaluasi wajib diisi."),
  requires_teacher_review: z.boolean().default(true),
});

export type AICriterionResult = z.infer<typeof aiCriterionAssessmentSchema>;
export type AIStructuredAssessmentOutput = z.infer<
  typeof aiStructuredAssessmentOutputSchema
>;

export interface RubricCriterionDefinition {
  id: string;
  name: string;
  description: string;
  weight: number;
  performance_descriptors: Record<string, string>;
  assessment_guidance: string | null;
}