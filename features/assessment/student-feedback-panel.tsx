import {
  CheckCircle2,
  AlertTriangle,
  Award,
  MessageSquareQuote,
  ArrowUpRight,
} from "lucide-react";
import type { EnrichedTeacherCriterionScore } from "@/lib/validation/review";

interface StudentFeedbackPanelProps {
  review: {
    status: string;
    final_score: number | null;
    teacher_feedback: string | null;
    revision_reason: string | null;
    revision_deadline: string | null;
    published_at: string | null;
    criterion_scores: EnrichedTeacherCriterionScore[];
  } | null;
}

export function StudentFeedbackPanel({ review }: StudentFeedbackPanelProps) {
  if (
    !review ||
    (review.status !== "published" && review.status !== "revision_requested")
  ) {
    return null;
  }

  const criteria = Array.isArray(review.criterion_scores)
    ? review.criterion_scores
    : [];

  const metCriteria = criteria.filter((c) => Number(c.teacher_score) >= 75);
  const needsImprovementCriteria = criteria.filter(
    (c) => Number(c.teacher_score) < 75
  );

  return (
    <section className="p-6 rounded-[8px] border border-[#E5E2DC] bg-white space-y-6">
      {/* Jika Guru Meminta Revisi */}
      {review.status === "revision_requested" && (
        <div className="p-4 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/30 space-y-2 text-xs text-[#8C2D2D]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase">
              <AlertTriangle className="h-4 w-4" />
              PERMINTAAN REVISI DARI GURU
            </span>
            {review.revision_deadline && (
              <span className="font-mono text-[11px]">
                Tenggat Revisi:{" "}
                {new Date(review.revision_deadline).toLocaleString("id-ID")}
              </span>
            )}
          </div>
          <p className="text-[#141413] font-medium leading-relaxed whitespace-pre-line">
            {review.revision_reason}
          </p>
        </div>
      )}

      {/* Header Nilai Final yang Diterbitkan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#1F513F] bg-[#EAF2EE] px-2.5 py-0.5 rounded-[3px]">
            <Award className="h-3.5 w-3.5" />
            <span>HASIL EVALUASI RESMI PENGAJAR</span>
          </div>
          <h2 className="text-base font-semibold text-[#141413] pt-1">
            Rapor Kriteria & Umpan Balik Desain
          </h2>
          {review.published_at && (
            <p className="font-mono text-[11px] text-[#63615C]">
              Disahkan pada:{" "}
              {new Date(review.published_at).toLocaleString("id-ID")}
            </p>
          )}
        </div>

        {review.status === "published" && review.final_score !== null && (
          <div className="p-4 rounded-[8px] bg-[#EAF2EE]/70 border border-[#1F513F]/25 text-right shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1F513F] block">
              NILAI AKHIR FINAL
            </span>
            <span className="font-mono text-3xl font-semibold text-[#1F513F] tabular-nums">
              {Number(review.final_score).toFixed(1)}
            </span>
            <span className="font-mono text-xs text-[#1F513F]"> / 100</span>
          </div>
        )}
      </div>

      {/* Catatan Feedback Guru */}
      {review.teacher_feedback && (
        <div className="p-4 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] space-y-1.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#1E3A5F]">
            <MessageSquareQuote className="h-3.5 w-3.5" />
            <span>CATATAN EVALUASI GURU</span>
          </div>
          <p className="text-xs leading-relaxed text-[#141413] whitespace-pre-line">
            {review.teacher_feedback}
          </p>
        </div>
      )}

      {/* Ringkasan Kriteria Terpenuhi vs Area Perbaikan */}
      {criteria.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-[6px] bg-[#EAF2EE]/50 border border-[#1F513F]/20 space-y-1.5">
            <p className="font-mono text-[10px] uppercase text-[#1F513F] flex items-center gap-1 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Kriteria Sudah Terpenuhi Baik ({metCriteria.length})
            </p>
            {metCriteria.length === 0 ? (
              <p className="text-[11px] text-[#575551]">
                Tingkatkan eksplorasi pada iterasi berikutnya.
              </p>
            ) : (
              <ul className="space-y-1 text-[#141413]">
                {metCriteria.map((c) => (
                  <li key={c.criterion_id} className="flex justify-between">
                    <span>• {c.criterion_name}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {c.teacher_score}/100
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-3.5 rounded-[6px] bg-[#FDF6EC]/70 border border-[#784916]/20 space-y-1.5">
            <p className="font-mono text-[10px] uppercase text-[#784916] flex items-center gap-1 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Area yang Perlu Ditingkatkan ({needsImprovementCriteria.length})
            </p>
            {needsImprovementCriteria.length === 0 ? (
              <p className="text-[11px] text-[#575551]">
                Seluruh kriteria utama telah melampaui ambang batas ketuntasan.
              </p>
            ) : (
              <ul className="space-y-1 text-[#141413]">
                {needsImprovementCriteria.map((c) => (
                  <li key={c.criterion_id} className="flex justify-between">
                    <span>• {c.criterion_name}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {c.teacher_score}/100
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Visualisasi Pencapaian Per Kriteria */}
      {criteria.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#575551]">
            VISUALISASI CAPAIAN PER KRITERIA RUBRIK
          </h3>
          <div className="space-y-2.5">
            {criteria.map((c) => {
              const pct = Math.max(0, Math.min(100, Number(c.teacher_score)));
              return (
                <div
                  key={c.criterion_id}
                  className="p-3.5 rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#141413]">
                        {c.criterion_name}
                      </span>
                      <span className="font-mono text-[11px] text-[#63615C] ml-2">
                        (Bobot {c.weight}%)
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-[#141413] tabular-nums">
                      {c.teacher_score} / 100
                    </span>
                  </div>

                  {/* Progress Bar Pencapaian Kriteria */}
                  <div className="h-2 w-full rounded-full bg-[#EFECE6] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 75
                          ? "bg-[#1F513F]"
                          : pct >= 55
                          ? "bg-[#784916]"
                          : "bg-[#8C2D2D]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {c.teacher_note && (
                    <p className="text-[11px] text-[#575551] pt-0.5">
                      <strong className="text-[#141413]">Catatan Guru:</strong>{" "}
                      {c.teacher_note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}