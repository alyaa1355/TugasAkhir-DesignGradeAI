import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import {
  StudentWorkStatusBadge,
  resolveStudentWorkState,
} from "@/components/shared/status-badge";
import { JoinClassCard } from "@/features/classes/join-class-card";
import type { AssignmentStatus, SubmissionStatus } from "@/types/database";

async function StudentDashboardContent() {
  const { userId, profile } = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, classes(id, name)")
    .eq("student_id", userId)
    .eq("status", "active");

  const classIds = (memberships ?? []).map((m) => m.class_id);

  const { data: assignments } =
    classIds.length > 0
      ? await supabase
          .from("assignments")
          .select(
            `
            id,
            title,
            design_type,
            target_platform,
            deadline,
            status,
            classes(name),
            submissions(id, status, version_number, submitted_at)
          `
          )
          .in("class_id", classIds)
          .in("status", ["published", "closed"])
          .order("deadline", { ascending: true })
      : { data: [] };

  const enrichedAssignments = (assignments ?? []).map((a) => {
    const subs = Array.isArray(a.submissions) ? a.submissions : [];
    const latestSub = subs.sort(
      (x, y) => (y.version_number ?? 0) - (x.version_number ?? 0)
    )[0];
    const workState = resolveStudentWorkState(
      a.status as AssignmentStatus,
      latestSub?.status as SubmissionStatus | undefined
    );
    return {
      ...a,
      latestSubmission: latestSub ?? null,
      workState,
    };
  });

  const pendingCount = enrichedAssignments.filter((a) =>
    ["available", "in_progress"].includes(a.workState)
  ).length;
  const processingCount = enrichedAssignments.filter((a) =>
    ["ai_processing", "awaiting_teacher_review"].includes(a.workState)
  ).length;
  const revisionCount = enrichedAssignments.filter(
    (a) => a.workState === "revision_requested"
  ).length;
  const gradedCount = enrichedAssignments.filter(
    (a) => a.workState === "graded"
  ).length;

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E5E2DC] pb-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
          STUDENT DESIGN DESK
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Halo, {profile.full_name}
        </h1>
        <p className="text-xs text-[#575551] mt-1">
          Pantau tenggat brief desain, status analisis AI, dan umpan balik dari
          pengajar Anda.
        </p>
      </div>

      <JoinClassCard />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#575551]">
            <span>Perlu Dikerjakan</span>
            <Calendar className="h-4 w-4 text-[#1E3A5F]" />
          </div>
          <p className="font-mono text-2xl font-semibold mt-2 tabular-nums">
            {pendingCount}
          </p>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#784916]">
            <span>Diproses AI / Review</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="font-mono text-2xl font-semibold text-[#784916] mt-2 tabular-nums">
            {processingCount}
          </p>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#8C2D2D]">
            <span>Perlu Revisi</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="font-mono text-2xl font-semibold text-[#8C2D2D] mt-2 tabular-nums">
            {revisionCount}
          </p>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#1F513F]">
            <span>Selesai Dinilai</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="font-mono text-2xl font-semibold text-[#1F513F] mt-2 tabular-nums">
            {gradedCount}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Tugas dengan Tenggat Terdekat
          </h2>
          <Link
            href="/student/assignments"
            className="text-xs text-[#1E3A5F] hover:underline"
          >
            Buka Katalog & Filter Lengkap →
          </Link>
        </div>

        {enrichedAssignments.length === 0 ? (
          <div className="p-8 rounded-[8px] border border-dashed border-[#E5E2DC] text-center space-y-2">
            <p className="text-xs font-medium text-[#141413]">
              Belum ada tugas desain aktif
            </p>
            <p className="text-xs text-[#63615C]">
              Bergabunglah ke kelas menggunakan kode undangan dari guru Anda di
              atas.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {enrichedAssignments.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/student/assignments/${item.id}`}
                className="group p-4 rounded-[8px] border border-[#E5E2DC] bg-white hover:border-[#1E3A5F]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                      {item.design_type.replace(/_/g, " ")}
                    </span>
                    {item.latestSubmission && (
                      <span className="font-mono text-[10px] text-[#63615C]">
                        Versi v{item.latestSubmission.version_number}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#141413] group-hover:text-[#1E3A5F]">
                    {item.title}
                  </h3>
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

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <StudentWorkStatusBadge state={item.workState} />
                  <ArrowRight className="h-4 w-4 text-[#8A8884] group-hover:text-[#1E3A5F] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentDeskSkeleton() {
  return (
    <div className="space-y-8">
      <div className="border-b border-[#E5E2DC] pb-6 space-y-2">
        <div className="h-3 w-32 rounded bg-[#EFECE6] animate-pulse" />
        <div className="h-7 w-56 rounded bg-[#EFECE6] animate-pulse" />
      </div>
      <div className="h-20 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
        <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
        <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
        <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<StudentDeskSkeleton />}>
      <StudentDashboardContent />
    </Suspense>
  );
}