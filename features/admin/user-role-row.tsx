"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateUserRoleAction } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/database";

export function UserRoleRow({
  user,
  currentAdminId,
}: {
  user: {
    id: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
  };
  currentAdminId: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState<boolean>(user.is_active);
  const [saving, setSaving] = useState(false);

  const isSelf = user.id === currentAdminId;

  async function handleSave() {
    setSaving(true);
    await adminUpdateUserRoleAction({
      targetUserId: user.id,
      newRole: role,
      isActive,
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
      <div>
        <p className="font-semibold text-[#141413]">
          {user.full_name || "Tanpa Nama"}{" "}
          {isSelf && (
            <span className="font-mono text-[10px] text-[#1E3A5F]">(Anda)</span>
          )}
        </p>
        <p className="font-mono text-[11px] text-[#63615C] mt-0.5">
          ID: {user.id.slice(0, 8)}... • Terdaftar{" "}
          {new Date(user.created_at).toLocaleDateString("id-ID")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={role}
          disabled={isSelf || saving}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="h-8 rounded-[5px] border border-[#E5E2DC] bg-[#F7F6F2] px-2.5 font-mono text-xs"
        >
          <option value="student">student</option>
          <option value="teacher">teacher</option>
          <option value="admin">admin</option>
        </select>

        <select
          value={isActive ? "active" : "suspended"}
          disabled={isSelf || saving}
          onChange={(e) => setIsActive(e.target.value === "active")}
          className="h-8 rounded-[5px] border border-[#E5E2DC] bg-[#F7F6F2] px-2.5 text-xs"
        >
          <option value="active">Aktif</option>
          <option value="suspended">Nonaktif</option>
        </select>

        {!isSelf && (
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="h-8 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs"
          >
            {saving ? "..." : "Simpan"}
          </Button>
        )}
      </div>
    </div>
  );
}