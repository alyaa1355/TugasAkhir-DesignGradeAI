"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Image as ImageIcon,
  Link2,
  X,
  ZoomIn,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
  ExternalLink,
} from "lucide-react";
import { submitDesignWorkAction } from "@/features/submissions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExistingAssetPreview {
  id: string;
  assetType: string;
  signedUrl: string | null;
  figmaUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
}

interface SubmissionWorkspaceProps {
  assignmentId: string;
  allowedModes: string[];
  canSubmitOrUpdate: boolean;
  nextVersionNumber: number;
  existingNote?: string | null;
  existingAssets?: ExistingAssetPreview[];
}

export function SubmissionWorkspace({
  assignmentId,
  allowedModes,
  canSubmitOrUpdate,
  nextVersionNumber,
  existingNote,
  existingAssets = [],
}: SubmissionWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supportsImage = allowedModes.includes("image");
  const supportsFigma = allowedModes.includes("figma");

  const [mode, setMode] = useState<"image" | "figma">(
    supportsImage ? "image" : "figma"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [figmaUrl, setFigmaUrl] = useState(
    existingAssets.find((a) => a.figmaUrl)?.figmaUrl ?? ""
  );
  const [figmaArtifactType, setFigmaArtifactType] = useState<
    "design_file" | "interactive_prototype" | "wireframe_board"
  >("design_file");
  const [submissionNote, setSubmissionNote] = useState(existingNote ?? "");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileSelect(file: File | undefined) {
    if (!file) return;
    setErrorMsg(null);

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorMsg("Format berkas harus berupa PNG, JPG/JPEG, atau WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Ukuran gambar maksimal adalah 10 MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
  }

  function clearSelectedFile() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmission(intent: "save_draft" | "submit_final") {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("assignmentId", assignmentId);
    formData.set("submissionMode", mode);
    formData.set("intent", intent);
    formData.set("submissionNote", submissionNote);

    if (mode === "figma") {
      formData.set("figmaUrl", figmaUrl);
      formData.set("figmaArtifactType", figmaArtifactType);
    }

    if (selectedFile) {
      formData.set("designImage", selectedFile);
    }

    const result = await submitDesignWorkAction(formData);
    setIsSubmitting(false);

    if (result?.error) {
      setErrorMsg(result.error);
      return;
    }

    setSuccessMsg(
      intent === "submit_final"
        ? `Karya Versi v${result.versionNumber} berhasil dikirim dan tercatat di studio.`
        : `Draft Versi v${result.versionNumber} berhasil disimpan.`
    );
    clearSelectedFile();
    router.refresh();
  }

  const latestSignedImage = existingAssets.find((a) => a.signedUrl)?.signedUrl;
  const latestFigmaLink = existingAssets.find((a) => a.figmaUrl)?.figmaUrl;

  return (
    <div className="space-y-6">
      {/* Panel Artefak yang Sudah Terkirim (Jika Ada) */}
      {existingAssets.length > 0 && (
        <div className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F]">
                ARTEFAK TERKIRIM TERAKHIR
              </p>
              <p className="text-xs font-semibold text-[#141413] mt-0.5">
                Pratinjau Karya Desain Anda
              </p>
            </div>

            {latestSignedImage && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-[#F7F6F2] border-[#E5E2DC] gap-1.5"
                    />
                  }
                >
                  <ZoomIn className="h-3.5 w-3.5 text-[#1E3A5F]" />
                  Perbesar Kanvas
                </DialogTrigger>
                <DialogContent className="max-w-4xl bg-[#F7F6F2] border-[#E5E2DC] p-4">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">
                      Inspeksi Resolusi Penuh
                    </DialogTitle>
                  </DialogHeader>
                  <div className="overflow-auto max-h-[80vh] rounded-[6px] border border-[#E5E2DC] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={latestSignedImage}
                      alt="Karya desain yang dikumpulkan siswa"
                      className="w-full h-auto object-contain rounded"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {latestSignedImage && (
            <div className="rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2] p-3 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={latestSignedImage}
                alt="Pratinjau submission desain siswa"
                className="max-h-[380px] w-full object-contain mx-auto rounded"
              />
            </div>
          )}

          {latestFigmaLink && (
            <div className="flex items-center justify-between p-3 rounded-[6px] bg-[#EBF0F5]/60 border border-[#1E3A5F]/20 text-xs">
              <span className="font-mono text-[11px] text-[#1E3A5F] truncate pr-3">
                {latestFigmaLink}
              </span>
              <a
                href={latestFigmaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 font-medium text-[#1E3A5F] hover:underline"
              >
                <span>Buka Figma</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Formulir Pengumpulan / Pembaruan Versi */}
      {canSubmitOrUpdate && (
        <div className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] pb-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F]">
                MEJA PENGUMPULAN KARYA // VERSI v{nextVersionNumber}
              </span>
              <h3 className="text-sm font-semibold text-[#141413] mt-0.5">
                Unggah Eksplorasi Desain atau Frame Figma
              </h3>
            </div>

            {supportsImage && supportsFigma && (
              <div className="inline-flex rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2] p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("image")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${
                    mode === "image"
                      ? "bg-white text-[#141413] shadow-sm"
                      : "text-[#575551] hover:text-[#141413]"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Gambar Desain</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("figma")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${
                    mode === "figma"
                      ? "bg-white text-[#141413] shadow-sm"
                      : "text-[#575551] hover:text-[#141413]"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Tautan Figma + Bukti</span>
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3 rounded-[6px] bg-[#EAF2EE] border border-[#1F513F]/25 text-xs text-[#1F513F]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Field Khusus Mode Figma */}
          {mode === "figma" && (
            <div className="grid sm:grid-cols-12 gap-4 p-4 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC]">
              <div className="sm:col-span-8 space-y-1.5">
                <Label htmlFor="figma-url" className="text-xs font-medium">
                  URL File / Prototype Figma
                </Label>
                <Input
                  id="figma-url"
                  type="url"
                  placeholder="https://www.figma.com/design/..."
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  className="bg-white border-[#E5E2DC] text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="figma-type" className="text-xs font-medium">
                  Jenis Artefak
                </Label>
                <select
                  id="figma-type"
                  value={figmaArtifactType}
                  onChange={(e) =>
                    setFigmaArtifactType(
                      e.target.value as
                        | "design_file"
                        | "interactive_prototype"
                        | "wireframe_board"
                    )
                  }
                  className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-white px-3 text-xs text-[#141413]"
                >
                  <option value="design_file">Design Frame / Mockup</option>
                  <option value="interactive_prototype">
                    Interactive Prototype
                  </option>
                  <option value="wireframe_board">Wireframe / UX Flow</option>
                </select>
              </div>

              <p className="sm:col-span-12 text-[11px] text-[#575551]">
                Catatan: Sertakan juga ekspor PNG/JPG dari frame utama di bawah
                ini agar asisten AI dapat mengevaluasi bukti visual secara
                akurat.
              </p>
            </div>
          )}

          {/* Area Drag & Drop Gambar */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {mode === "figma"
                ? "Tangkapan Layar / Ekspor Frame Utama (Wajib)"
                : "Berkas Gambar Desain (PNG, JPG, WebP — Maks. 10 MB)"}
            </Label>

            {!localPreviewUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelect(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-[8px] border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging
                    ? "border-[#1E3A5F] bg-[#EBF0F5]/50"
                    : "border-[#E5E2DC] bg-[#F7F6F2]/60 hover:bg-[#EFECE6]/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                />
                <UploadCloud className="h-7 w-7 text-[#1E3A5F] mx-auto mb-2.5" />
                <p className="text-xs font-medium text-[#141413]">
                  Tarik dan lepaskan berkas desain di sini, atau klik untuk
                  memilih file
                </p>
                <p className="font-mono text-[11px] text-[#63615C] mt-1">
                  Mendukung PNG, JPG, WebP resolusi tinggi • Penyimpanan Privat
                  Terenkripsi
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="truncate pr-3">
                    <p className="text-xs font-medium text-[#141413] truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="font-mono text-[10px] text-[#63615C]">
                      {((selectedFile?.size ?? 0) / 1024).toFixed(1)} KB •{" "}
                      {selectedFile?.type}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelectedFile}
                    className="h-7 text-xs bg-white border-[#E5E2DC] text-[#8C2D2D] hover:bg-[#FBEFEF]"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Ganti Berkas
                  </Button>
                </div>

                <div className="rounded-[6px] border border-[#E5E2DC] bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={localPreviewUrl}
                    alt="Pratinjau gambar sebelum diunggah"
                    className="max-h-72 w-full object-contain mx-auto rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Catatan Konteks Siswa */}
          <div className="space-y-1.5">
            <Label htmlFor="student-note" className="text-xs font-medium">
              Catatan Desain & Rasional Keputusan UI/UX (Opsional)
            </Label>
            <textarea
              id="student-note"
              rows={3}
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              placeholder="Jelaskan asumsi pengguna, fokus layar yang Anda kumpulkan, atau perubahan dari versi sebelumnya..."
              className="w-full rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/50 p-3 text-xs text-[#141413] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
            />
          </div>

          {/* Tombol Simpan Draft vs Kirim Final */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[#E5E2DC]">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleSubmission("save_draft")}
              className="h-9 bg-white border-[#E5E2DC] text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5 text-[#575551]" />
              Simpan Draft
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmission("submit_final")}
              className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs px-5 gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isSubmitting
                ? "Mengunggah Karya..."
                : `Kirim Karya Final (v${nextVersionNumber})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}