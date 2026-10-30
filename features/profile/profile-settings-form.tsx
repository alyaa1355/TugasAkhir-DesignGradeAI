"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  updateProfileAction,
  markAllNotificationsReadAction,
} from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileSettingsForm({
  initialName,
  email,
  role,
}: {
  initialName: string;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    const res = await updateProfileAction({ fullName });
    setSaving(false);

    if (!res.error) {
      setMessage("Identitas profil berhasil diperbarui.");
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4"
    >
      <h2 className="font-mono text-xs uppercase tracking-wider text-[#1E3A5F]">
        IDENTITAS AKUN STUDIO
      </h2>

      {message && (
        <div className="flex items-center gap-2 p-2.5 rounded-[5px] bg-[#EAF2EE] text-xs text-[#1F513F]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nama Lengkap</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="bg-[#F7F6F2]/60 border-[#E5E2DC] text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Alamat Email (Terverifikasi)</Label>
          <Input
            value={email}
            disabled
            className="bg-[#EFECE6]/60 border-[#E5E2DC] text-xs text-[#63615C]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#E5E2DC]">
        <span className="font-mono text-[11px] uppercase text-[#63615C]">
          PERAN OTORISASI: <strong className="text-[#1E3A5F]">{role}</strong>
        </span>
        <Button
          type="submit"
          disabled={saving}
          size="sm"
          className="h-8 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}

export function MarkNotificationsReadButton({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (unreadCount === 0) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await markAllNotificationsReadAction();
        setLoading(false);
        router.refresh();
      }}
      className="h-8 text-xs bg-white border-[#E5E2DC]"
    >
      {loading ? "Memperbarui..." : "Tandai Semua Sudah Dibaca"}
    </Button>
  );
}