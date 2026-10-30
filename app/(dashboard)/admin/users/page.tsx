import { Suspense } from "react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRoleRow } from "@/features/admin/user-role-row";

async function AdminUsersManagementContent() {
  const { userId } = await requireRole(["admin"]);
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5E2DC] pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
          USER & PRIVILEGE GOVERNANCE
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Pengelolaan Akun & Otorisasi Peran
        </h1>
      </div>

      <div className="space-y-2.5">
        {(users ?? []).map((u) => (
          <UserRoleRow key={u.id} user={u} currentAdminId={userId} />
        ))}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <AdminUsersManagementContent />
    </Suspense>
  );
}