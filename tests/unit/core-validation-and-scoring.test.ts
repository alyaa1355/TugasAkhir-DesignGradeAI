import { describe, it, expect } from "vitest";
import { calculateServerWeightedScore } from "@/lib/ai/score-calculator";
import { aiStructuredAssessmentOutputSchema } from "@/lib/ai/schema";
import {
  createRubricSchema,
  DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE,
} from "@/lib/validation/rubric";
import { calculateTeacherFinalWeightedScore } from "@/lib/validation/review";
import { resolveStudentWorkState } from "@/components/shared/status-badge";

describe("1. Perhitungan Skor Berbobot Server (AI & Guru)", () => {
  const sampleCriteria = [
    {
      id: "crit-1",
      name: "Hierarki Visual",
      description: "Layout dan fokus",
      weight: 60,
      performance_descriptors: {},
      assessment_guidance: null,
    },
    {
      id: "crit-2",
      name: "Tipografi",
      description: "Keterbacaan teks",
      weight: 40,
      performance_descriptors: {},
      assessment_guidance: null,
    },
  ];

  it("menghitung nilai akhir berbobot secara akurat di server (bukan dari klaim total model)", () => {
    const aiResults = [
      {
        criterion_id: "crit-1",
        score: 80, // 80 * 60% = 48
        assessment_status: "assessable" as const,
        evidence: ["Heading utama tampak kontras."],
        strengths: ["Fokus jelas."],
        improvements: ["Rapikan padding."],
        reason: "Hierarki sudah baik.",
      },
      {
        criterion_id: "crit-2",
        score: 90, // 90 * 40% = 36
        assessment_status: "assessable" as const,
        evidence: ["Ukuran body text proporsional."],
        strengths: ["Mudah dibaca."],
        improvements: [],
        reason: "Tipografi sangat baik.",
      },
    ];

    const res = calculateServerWeightedScore(sampleCriteria, aiResults);
    expect(res.calculatedScore).toBe(84); // 48 + 36 = 84.00
    expect(res.hasInsufficientEvidence).toBe(false);
    expect(res.assessableWeightTotal).toBe(100);
  });

  it("menandai hasInsufficientEvidence = true dan tidak memberi skor 0 palsu jika bukti visual kurang", () => {
    const aiResults = [
      {
        criterion_id: "crit-1",
        score: 80,
        assessment_status: "assessable" as const,
        evidence: ["Layout terlihat rapi."],
        strengths: [],
        improvements: [],
        reason: "Cukup baik.",
      },
      {
        criterion_id: "crit-2",
        score: null,
        assessment_status: "insufficient_evidence" as const,
        evidence: ["Teks terpotong pada screenshot."],
        strengths: [],
        improvements: ["Unggah resolusi penuh."],
        reason: "Tidak dapat dinilai dari tangkapan layar.",
      },
    ];

    const res = calculateServerWeightedScore(sampleCriteria, aiResults);
    expect(res.hasInsufficientEvidence).toBe(true);
    expect(res.normalizedCriteria[1].score).toBeNull();
  });

  it("menghitung ulang nilai akhir ketika guru mengoreksi skor per kriteria", () => {
    const teacherInputs = [
      { criterion_id: "crit-1", score: 85, teacher_note: "Bagus" }, // 85 * 0.6 = 51
      { criterion_id: "crit-2", score: 75, teacher_note: "Cukup" }, // 75 * 0.4 = 30
    ];

    const res = calculateTeacherFinalWeightedScore(
      sampleCriteria,
      teacherInputs,
      []
    );
    expect(res.finalWeightedScore).toBe(81);
  });
});

describe("2. Validasi Rubrik & Bobot 100%", () => {
  it("menerima template rubrik default yang total bobotnya tepat 100%", () => {
    const parsed = createRubricSchema.safeParse(
      DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE
    );
    expect(parsed.success).toBe(true);
  });

  it("menolak rubrik yang total bobotnya tidak berjumlah 100%", () => {
    const invalidRubric = {
      ...DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE,
      criteria: [
        {
          ...DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.criteria[0],
          weight: 45,
        },
      ],
    };
    const parsed = createRubricSchema.safeParse(invalidRubric);
    expect(parsed.success).toBe(false);
  });
});

describe("3. Validasi Skema Output AI & Status Submission", () => {
  it("memvalidasi struktur JSON output AI sesuai kontrak schema", () => {
    const sampleOutput = {
      criteria: [
        {
          criterion_id: "crit-1",
          score: 85,
          assessment_status: "assessable",
          evidence: ["Kontras tombol utama jelas."],
          strengths: ["Hierarki visual rapi."],
          improvements: ["Tambahkan jarak antar-seksi."],
          reason: "Memenuhi sebagian besar indikator rubrik.",
        },
      ],
      overall_score: 85,
      summary: "Desain komunikatif dan terstruktur.",
      requires_teacher_review: true,
    };

    const parsed = aiStructuredAssessmentOutputSchema.safeParse(sampleOutput);
    expect(parsed.success).toBe(true);
  });

  it("memisahkan status tugas (closed) dengan status submission yang sedang menunggu review", () => {
    // Tugas sudah closed namun siswa sudah mengumpulkan dan menunggu review guru
    const state = resolveStudentWorkState("closed", "awaiting_teacher_review");
    expect(state).toBe("awaiting_teacher_review");
  });
});