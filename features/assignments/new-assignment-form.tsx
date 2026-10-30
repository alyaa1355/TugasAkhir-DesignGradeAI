"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createAssignmentAction } from "@/features/assignments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewAssignmentFormProps {
  classes: { id: string; name: string }[];
  rubricVersions: { id: string; version_number: number; title: string }[];
}

export function NewAssignmentForm({
  classes,
  rubricVersions,
}: NewAssignmentFormProps) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [rubricVersionId, setRubricVersionId] = useState(
    rubricVersions[0]?.id ?? ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [designBrief, setDesignBrief] = useState("");
  const [instructions, setInstructions] = useState("");
  const [designType, setDesignType] = useState<
    "mobile_app_ui" | "web_dashboard_ui" | "wireframe"
  >("mobile_app_ui");
  const [targetPlatform, setTargetPlatform] = useState("Mobile (iOS / Android)");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sinkronkan state apabila daftar kelas atau rubrik baru saja dimuat ulang
  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  useEffect(() => {
    if (!rubricVersionId && rubricVersions.length > 0) {
      setRubricVersionId(rubricVersions[0].id);
    }
  }, [rubricVersions, rubricVersionId]);

  const activeClassId = classId || classes[0]?.id || "";
  const activeRubricVersionId = rubricVersionId || rubricVersions[0]?.id || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await createAssignmentAction({
      classId: activeClassId,
      rubricVersionId: activeRubricVersionId,
      title,
      description,
      learningObjectives,
      designBrief,
      instructions,
      designType,
      targetPlatform,
      allowedSubmissionTypes: ["image", "figma"],
      maxAttempts: 3,
      deadline,
      lateSubmissionPolicy: "allow_with_flag",
      showAiScoreBeforeReview: false,
      allowRevision: true,
      publishImmediately: true,
    });

    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }

    router.push(`/teacher/assignments/${res.assignmentId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 p-6 rounded-[8px] border border-[#E5E2DC] bg-white"
    >
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-3 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Kelas Tujuan</Label>
          <select
            value={activeClassId}
            onChange={(e) => setClassId(e.target.value)}
            required
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/60 px-3 text-xs"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Snapshot Rubrik Penilaian</Label>
          <select
            value={activeRubricVersionId}
            onChange={(e) => setRubricVersionId(e.target.value)}
            required
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/60 px-3 text-xs"
          >
            {rubricVersions.map((rv) => (
              <option key={rv.id} value={rv.id}>
                {rv.title} (v{rv.version_number})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Judul Tugas Desain</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Eksplorasi Antarmuka Aplikasi Reservasi Klinik"
          required
          className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Jenis Tugas</Label>
          <select
            value={designType}
            onChange={(e) =>
              setDesignType(
                e.target.value as
                  | "mobile_app_ui"
                  | "web_dashboard_ui"
                  | "wireframe"
              )
            }
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/60 px-3 text-xs"
          >
            <option value="mobile_app_ui">Mobile App UI</option>
            <option value="web_dashboard_ui">Web Dashboard UI</option>
            <option value="wireframe">Wireframe</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Platform Target</Label>
          <Input
            value={targetPlatform}
            onChange={(e) => setTargetPlatform(e.target.value)}
            required
            className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tenggat Waktu (Deadline)</Label>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Deskripsi Singkat</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ringkasan konteks tugas..."
          required
          className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Tujuan Pembelajaran (Capaian Kompetensi)
        </Label>
        <textarea
          rows={2}
          value={learningObjectives}
          onChange={(e) => setLearningObjectives(e.target.value)}
          placeholder="Siswa mampu menerapkan hierarki visual, keterbacaan tipografi, dan kejelasan CTA..."
          required
          className="w-full rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/60 p-3 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Brief Desain & Kebutuhan Layar</Label>
        <textarea
          rows={4}
          value={designBrief}
          onChange={(e) => setDesignBrief(e.target.value)}
          placeholder="Rincikan skenario pengguna, komponen wajib yang harus ada pada layar, serta batasan desain..."
          required
          className="w-full rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/60 p-3 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          Instruksi Teknis Pengumpulan (Opsional)
        </Label>
        <Input
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ekspor frame dengan resolusi 2x dalam format PNG..."
          className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          disabled={
            saving || classes.length === 0 || rubricVersions.length === 0
          }
          className="bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs px-6"
        >
          {saving
            ? "Menerbitkan Brief..."
            : "Terbitkan Penugasan & Kunci Rubrik"}
        </Button>
      </div>
    </form>
  );
}