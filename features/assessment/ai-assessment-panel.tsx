"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  HelpCircle,
} from "lucide-react";
import { runSubmissionAIAssessmentAction } from "@/features/assessment/ai-assessment-actions";
import { Button } from "@/components/ui/button";

interface CriterionEvaluationItem {
  criterion_id: string;
  criterion_name?: string;
  weight?: number;
  score: number | null;
  weighted_contribution?: number | null;
  assessment_status: "assessable" | "insufficient_evidence";
  evidence: string[];
  strengths: string[];
  improvements: string[];
  reason: string;
}

interface AIAssessmentPanelProps {
  submissionId: string;
  submissionStatus: string;
  viewerRole: "student" | "teacher" | "admin";
  showScoreToStudent: boolean;
  assessment: {
    id: string;
    model_name: string;
    prompt_version: string;
    status: string;
    calculated_score: number | null;
    summary: string | null;
    error_code: string | null;
    completed_at: string | null;
    criteria_results: CriterionEvaluationItem[];
  } | null;
}

export function AIAssessmentPanel({
  submissionId,
  submissionStatus,
  viewerRole,
  showScoreToStudent,
  assessment,
}: AIAssessmentPanelProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canSeeNumericScore =
    viewerRole === "teacher" || viewerRole === "admin" || showScoreToStudent;

  const canTriggerOrRetry =
    submissionStatus !== "draft" &&
    (!assessment ||
      assessment.status === "failed" ||
      viewerRole === "teacher" ||
      viewerRole === "admin");

  async function handleRunAssessment(forceRetry: boolean) {
    setActionError(null);
    setIsRunning(true);
    const res = await runSubmissionAIAssessmentAction(submissionId, {
      forceRetry,
    });
    setIsRunning(false);

    if (res?.error) {
      setActionError(res.error);
    }
    router.refresh();
  }

  if (submissionStatus === "draft") {
    return null;
  }

  return (
    <section className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-[5px] bg-[#EBF0F5] border border-[#1E3A5F]/20 flex items-center justify-center text-[#1E3A5F]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F]">
              RUBRIC-GROUNDED AI CRITIQUE
            </p>
            <h2 className="text-sm font-semibold text-[#141413]">
              Evaluasi Awal Asisten AI (Menunggu Validasi Guru)
            </h2>
          </div>
        </div>

        {canTriggerOrRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRunning}
            onClick={() => handleRunAssessment(Boolean(assessment))}
            className="h-8 text-xs bg-[#F7F6F2] border-[#E5E2DC] gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#1E3A5F] ${
                isRunning ? "animate-spin" : ""
              }`}
            />
            {isRunning
              ? "Menganalisis Bukti Visual..."
              : assessment
              ? "Analisis Ulang AI"
              : "Jalankan Evaluasi AI"}
          </Button>
        )}
      </div>

      {actionError && (
        <div className="p-3.5 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D] space-y-1">
          <p className="font-semibold">Analisis AI Belum Berhasil:</p>
          <p>{actionError}</p>
        </div>
      )}

      {!assessment ? (
        <div className="p-6 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] text-center space-y-2">
          <p className="text-xs font-medium text-[#141413]">
            Karya telah diterima dan siap dievaluasi terhadap rubrik.
          </p>
          <p className="text-xs text-[#63615C]">
            Klik tombol &ldquo;Jalankan Evaluasi AI&rdquo; di atas untuk memulai
            pemeriksaan bukti visual.
          </p>
        </div>
      ) : assessment.status === "failed" ? (
        <div className="p-4 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D] space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Pemrosesan AI Gagal ({assessment.error_code ?? "ERROR"})
            </span>
          </div>
          <p className="leading-relaxed">
            {assessment.summary ??
              "Layanan AI mengalami kendala sementara. Karya Anda tetap tersimpan dengan aman dan dapat dinilai langsung oleh guru atau dicoba ulang."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Ringkasan & Skor Berbobot Server */}
          <div className="p-4 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#784916] bg-[#FDF6EC] border border-[#784916]/25 px-2 py-0.5 rounded-[3px]">
                  PROVISIONAL // PERLU REVIEW GURU
                </span>
                {assessment.status === "incomplete_evidence" && (
                  <span className="font-mono text-[10px] uppercase text-[#8C2D2D] bg-[#FBEFEF] px-2 py-0.5 rounded-[3px]">
                    BUKTI PARSIAL
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-[#141413] pt-1">
                {assessment.summary}
              </p>
            </div>

            {canSeeNumericScore && assessment.calculated_score !== null ? (
              <div className="shrink-0 p-3 rounded-[6px] bg-white border border-[#E5E2DC] text-right">
                <span className="font-mono text-[10px] uppercase text-[#63615C] block">
                  ESTIMASI SKOR RUBRIK
                </span>
                <span className="font-mono text-2xl font-semibold text-[#141413] tabular-nums">
                  {Number(assessment.calculated_score).toFixed(1)}
                </span>
                <span className="font-mono text-xs text-[#63615C]"> / 100</span>
              </div>
            ) : (
              <div className="shrink-0 p-3 rounded-[6px] bg-white border border-[#E5E2DC] text-xs text-[#575551] flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#1E3A5F]" />
                <span>Skor numerik menunggu pengesahan guru</span>
              </div>
            )}
          </div>

          {/* Rincian Evaluasi Per Kriteria Rubrik */}
          <div className="space-y-3">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#575551]">
              RINCIAN ANALISIS PER KRITERIA RUBRIK
            </h3>

            {assessment.criteria_results.map((item) => (
              <div
                key={item.criterion_id}
                className="p-4 rounded-[6px] border border-[#E5E2DC] bg-white space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#141413]">
                      {item.criterion_name ?? "Kriteria Rubrik"}
                    </span>
                    {item.weight !== undefined && (
                      <span className="font-mono text-[11px] text-[#63615C]">
                        (Bobot {item.weight}%)
                      </span>
                    )}
                  </div>

                  {item.assessment_status === "insufficient_evidence" ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#784916] bg-[#FDF6EC] px-2 py-0.5 rounded-[3px]">
                      <HelpCircle className="h-3 w-3" />
                      Butuh Bukti Tambahan
                    </span>
                  ) : canSeeNumericScore && item.score !== null ? (
                    <span className="font-mono font-semibold text-[#1E3A5F] bg-[#EBF0F5] px-2.5 py-0.5 rounded-[3px] tabular-nums">
                      Skor: {item.score} / 100
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-[#1F513F] bg-[#EAF2EE] px-2 py-0.5 rounded-[3px]">
                      Teranalisis
                    </span>
                  )}
                </div>

                <p className="text-[#575551] leading-relaxed">{item.reason}</p>

                {item.evidence?.length > 0 && (
                  <div className="p-2.5 rounded-[5px] bg-[#F7F6F2] border border-[#E5E2DC]/80 space-y-1">
                    <p className="font-mono text-[10px] uppercase text-[#575551]">
                      Bukti Visual yang Diamati:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[#141413]">
                      {item.evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  {item.strengths?.length > 0 && (
                    <div className="p-2.5 rounded-[5px] bg-[#EAF2EE]/60 border border-[#1F513F]/20 space-y-1">
                      <p className="font-mono text-[10px] uppercase text-[#1F513F] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Kekuatan Desain
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[#141413]">
                        {item.strengths.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {item.improvements?.length > 0 && (
                    <div className="p-2.5 rounded-[5px] bg-[#FDF6EC]/80 border border-[#784916]/20 space-y-1">
                      <p className="font-mono text-[10px] uppercase text-[#784916]">
                        Saran Perbaikan Konkret
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 text-[#141413]">
                        {item.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}