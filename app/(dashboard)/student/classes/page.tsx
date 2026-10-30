import { Suspense } from "react";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { JoinClassCard } from "@/features/classes/join-class-card";

async function StudentClassesContent() {
  const { userId } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("class_members")
    .select(
      `
      id,
      joined_at,
      status,
      classes(id, name, description, join_code)
    `
    )
    .eq("student_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: false });

  const list = memberships ?? [];

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E5E2DC] pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
          ENROLLED STUDIOS
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Kelas Desain yang Diikuti
        </h1>
      </div>

      <JoinClassCard />

      {list.length === 0 ? (
        <div className="p-8 rounded-[8px] border border-dashed border-[#E5E2DC] text-center space-y-2">
          <Users className="h-6 w-6 text-[#1E3A5F] mx-auto" />
          <p className="text-xs font-medium text-[#141413]">
            Anda belum bergabung ke kelas mana pun
          </p>
          <p className="text-xs text-[#63615C]">
            Masukkan kode undangan dari guru Anda pada formulir di atas.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((m) => {
            const cls = Array.isArray(m.classes) ? m.classes[0] : m.classes;
            return (
              <div
                key={m.id}
                className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#1F513F] bg-[#EAF2EE] px-2 py-0.5 rounded-[3px]">
                    ACTIVE MEMBER
                  </span>
                  <span className="font-mono text-xs text-[#63615C]">
                    {cls?.join_code}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-[#141413]">
                  {cls?.name ?? "Kelas Desain"}
                </h2>
                {cls?.description && (
                  <p className="text-xs text-[#575551]">{cls.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentClassesPage() {
  return (
    <Suspense
      fallback={<div className="h-48 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <StudentClassesContent />
    </Suspense>
  );
}