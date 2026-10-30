"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import {
  DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE,
  type CreateRubricInput,
} from "@/lib/validation/rubric";
import { createRubricWithSnapshotAction } from "@/features/assessment/rubric-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RubricBuilderForm() {
  const router = useRouter();
  const [title, setTitle] = useState(DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.title);
  const [description, setDescription] = useState(
    DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.description ?? ""
  );
  const [criteria, setCriteria] = useState(
    DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.criteria
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalWeight = criteria.reduce(
    (sum, item) => sum + (Number(item.weight) || 0),
    0
  );
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  function addCriterion() {
    setCriteria((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        weight: 10,
        performance_descriptors: {
          excellent: "Memenuhi seluruh indikator kriteria dengan sangat baik.",
          good: "Memenuhi indikator utama dengan sedikit catatan minor.",
          fair: "Cukup memenuhi kriteria namun masih perlu perbaikan.",
          needs_improvement: "Belum memenuhi indikator dasar kriteria.",
        },
        assessment_guidance: "",
      },
    ]);
  }

  function removeCriterion(index: number) {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!isWeightValid) {
      setErrorMsg(
        `Total bobot saat ini ${totalWeight}%. Total bobot seluruh kriteria wajib tepat 100%.`
      );
      return;
    }

    setIsSaving(true);
    const result = await createRubricWithSnapshotAction({
      title,
      description,
      criteria,
    });
    setIsSaving(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    router.push("/teacher/rubrics");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Bar Инformasi Bobot Real-time */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-[#575551]">
            AKUMULASI BOBOT RUBRIK:
          </span>
          <span
            className={`font-mono text-sm font-semibold tabular-nums px-2 py-0.5 rounded-[4px] border ${
              isWeightValid
                ? "bg-[#EAF2EE] text-[#1F513F] border-[#1F513F]/25"
                : "bg-[#FBEFEF] text-[#8C2D2D] border-[#8C2D2D]/25"
            }`}
          >
            {totalWeight.toFixed(0)}% / 100%
          </span>
          {isWeightValid ? (
            <span className="inline-flex items-center gap-1 text-xs text-[#1F513F]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Siap dikunci sebagai
              Snapshot v1
            </span>
          ) : (
            <span className="text-xs text-[#8C2D2D]">
              Sesuaikan bobot agar berjumlah tepat 100%
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setTitle(DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.title);
            setDescription(DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.description ?? "");
            setCriteria(DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE.criteria);
          }}
          className="h-8 text-xs bg-white border-[#E5E2DC] gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#1E3A5F]" />
          Reset ke Template Mobile UI/UX
        </Button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-3.5 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Informasi Dasar Rubrik */}
      <div className="grid gap-4 p-5 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/50">
        <div className="space-y-1.5">
          <Label htmlFor="rubric-title" className="text-xs font-medium">
            Judul Standar Rubrik
          </Label>
          <Input
            id="rubric-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-white border-[#E5E2DC] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rubric-desc" className="text-xs font-medium">
            Deskripsi Penggunaan Rubrik
          </Label>
          <Input
            id="rubric-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-white border-[#E5E2DC] text-xs"
          />
        </div>
      </div>

      {/* Daftar Kriteria */}
      <div className="space-y-4">
        {criteria.map((criterion, index) => (
          <div
            key={index}
            className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
              <span className="font-mono text-xs font-medium text-[#1E3A5F]">
                KRITERIA #{String(index + 1).padStart(2, "0")}
              </span>
              {criteria.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCriterion(index)}
                  className="h-7 text-xs text-[#8C2D2D] hover:bg-[#FBEFEF]"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Hapus
                </Button>
              )}
            </div>

            <div className="grid sm:grid-cols-12 gap-4">
              <div className="sm:col-span-9 space-y-1.5">
                <Label className="text-xs">Nama Kriteria</Label>
                <Input
                  value={criterion.name}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[index] = { ...next[index], name: e.target.value };
                    setCriteria(next);
                  }}
                  placeholder="Contoh: Hierarki Visual & Layout"
                  required
                  className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-xs">Bobot (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={criterion.weight}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[index] = {
                      ...next[index],
                      weight: Number(e.target.value),
                    };
                    setCriteria(next);
                  }}
                  required
                  className="font-mono tabular-nums bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi Kriteria</Label>
              <Input
                value={criterion.description}
                onChange={(e) => {
                  const next = [...criteria];
                  next[index] = { ...next[index], description: e.target.value };
                  setCriteria(next);
                }}
                required
                className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Bukti Visual yang Perlu Diperhatikan & Instruksi Khusus AI
              </Label>
              <Input
                value={criterion.assessment_guidance}
                onChange={(e) => {
                  const next = [...criteria];
                  next[index] = {
                    ...next[index],
                    assessment_guidance: e.target.value,
                  };
                  setCriteria(next);
                }}
                placeholder="Instruksikan elemen visual spesifik yang harus diamati pada gambar..."
                required
                className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
              />
            </div>

            {/* Deskriptor Performa 4 Level */}
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="font-mono text-[10px] uppercase text-[#1F513F]">
                  Level Sangat Baik (85–100)
                </Label>
                <Input
                  value={criterion.performance_descriptors.excellent}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[index] = {
                      ...next[index],
                      performance_descriptors: {
                        ...next[index].performance_descriptors,
                        excellent: e.target.value,
                      },
                    };
                    setCriteria(next);
                  }}
                  className="mt-1 bg-[#F7F6F2]/40 border-[#E5E2DC] text-xs"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase text-[#1E3A5F]">
                  Level Baik (70–84)
                </Label>
                <Input
                  value={criterion.performance_descriptors.good}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[index] = {
                      ...next[index],
                      performance_descriptors: {
                        ...next[index].performance_descriptors,
                        good: e.target.value,
                      },
                    };
                    setCriteria(next);
                  }}
                  className="mt-1 bg-[#F7F6F2]/40 border-[#E5E2DC] text-xs"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase text-[#784916]">
                  Level Cukup (55–69)
                </Label>
                <Input
                  value={criterion.performance_descriptors.fair}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[index] = {
                      ...next[index],
                      performance_descriptors: {
                        ...next[index].performance_descriptors,
                        fair: e.target.value,
                      },
                    };
                    setCriteria(next);
                  }}
                  className="mt-1 bg-[#F7F6F2]/40 border-[#E5E2DC] text-xs"
                />
              </div>
              <div>
                <Label className="font-mono text-[10px] uppercase text-[#8C2D2D]">
                  Perlu Perbaikan (&lt;55)
                </Label>
                <Input
                  value={criterion.performance_descriptors.needs_improvement}
                  onChange={(e) => {
                    const next = [...criteria];
                    next[index] = {
                      ...next[index],
                      performance_descriptors: {
                        ...next[index].performance_descriptors,
                        needs_improvement: e.target.value,
                      },
                    };
                    setCriteria(next);
                  }}
                  className="mt-1 bg-[#F7F6F2]/40 border-[#E5E2DC] text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={addCriterion}
          className="bg-white border-[#E5E2DC] text-xs gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Kriteria Penilaian
        </Button>

        <Button
          type="submit"
          disabled={isSaving || !isWeightValid}
          className="bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs px-6"
        >
          {isSaving
            ? "Menyimpan Snapshot Rubrik..."
            : "Simpan & Kunci Snapshot Rubrik"}
        </Button>
      </div>
    </form>
  );
}