import { Suspense } from "react";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { AssignmentLifecycleBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

async function TeacherAssignmentsContent() {
  const { userId } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      `
      id,
      title,
      design_type,
      target_platform,
      deadline,
      status,
      classes(name)
    `
    )
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false });

  const list = assignments ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            ASSIGNMENT MANAGEMENT
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Daftar Brief & Penugasan Desain
          </h1>
        </div>

        <Link href="/teacher/assignments/new">
          <Button className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Buat Brief Tugas Baru
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="p-8 rounded-[8px] border border-dashed border-[#E5E2DC] bg-[#F7F6F2]/50 text-center space-y-3">
          <FolderKanban className="h-6 w-6 text-[#1E3A5F] mx-auto" />
          <p className="text-xs font-semibold text-[#141413]">
            Belum ada brief tugas yang dibuat
          </p>
          <Link href="/teacher/assignments/new" className="inline-block pt-1">
            <Button size="sm" className="bg-[#141413] text-[#F7F6F2] text-xs">
              Buat Tugas Pertama
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((item) => {
            const cls = Array.isArray(item.classes)
              ? item.classes[0]
              : item.classes;
            return (
              <div
                key={item.id}
                className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                      {item.design_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-[#575551]">
                      • {cls?.name ?? "Kelas"}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-[#141413]">
                    {item.title}
                  </h2>
                  <p className="font-mono text-[11px] text-[#63615C]">
                    Tenggat:{" "}
                    {new Date(item.deadline).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <AssignmentLifecycleBadge status={item.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeacherAssignmentsPage() {
  return (
    <Suspense
      fallback={<div className="h-48 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <TeacherAssignmentsContent />
    </Suspense>
  );
}