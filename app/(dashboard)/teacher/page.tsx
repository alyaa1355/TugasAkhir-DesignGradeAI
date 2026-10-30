import { Suspense } from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  FolderKanban,
  SlidersHorizontal,
  FileCheck2,
} from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { AssignmentLifecycleBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

async function TeacherDashboardContent() {
  const { userId, profile } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const [classesRes, assignmentsRes, rubricsRes, pendingReviewsRes] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, name, join_code, created_at")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("assignments")
        .select("id, title, design_type, deadline, status, classes(name)")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("rubrics")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId),
      supabase
        .from("submissions")
        .select("id, assignments!inner(teacher_id)", {
          count: "exact",
          head: true,
        })
        .eq("status", "awaiting_teacher_review")
        .eq("assignments.teacher_id", userId),
    ]);

  const classes = classesRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const rubricCount = rubricsRes.count ?? 0;
  const awaitingReviewCount = pendingReviewsRes.count ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            INSTRUCTOR WORKSPACE
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Selamat bertugas, {profile.full_name}
          </h1>
          <p className="text-xs text-[#575551] mt-1">
            Kelola kelas desain, kunci standar rubrik, dan validasi hasil evaluasi
            karya siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/teacher/rubrics/new">
            <Button
              variant="outline"
              size="sm"
              className="h-9 bg-white border-[#E5E2DC] text-xs gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#1E3A5F]" />
              Buat Rubrik
            </Button>
          </Link>
          <Link href="/teacher/assignments/new">
            <Button
              size="sm"
              className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Tugas Desain Baru
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/60">
          <div className="flex items-center justify-between text-[#575551]">
            <span className="text-xs">Kelas Dikelola</span>
            <Users className="h-4 w-4 text-[#1E3A5F]" />
          </div>
          <p className="font-mono text-2xl font-semibold mt-2 tabular-nums">
            {classes.length}
          </p>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/60">
          <div className="flex items-center justify-between text-[#575551]">
            <span className="text-xs">Total Brief Tugas</span>
            <FolderKanban className="h-4 w-4 text-[#1E3A5F]" />
          </div>
          <p className="font-mono text-2xl font-semibold mt-2 tabular-nums">
            {assignments.length}
          </p>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/60">
          <div className="flex items-center justify-between text-[#575551]">
            <span className="text-xs">Standar Rubrik</span>
            <SlidersHorizontal className="h-4 w-4 text-[#1E3A5F]" />
          </div>
          <p className="font-mono text-2xl font-semibold mt-2 tabular-nums">
            {rubricCount}
          </p>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#FDF6EC]/80">
          <div className="flex items-center justify-between text-[#784916]">
            <span className="text-xs font-medium">Menunggu Review Guru</span>
            <FileCheck2 className="h-4 w-4" />
          </div>
          <p className="font-mono text-2xl font-semibold text-[#784916] mt-2 tabular-nums">
            {awaitingReviewCount}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Kelas & Kode Undangan</h2>
            <Link
              href="/teacher/classes"
              className="text-xs text-[#1E3A5F] hover:underline"
            >
              Kelola Kelas →
            </Link>
          </div>

          {classes.length === 0 ? (
            <div className="p-6 rounded-[8px] border border-dashed border-[#E5E2DC] text-center space-y-2">
              <p className="text-xs text-[#575551]">
                Belum ada kelas yang dibuat.
              </p>
              <Link href="/teacher/classes">
                <Button variant="outline" size="sm" className="text-xs mt-1">
                  Buat Kelas Pertama
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-[8px] border border-[#E5E2DC] bg-white flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#141413]">
                      {cls.name}
                    </p>
                    <p className="text-[11px] text-[#63615C] mt-0.5">
                      Bagikan kode ini kepada siswa
                    </p>
                  </div>
                  <span className="font-mono text-xs font-medium bg-[#EFECE6] text-[#141413] px-2.5 py-1 rounded-[4px] border border-[#E5E2DC]">
                    {cls.join_code}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Penugasan Desain Terbaru</h2>
            <Link
              href="/teacher/assignments"
              className="text-xs text-[#1E3A5F] hover:underline"
            >
              Lihat Semua →
            </Link>
          </div>

          {assignments.length === 0 ? (
            <div className="p-6 rounded-[8px] border border-dashed border-[#E5E2DC] text-center space-y-2">
              <p className="text-xs text-[#575551]">
                Belum ada brief penugasan yang diterbitkan.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignments.map((assign) => (
                <Link
                  key={assign.id}
                  href={`/teacher/assignments/${assign.id}`}
                  className="block p-4 rounded-[8px] border border-[#E5E2DC] bg-white hover:border-[#1E3A5F]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#141413]">
                        {assign.title}
                      </p>
                      <p className="font-mono text-[11px] text-[#63615C] mt-1">
                        Tenggat:{" "}
                        {new Date(assign.deadline).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <AssignmentLifecycleBadge status={assign.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-16 rounded-[8px] bg-[#EFECE6] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
            <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
            <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
            <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
          </div>
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}