"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinClassByCodeAction } from "@/features/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinClassCard() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await joinClassByCodeAction({ joinCode });
    setLoading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }
    setJoinCode("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleJoin}
      className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
    >
      <div>
        <p className="text-xs font-semibold text-[#141413]">
          Bergabung ke Kelas Desain Baru
        </p>
        <p className="text-[11px] text-[#575551]">
          Masukkan kode undangan dari guru (contoh: DG-8K4P9X) untuk mengakses brief.
        </p>
        {error && <p className="text-[11px] text-[#8C2D2D] mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="DG-XXXXXX"
          required
          className="h-9 w-36 font-mono text-xs uppercase bg-white border-[#E5E2DC]"
        />
        <Button
          type="submit"
          disabled={loading}
          size="sm"
          className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs"
        >
          {loading ? "Memproses..." : "Gabung Kelas"}
        </Button>
      </div>
    </form>
  );
}