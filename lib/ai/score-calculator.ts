import type {
  AICriterionResult,
  RubricCriterionDefinition,
} from "@/lib/ai/schema";

export interface ServerScoreCalculationResult {
  normalizedCriteria: Array<
    AICriterionResult & {
      criterion_name: string;
      weight: number;
      weighted_contribution: number | null;
    }
  >;
  calculatedScore: number | null;
  hasInsufficientEvidence: boolean;
  assessableWeightTotal: number;
}

/**
 * Menghitung skor berbobot di sisi server berdasarkan ID dan bobot rubrik resmi.
 * Jika ada kriteria yang berstatus 'insufficient_evidence', ditandai secara eksplisit.
 */
export function calculateServerWeightedScore(
  officialCriteria: RubricCriterionDefinition[],
  aiCriteriaResults: AICriterionResult[]
): ServerScoreCalculationResult {
  const resultMap = new Map<string, AICriterionResult>();
  for (const item of aiCriteriaResults) {
    resultMap.set(item.criterion_id, item);
  }

  let weightedSum = 0;
  let assessableWeightTotal = 0;
  let hasInsufficientEvidence = false;

  const normalizedCriteria = officialCriteria.map((official) => {
    const matched = resultMap.get(official.id);

    if (
      !matched ||
      matched.assessment_status === "insufficient_evidence" ||
      matched.score === null
    ) {
      hasInsufficientEvidence = true;
      return {
        criterion_id: official.id,
        criterion_name: official.name,
        weight: Number(official.weight),
        score: null,
        weighted_contribution: null,
        assessment_status: "insufficient_evidence" as const,
        evidence: matched?.evidence?.length
          ? matched.evidence
          : [
              "Bukti visual pada tangkapan layar belum mencukupi untuk menilai kriteria ini secara langsung.",
            ],
        strengths: matched?.strengths ?? [],
        improvements: matched?.improvements ?? [
          "Sertakan artefak atau tangkapan layar pendukung tambahan untuk verifikasi guru.",
        ],
        reason:
          matched?.reason ??
          "Kriteria memerlukan pemeriksaan manual oleh guru karena bukti tidak terlihat penuh pada gambar statis.",
      };
    }

    const clampedScore = Math.max(0, Math.min(100, Number(matched.score)));
    const weight = Number(official.weight);
    const contribution = (clampedScore * weight) / 100;

    weightedSum += contribution;
    assessableWeightTotal += weight;

    return {
      criterion_id: official.id,
      criterion_name: official.name,
      weight,
      score: Number(clampedScore.toFixed(2)),
      weighted_contribution: Number(contribution.toFixed(2)),
      assessment_status: "assessable" as const,
      evidence: matched.evidence,
      strengths: matched.strengths,
      improvements: matched.improvements,
      reason: matched.reason,
    };
  });

  const calculatedScore =
    assessableWeightTotal > 0
      ? Number(weightedSum.toFixed(2))
      : null;

  return {
    normalizedCriteria,
    calculatedScore,
    hasInsufficientEvidence,
    assessableWeightTotal: Number(assessableWeightTotal.toFixed(2)),
  };
}