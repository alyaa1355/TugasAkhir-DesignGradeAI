"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Send,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { saveTeacherReviewAction } from "@/features/assessment/teacher-review-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface OfficialCriterionItem {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface AICriterionEvaluation {
  criterion_id: string;
  score: number | null;
  assessment_status: "assessable" | "insufficient_evidence";
  evidence: string[];
  strengths: string[];
  improvements: string[];
  reason: string;
}

interface ExistingTeacherCriterion {
  criterion_id: string;
  teacher_score: number;
  teacher_note: string | null;
}

interface TeacherReviewWorkspaceProps {
  submissionId: string;
  officialCriteria: OfficialCriterionItem[];
  aiCriteriaResults: AICriterionEvaluation[];
  aiCalculatedScore: number | null;
  aiSummary: string | null;
  existingReview: {
    status: string;
    final_score: number | null;
    teacher_feedback: string | null;
    revision_reason: string | null;
    revision_deadline: string | null;
    criterion_scores: ExistingTeacherCriterion[];
  } | null;
}

export function TeacherReviewWorkspace({
  submissionId,
  officialCriteria,
  aiCriteriaResults,
  aiCalculatedScore,
  aiSummary,
  existingReview,
}: TeacherReviewWorkspaceProps) {
  const router = useRouter();

  // Inisialisasi skor per kriteria dari review guru yang sudah ada, atau dari skor awal AI
  const [scores, setScores] = useState<
    Record<string, { score: number; note: string }>
  >(() => {
    const initial: Record<string, { score: number; note: string }> = {};
    for (const crit of officialCriteria) {
      const savedTeacher = existingReview?.criterion_scores?.find(
        (c) => c.criterion_id === crit.id
      );
      const aiMatch = aiCriteriaResults.find((a) => a.criterion_id === crit.id);

      initial[crit.id] = {
        score:
          savedTeacher?.teacher_score !== undefined
            ? Number(savedTeacher.teacher_score)
            : aiMatch?.score !== null && aiMatch?.score !== undefined
            ? Number(aiMatch.score)
            : 75,
        note: savedTeacher?.teacher_note ?? "",
      };
    }
    return initial;
  });

  const [teacherFeedback, setTeacherFeedback] = useState(
    existingReview?.teacher_feedback ?? aiSummary ?? ""
  );
  const [correctionReason, setCorrectionReason] = useState("");
  const [revisionReason, setRevisionReason] = useState(
    existingReview?.revision_reason ?? ""
  );
  const [revisionDeadline, setRevisionDeadline] = useState(
    existingReview?.revision_deadline
      ? existingReview.revision_deadline.slice(0, 16)
      : ""
  );

  const [showRevisionFields, setShowRevisionFields] = useState(
    existingReview?.status === "revision_requested"
  );
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Kalkulasi pratinjau nilai berbobot real-time di UI (nilai resmi tetap dihitung ulang di server)
  const liveWeightedTotal = officialCriteria.reduce((acc, crit) => {
    const val = Number(scores[crit.id]?.score ?? 0);
    const clamped = Math.max(0, Math.min(100, val));
    return acc + (clamped * Number(crit.weight)) / 100;
  }, 0);

  async function executeReviewAction(
    action:
      | "save_draft"
      | "request_revision"
      | "finalize_score"
      | "publish_result"
  ) {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsSaving(true);

    const criterionScoresPayload = officialCriteria.map((c) => ({
      criterion_id: c.id,
      score: Number(scores[c.id]?.score ?? 0),
      teacher_note: scores[c.id]?.note ?? "",
    }));

    const result = await saveTeacherReviewAction({
      submissionId,
      action,
      criterionScores: criterionScoresPayload,
      teacherFeedback,
      correctionReason,
      revisionReason: showRevisionFields ? revisionReason : undefined,
      revisionDeadline: showRevisionFields ? revisionDeadline : undefined,
    });

    setIsSaving(false);
    setConfirmPublishOpen(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    const actionLabels = {
      save_draft: "Draft review guru berhasil disimpan.",
      request_revision:
        "Permintaan revisi beserta catatan kriteria telah dikirimkan ke siswa.",
      finalize_score: `Nilai final (${result.finalScore?.toFixed(
        2
      )} / 100) berhasil ditetapkan di server.`,
      publish_result: `Nilai final (${result.finalScore?.toFixed(
        2
      )} / 100) resmi diterbitkan kepada siswa.`,
    };

    setStatusMsg(actionLabels[action]);
    setCorrectionReason("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Banner Ringkasan Nilai AI vs Nilai Koreksi Guru */}
      <div className="sticky top-2 z-20 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/95 backdrop-blur p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#63615C] block">
              ESTIMASI AWAL AI
            </span>
            <span className="font-mono text-xl font-semibold text-[#575551] tabular-nums">
              {aiCalculatedScore !== null
                ? `${Number(aiCalculatedScore).toFixed(1)} / 100`
                : "Belum Ada"}
            </span>
          </div>

          <div className="h-8 w-[1px] bg-[#E5E2DC]" />

          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] block">
              NILAI BERBOBOT GURU (SERVER-VERIFIED)
            </span>
            <span className="font-mono text-2xl font-semibold text-[#141413] tabular-nums">
              {liveWeightedTotal.toFixed(2)}
            </span>
            <span className="font-mono text-xs text-[#63615C]"> / 100</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase px-2.5 py-1 rounded-[4px] border border-[#E5E2DC] bg-white text-[#141413]">
            STATUS REVIEW: {(existingReview?.status ?? "BELUM DINILAI").toUpperCase()}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="flex items-start gap-2.5 p-3.5 rounded-[6px] bg-[#EAF2EE] border border-[#1F513F]/25 text-xs text-[#1F513F]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Editor Skor Per Kriteria Rubrik */}
      <div className="space-y-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-[#1E3A5F]">
          01 // PENILAIAN & KOREKSI SKOR PER KRITERIA RUBRIK
        </h3>

        {officialCriteria.map((crit, index) => {
          const aiItem = aiCriteriaResults.find(
            (a) => a.criterion_id === crit.id
          );
          const currentScore = scores[crit.id]?.score ?? 0;
          const weightedContribution = (
            (Math.max(0, Math.min(100, Number(currentScore))) *
              Number(crit.weight)) /
            100
          ).toFixed(2);

          return (
            <div
              key={crit.id}
              className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E2DC] pb-3">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[#1E3A5F]">
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                    <h4 className="text-sm font-semibold text-[#141413]">
                      {crit.name}
                    </h4>
                    <span className="font-mono text-xs text-[#63615C]">
                      (Bobot {crit.weight}%)
                    </span>
                  </div>
                  <p className="text-xs text-[#575551]">{crit.description}</p>
                </div>

                {/* Input Koreksi Skor Guru */}
                <div className="flex items-center gap-3 bg-[#F7F6F2] p-2.5 rounded-[6px] border border-[#E5E2DC]">
                  {aiItem && (
                    <div className="pr-2 border-r border-[#E5E2DC] text-right">
                      <span className="font-mono text-[9px] uppercase text-[#63615C] block">
                        SKOR AI
                      </span>
                      <span className="font-mono text-xs font-medium text-[#575551] tabular-nums">
                        {aiItem.score !== null ? `${aiItem.score}` : "N/A"}
                      </span>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`score-${crit.id}`}
                      className="font-mono text-[9px] uppercase text-[#1E3A5F] block"
                    >
                      SKOR GURU (0-100)
                    </Label>
                    <Input
                      id={`score-${crit.id}`}
                      type="number"
                      min={0}
                      max={100}
                      value={currentScore}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [crit.id]: {
                            ...prev[crit.id],
                            score: Number(e.target.value),
                          },
                        }))
                      }
                      className="h-8 w-24 font-mono text-xs font-semibold tabular-nums bg-white border-[#E5E2DC]"
                    />
                  </div>

                  <div className="pl-1 text-right">
                    <span className="font-mono text-[9px] uppercase text-[#63615C] block">
                      KONTRIBUSI
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#1F513F] tabular-nums">
                      +{weightedContribution}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bukti Visual & Analisis AI sebagai Referensi Guru */}
              {aiItem ? (
                <div className="p-3.5 rounded-[6px] bg-[#F7F6F2]/80 border border-[#E5E2DC] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#1E3A5F]">
                      <Sparkles className="h-3 w-3" />
                      Catatan Analisis AI
                    </span>
                    {aiItem.assessment_status === "insufficient_evidence" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#784916] bg-[#FDF6EC] px-2 py-0.5 rounded-[3px]">
                        <HelpCircle className="h-3 w-3" />
                        Bukti Visual Tidak Cukup di Screenshot
                      </span>
                    )}
                  </div>

                  <p className="text-[#141413] leading-relaxed">
                    {aiItem.reason}
                  </p>

                  {aiItem.evidence?.length > 0 && (
                    <div className="text-[11px] text-[#575551]">
                      <strong className="text-[#141413]">Bukti Teramati:</strong>{" "}
                      {aiItem.evidence.join(" • ")}
                    </div>
                  )}

                  {aiItem.improvements?.length > 0 && (
                    <div className="text-[11px] text-[#784916]">
                      <strong>Rekomendasi Perbaikan AI:</strong>{" "}
                      {aiItem.improvements.join(" • ")}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Catatan Spesifik Guru untuk Kriteria Ini */}
              <div className="space-y-1">
                <Label
                  htmlFor={`note-${crit.id}`}
                  className="text-[11px] text-[#575551]"
                >
                  Catatan Guru pada Kriteria &ldquo;{crit.name}&rdquo; (Opsional)
                </Label>
                <Input
                  id={`note-${crit.id}`}
                  value={scores[crit.id]?.note ?? ""}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [crit.id]: {
                        ...prev[crit.id],
                        note: e.target.value,
                      },
                    }))
                  }
                  placeholder="Tambahkan koreksi atau apresiasi spesifik pada kriteria ini..."
                  className="h-8 text-xs bg-[#F7F6F2]/50 border-[#E5E2DC]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback Menyeluruh Guru & Alasan Audit Koreksi */}
      <div className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4">
        <h3 className="font-mono text-xs uppercase tracking-wider text-[#1E3A5F]">
          02 // FEEDBACK PEDAGOGIS GURU & CATATAN AUDIT
        </h3>

        <div className="space-y-1.5">
          <Label htmlFor="teacher-feedback" className="text-xs font-medium">
            Umpan Balik Menyeluruh untuk Siswa (Wajib)
          </Label>
          <textarea
            id="teacher-feedback"
            rows={4}
            value={teacherFeedback}
            onChange={(e) => setTeacherFeedback(e.target.value)}
            placeholder="Berikan kesimpulan evaluasi, apresiasi kekuatan desain siswa, dan arahan pengembangan berikutnya..."
            className="w-full rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/50 p-3 text-xs text-[#141413] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="correction-reason" className="text-xs font-medium">
            Alasan Koreksi Nilai untuk Log Audit Internal (Opsional)
          </Label>
          <Input
            id="correction-reason"
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            placeholder="Contoh: Penyesuaian skor usability karena siswa menyertakan tautan prototype interaktif yang valid."
            className="bg-[#F7F6F2]/50 border-[#E5E2DC] text-xs"
          />
        </div>

        {/* Toggle & Panel Permintaan Revisi */}
        <div className="pt-2 border-t border-[#E5E2DC] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#141413]">
              Perlu Mengembalikan Tugas untuk Direvisi Siswa?
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRevisionFields((prev) => !prev)}
              className="h-8 text-xs bg-[#F7F6F2] border-[#E5E2DC]"
            >
              {showRevisionFields
                ? "Tutup Panel Revisi"
                : "Buka Panel Permintaan Revisi"}
            </Button>
          </div>

          {showRevisionFields && (
            <div className="p-4 rounded-[6px] bg-[#FBEFEF]/50 border border-[#8C2D2D]/25 space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="revision-reason"
                  className="text-xs font-semibold text-[#8C2D2D]"
                >
                  Alasan Revisi & Kriteria yang Harus Diperbaiki Siswa (Wajib
                  untuk Revisi)
                </Label>
                <textarea
                  id="revision-reason"
                  rows={3}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Sebutkan bagian spesifik yang wajib diperbaiki siswa pada pengiriman versi berikutnya..."
                  className="w-full rounded-[6px] border border-[#8C2D2D]/30 bg-white p-2.5 text-xs text-[#141413]"
                />
              </div>

              <div className="sm:w-64 space-y-1">
                <Label
                  htmlFor="revision-deadline"
                  className="text-xs text-[#8C2D2D]"
                >
                  Tenggat Waktu Revisi (Opsional)
                </Label>
                <Input
                  id="revision-deadline"
                  type="datetime-local"
                  value={revisionDeadline}
                  onChange={(e) => setRevisionDeadline(e.target.value)}
                  className="bg-white border-[#8C2D2D]/30 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Baris 4 Tombol Keputusan Guru */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => executeReviewAction("save_draft")}
            className="h-9 bg-white border-[#E5E2DC] text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5 text-[#575551]" />
            Simpan Draft Review
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => {
              if (!showRevisionFields) {
                setShowRevisionFields(true);
                return;
              }
              executeReviewAction("request_revision");
            }}
            className="h-9 bg-white border-[#8C2D2D]/30 text-[#8C2D2D] hover:bg-[#FBEFEF] text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Minta Revisi
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => executeReviewAction("finalize_score")}
            className="h-9 bg-white border-[#1E3A5F]/30 text-[#1E3A5F] hover:bg-[#EBF0F5] text-xs gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Tetapkan Nilai Final
          </Button>

          <Button
            type="button"
            disabled={isSaving}
            onClick={() => setConfirmPublishOpen(true)}
            className="h-9 bg-[#141413] hover:bg-[#1F513F] text-[#F7F6F2] text-xs px-5 gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Terbitkan Hasil ke Siswa
          </Button>
        </div>
      </div>

      {/* Dialog Konfirmasi Sebelum Nilai Final Diterbitkan */}
      <Dialog open={confirmPublishOpen} onOpenChange={setConfirmPublishOpen}>
        <DialogContent className="bg-white border-[#E5E2DC] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#141413]">
              Konfirmasi Penerbitan Nilai Final
            </DialogTitle>
            <DialogDescription className="text-xs text-[#575551] leading-relaxed pt-1">
              Anda akan menerbitkan nilai akhir sebesar{" "}
              <strong className="font-mono text-[#141413]">
                {liveWeightedTotal.toFixed(2)} / 100
              </strong>{" "}
              beserta umpan balik kriteria kepada siswa. Tindakan ini akan
              mencatat riwayat pada log audit dan mengirimkan notifikasi ke meja
              kerja siswa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmPublishOpen(false)}
              className="text-xs border-[#E5E2DC]"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => executeReviewAction("publish_result")}
              className="bg-[#1F513F] hover:bg-[#141413] text-white text-xs"
            >
              {isSaving ? "Menerbitkan..." : "Ya, Sahkan & Terbitkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}