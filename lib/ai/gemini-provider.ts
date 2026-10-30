import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "@/lib/env";
import {
  aiStructuredAssessmentOutputSchema,
  type AIStructuredAssessmentOutput,
  type RubricCriterionDefinition,
} from "@/lib/ai/schema";
import {
  EDUCATIONAL_ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentUserPrompt,
} from "@/lib/ai/prompt-builder";

export type AIProviderErrorCode =
  | "MISSING_API_KEY"
  | "QUOTA_EXHAUSTED"
  | "AI_TIMEOUT"
  | "INVALID_AI_JSON"
  | "UPSTREAM_AI_ERROR";

export class AssessmentProviderError extends Error {
  public readonly code: AIProviderErrorCode;

  constructor(code: AIProviderErrorCode, message: string) {
    super(message);
    this.name = "AssessmentProviderError";
    this.code = code;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mode simulasi khusus development/automated testing (hanya aktif jika ENABLE_AI_MOCK_MODE=true
 * dan bukan di environment production). Diberi penanda [MOCK DEVELOPMENT] secara eksplisit.
 */
function buildDevelopmentMockAssessment(
  criteria: RubricCriterionDefinition[]
): AIStructuredAssessmentOutput {
  return {
    criteria: criteria.map((c) => ({
      criterion_id: c.id,
      score: 82,
      assessment_status: "assessable" as const,
      evidence: [
        `[SIMULASI DEV] Elemen visual untuk kriteria "${c.name}" terdeteksi pada tangkapan layar.`,
      ],
      strengths: [
        `[SIMULASI DEV] Struktur dasar "${c.name}" sudah mengikuti arahan brief.`,
      ],
      improvements: [
        `[SIMULASI DEV] Tingkatkan konsistensi spasi dan penekanan kontras pada bagian "${c.name}".`,
      ],
      reason: `[SIMULASI DEV] Respons ini dihasilkan oleh mode pengembangan lokal (ENABLE_AI_MOCK_MODE=true).`,
    })),
    overall_score: 82,
    summary:
      "[MODE SIMULASI DEVELOPMENT] Ini adalah hasil pengujian lokal karena ENABLE_AI_MOCK_MODE diaktifkan. Pada produksi, evaluasi dilakukan oleh Google Gemini Vision API.",
    requires_teacher_review: true,
  };
}

export async function invokeGeminiDesignAssessment(params: {
  imageBytes: Uint8Array;
  mimeType: string;
  assignmentTitle: string;
  designType: string;
  targetPlatform: string;
  learningObjectives: string;
  designBrief: string;
  instructions?: string | null;
  studentNote?: string | null;
  figmaUrlProvided: boolean;
  criteria: RubricCriterionDefinition[];
}): Promise<{
  output: AIStructuredAssessmentOutput;
  modelUsed: string;
  isMock: boolean;
}> {
  const env = getServerEnv();
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction && env.ENABLE_AI_MOCK_MODE) {
    return {
      output: buildDevelopmentMockAssessment(params.criteria),
      modelUsed: "mock-development-only",
      isMock: true,
    };
  }

  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === "your-gemini-api-key-here") {
    throw new AssessmentProviderError(
      "MISSING_API_KEY",
      "Konfigurasi GEMINI_API_KEY belum diisi pada berkas .env.local di server."
    );
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const modelName = env.GEMINI_MODEL || "gemini-2.5-flash";
  const userPrompt = buildAssessmentUserPrompt(params);
  const base64Image = Buffer.from(params.imageBytes).toString("base64");

  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new AssessmentProviderError(
                "AI_TIMEOUT",
                "Waktu tunggu analisis AI habis (timeout 45 detik)."
              )
            ),
          45000
        )
      );

      const apiCallPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: params.mimeType,
                  data: base64Image,
                },
              },
              { text: userPrompt },
            ],
          },
        ],
        config: {
          systemInstruction: EDUCATIONAL_ASSESSMENT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      const rawText = response.text?.trim();

      if (!rawText) {
        throw new AssessmentProviderError(
          "INVALID_AI_JSON",
          "Model AI mengembalikan respons kosong."
        );
      }

      // Bersihkan pembungkus markdown ```json jika model menyertakannya
      const cleanedJsonText = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleanedJsonText);
      } catch {
        throw new AssessmentProviderError(
          "INVALID_AI_JSON",
          "Respons AI bukan merupakan format JSON yang valid."
        );
      }

      const validated = aiStructuredAssessmentOutputSchema.safeParse(parsedJson);
      if (!validated.success) {
        throw new AssessmentProviderError(
          "INVALID_AI_JSON",
          `Struktur JSON AI tidak sesuai skema rubrik: ${
            validated.error.issues[0]?.message ?? "Validasi gagal"
          }`
        );
      }

      return {
        output: validated.data,
        modelUsed: modelName,
        isMock: false,
      };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message.toLowerCase() : "";

      if (
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("resource_exhausted")
      ) {
        throw new AssessmentProviderError(
          "QUOTA_EXHAUSTED",
          "Kuota atau batas frekuensi (rate limit) Google Gemini API telah tercapai. Silakan coba beberapa saat lagi."
        );
      }

      if (err instanceof AssessmentProviderError && err.code === "MISSING_API_KEY") {
        throw err;
      }

      // Exponential backoff terbatas sebelum percobaan ke-2
      if (attempt < maxAttempts) {
        await sleep(1500 * attempt);
      }
    }
  }

  if (lastError instanceof AssessmentProviderError) {
    throw lastError;
  }

  throw new AssessmentProviderError(
    "UPSTREAM_AI_ERROR",
    lastError instanceof Error
      ? `Gagal memproses analisis AI: ${lastError.message}`
      : "Terjadi gangguan saat menghubungi layanan Google Gemini API."
  );
}