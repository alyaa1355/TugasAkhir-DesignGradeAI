"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClassAction } from "@/features/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeacherCreateClassForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await createClassAction({ name, description });
    setLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/70 space-y-4"
    >
      <h2 className="text-xs font-semibold uppercase font-mono tracking-wider text-[#1E3A5F]">
        Buat Kelas Studio Baru
      </h2>
      {error && <p className="text-xs text-[#8C2D2D]">{error}</p>}
      <div className="grid sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5 space-y-1">
          <Label className="text-xs">Nama Kelas</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: XII PPLG — UI/UX Design"
            required
            className="bg-white border-[#E5E2DC] text-xs"
          />
        </div>
        <div className="sm:col-span-5 space-y-1">
          <Label className="text-xs">Deskripsi Singkat</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Semester Ganjil 2026/2027"
            className="bg-white border-[#E5E2DC] text-xs"
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs"
          >
            {loading ? "Menyimpan..." : "Buat Kelas"}
          </Button>
        </div>
      </div>
    </form>
  );
}