import { Suspense } from "react";
import Link from "next/link";
import {
  Search,
  FolderKanban,
  ArrowRight,
  Calendar,
  Layers,
  Award,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import {
  StudentWorkStatusBadge,
  resolveStudentWorkState,
  type StudentAssignmentViewState,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssignmentStatus, SubmissionStatus } from "@/types/database";

interface StudentAssignmentsSearchParams {
  q?: string;
  classId?: string;
  state?: string;
  sort?: string;
}

async function StudentAssignmentsCatalogContent({
  searchParamsPromise,
}: {
  searchParamsPromise?: Promise<StudentAssignmentsSearchParams>;
}) {
  const params = (await searchParamsPromise) ?? {};
  const { userId } = await requireRole(["student"]);
  const supabase = await createClient();

  const searchQuery = (params.q ?? "").trim();
  const selectedClassId = (params.classId ?? "").trim();
  const selectedState = (params.state ?? "all").trim();
  const selectedSort = (params.sort ?? "deadline_asc").trim();

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, classes(id, name)")
    .eq("student_id", userId)
    .eq("status", "active");

  const enrolledClasses = (memberships ?? []).map((m) => {
    const cls = Array.isArray(m.classes) ? m.classes[0] : m.classes;
    return {
      id: m.class_id,
      name: cls?.name ?? "Kelas Desain",
    };
  });

  const classIds = enrolledClasses.map((c) => c.id);

  let assignmentsQuery =
    classIds.length > 0
      ? supabase
          .from("assignments")
          .select(
            `
            id,
            class_id,
            title,
            description,
            design_type,
            target_platform,
            max_attempts,
            deadline,
            status,
            show_ai_score_before_review,
            created_at,
            classes(name),
            submissions(
              id,
              status,
              version_number,
              is_late,
              submitted_at,
              ai_assessments(calculated_score, status),
              teacher_reviews(final_score, status)
            )
          `
          )
          .in("class_id", classIds)
          .in("status", ["published", "closed"])
      : null;

  if (assignmentsQuery && searchQuery) {
    assignmentsQuery = assignmentsQuery.ilike("title", `%${searchQuery}%`);
  }

  if (assignmentsQuery && selectedClassId) {
    assignmentsQuery = assignmentsQuery.eq("class_id", selectedClassId);
  }

  const { data: rawAssignments } = assignmentsQuery
    ? await assignmentsQuery
    : { data: [] };

  const processedList = (rawAssignments ?? []).map((a) => {
    const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes;
    const subs = (Array.isArray(a.submissions) ? a.submissions : []).sort(
      (x, y) => (y.version_number ?? 0) - (x.version_number ?? 0)
    );

    const latestSub = subs[0] ?? null;
    const nonDraftAttempts = subs.filter((s) => s.status !== "draft").length;

    const workState = resolveStudentWorkState(
      a.status as AssignmentStatus,
      latestSub?.status as SubmissionStatus | undefined
    );

    const reviewObj = latestSub
      ? Array.isArray(latestSub.teacher_reviews)
        ? latestSub.teacher_reviews[0]
        : latestSub.teacher_reviews
      : null;

    const aiObj = latestSub
      ? Array.isArray(latestSub.ai_assessments)
        ? latestSub.ai_assessments[0]
        : latestSub.ai_assessments
      : null;

    const publishedFinalScore =
      reviewObj?.status === "published" && reviewObj?.final_score !== null
        ? Number(reviewObj.final_score)
        : null;

    const provisionalAiScore =
      a.show_ai_score_before_review &&
      aiObj?.calculated_score !== null &&
      aiObj?.calculated_score !== undefined
        ? Number(aiObj.calculated_score)
        : null;

    return {
      id: a.id,
      classId: a.class_id,
      className: cls?.name ?? "Kelas Desain",
      title: a.title,
      description: a.description,
      designType: a.design_type,
      targetPlatform: a.target_platform,
      maxAttempts: a.max_attempts,
      usedAttempts: nonDraftAttempts,
      deadline: a.deadline,
      createdAt: a.created_at,
      latestVersion: latestSub?.version_number ?? null,
      workState,
      publishedFinalScore,
      provisionalAiScore,
    };
  });

  const filteredByState =
    selectedState === "all"
      ? processedList
      : processedList.filter((item) => item.workState === selectedState);

  const sortedAssignments = [...filteredByState].sort((x, y) => {
    if (selectedSort === "deadline_desc") {
      return new Date(y.deadline).getTime() - new Date(x.deadline).getTime();
    }
    if (selectedSort === "newest") {
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    }
    return new Date(x.deadline).getTime() - new Date(y.deadline).getTime();
  });

  const stateFilterPills: Array<{
    value: "all" | StudentAssignmentViewState;
    label: string;
  }> = [
    { value: "all", label: "Semua Tugas" },
    { value: "available", label: "Tersedia" },
    { value: "in_progress", label: "Draft Dikerjakan" },
    { value: "ai_processing", label: "Diproses AI" },
    { value: "awaiting_teacher_review", label: "Menunggu Review" },
    { value: "revision_requested", label: "Perlu Revisi" },
    { value: "graded", label: "Nilai Diterbitkan" },
  ];

  function buildFilterPillHref(targetState: string) {
    const sp = new URLSearchParams();
    if (searchQuery) sp.set("q", searchQuery);
    if (selectedClassId) sp.set("classId", selectedClassId);
    if (selectedSort && selectedSort !== "deadline_asc")
      sp.set("sort", selectedSort);
    if (targetState !== "all") sp.set("state", targetState);
    const queryStr = sp.toString();
    return queryStr
      ? `/student/assignments?${queryStr}`
      : "/student/assignments";
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            ASSIGNMENT ARCHIVE & EXPLORER
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Daftar Brief & Penugasan Desain
          </h1>
          <p className="text-xs text-[#575551] mt-1">
            Telusuri seluruh brief desain dari kelas yang Anda ikuti, saring
            berdasarkan status evaluasi, dan pantau kuota percobaan karya.
          </p>
        </div>

        <div className="font-mono text-xs text-[#575551] bg-[#F7F6F2] border border-[#E5E2DC] px-3 py-1.5 rounded-[6px] shrink-0">
          Menampilkan{" "}
          <strong className="text-[#141413] tabular-nums">
            {sortedAssignments.length}
          </strong>{" "}
          dari{" "}
          <strong className="text-[#141413] tabular-nums">
            {processedList.length}
          </strong>{" "}
          Brief Tugas
        </div>
      </div>

      <form
        method="GET"
        action="/student/assignments"
        className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/80 grid sm:grid-cols-12 gap-3 items-end"
      >
        <input type="hidden" name="state" value={selectedState} />

        <div className="sm:col-span-5 space-y-1">
          <label
            htmlFor="student-search-q"
            className="font-mono text-[10px] uppercase text-[#575551]"
          >
            Cari Judul Brief
          </label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#8A8884] absolute left-3 top-2.5" />
            <Input
              id="student-search-q"
              name="q"
              defaultValue={searchQuery}
              placeholder="Contoh: Checkout, Klinik, Dashboard..."
              className="h-9 pl-8 bg-white border-[#E5E2DC] text-xs"
            />
          </div>
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label
            htmlFor="student-filter-class"
            className="font-mono text-[10px] uppercase text-[#575551]"
          >
            Filter Kelas
          </label>
          <select
            id="student-filter-class"
            name="classId"
            defaultValue={selectedClassId}
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-white px-3 text-xs text-[#141413]"
          >
            <option value="">Semua Kelas Diikuti</option>
            {enrolledClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="student-sort"
            className="font-mono text-[10px] uppercase text-[#575551]"
          >
            Urutkan
          </label>
          <select
            id="student-sort"
            name="sort"
            defaultValue={selectedSort}
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-white px-3 text-xs text-[#141413]"
          >
            <option value="deadline_asc">Tenggat Terdekat</option>
            <option value="deadline_desc">Tenggat Terjauh</option>
            <option value="newest">Terbaru Dirilis</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex items-center gap-1.5">
          <Button
            type="submit"
            className="flex-1 h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Terapkan
          </Button>
          {(searchQuery || selectedClassId || selectedState !== "all") && (
            <Link href="/student/assignments">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 bg-white border-[#E5E2DC]"
                title="Reset Filter"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#575551]" />
              </Button>
            </Link>
          )}
        </div>
      </form>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {stateFilterPills.map((pill) => {
          const active = selectedState === pill.value;
          return (
            <Link
              key={pill.value}
              href={buildFilterPillHref(pill.value)}
              className={`shrink-0 rounded-[5px] px-3 py-1.5 font-mono text-[11px] font-medium transition-colors border ${
                active
                  ? "bg-[#141413] text-[#F7F6F2] border-[#141413]"
                  : "bg-white text-[#575551] border-[#E5E2DC] hover:bg-[#EFECE6]"
              }`}
            >
              {pill.label}
            </Link>
          );
        })}
      </div>

      {sortedAssignments.length === 0 ? (
        <div className="p-12 rounded-[8px] border border-dashed border-[#E5E2DC] bg-[#F7F6F2]/40 text-center space-y-2.5">
          <FolderKanban className="h-6 w-6 text-[#1E3A5F] mx-auto" />
          <p className="text-xs font-semibold text-[#141413]">
            Tidak ada brief tugas yang ditemukan
          </p>
          <p className="text-xs text-[#63615C] max-w-md mx-auto">
            {enrolledClasses.length === 0
              ? "Anda belum bergabung ke kelas desain mana pun. Silakan masukkan kode undangan kelas melalui menu Kelas Diikuti."
              : "Coba ubah filter status pengerjaan atau kata kunci pencarian di atas."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {sortedAssignments.map((item) => {
            const isOverdue =
              new Date() > new Date(item.deadline) &&
              item.workState === "available";

            return (
              <Link
                key={item.id}
                href={`/student/assignments/${item.id}`}
                className="group p-5 rounded-[8px] border border-[#E5E2DC] bg-white hover:border-[#1E3A5F]/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                      {item.designType.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[11px] text-[#575551] bg-[#F7F6F2] border border-[#E5E2DC] px-2 py-0.5 rounded-[3px]">
                      {item.className}
                    </span>
                    <span className="font-mono text-[11px] text-[#63615C]">
                      • Platform: {item.targetPlatform}
                    </span>
                  </div>

                  <h2 className="text-base font-semibold text-[#141413] group-hover:text-[#1E3A5F] transition-colors">
                    {item.title}
                  </h2>

                  <p className="text-xs text-[#575551] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[11px] text-[#63615C]">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        isOverdue ? "text-[#8C2D2D] font-medium" : ""
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Tenggat:{" "}
                      {new Date(item.deadline).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Layers className="h-3.5 w-3.5" />
                      Percobaan: {item.usedAttempts} / {item.maxAttempts}
                      {item.latestVersion
                        ? ` (Terakhir v${item.latestVersion})`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E5E2DC] shrink-0">
                  {item.publishedFinalScore !== null ? (
                    <div className="px-3 py-1.5 rounded-[6px] bg-[#EAF2EE] border border-[#1F513F]/25 text-right">
                      <span className="font-mono text-[9px] uppercase text-[#1F513F] flex items-center justify-end gap-1">
                        <Award className="h-3 w-3" />
                        NILAI FINAL
                      </span>
                      <span className="font-mono text-base font-semibold text-[#1F513F] tabular-nums">
                        {item.publishedFinalScore.toFixed(1)}
                      </span>
                      <span className="font-mono text-[10px] text-[#1F513F]">
                        /100
                      </span>
                    </div>
                  ) : item.provisionalAiScore !== null ? (
                    <div className="px-3 py-1.5 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] text-right">
                      <span className="font-mono text-[9px] uppercase text-[#63615C] block">
                        ESTIMASI AI
                      </span>
                      <span className="font-mono text-sm font-semibold text-[#141413] tabular-nums">
                        {item.provisionalAiScore.toFixed(1)}
                      </span>
                      <span className="font-mono text-[10px] text-[#63615C]">
                        /100
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <StudentWorkStatusBadge state={item.workState} />
                    <ArrowRight className="h-4 w-4 text-[#8A8884] group-hover:text-[#1E3A5F] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentAssignmentsListPage({
  searchParams,
}: {
  searchParams?: Promise<StudentAssignmentsSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-20 rounded-[8px] bg-[#EFECE6] animate-pulse" />
          <div className="h-16 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
          <div className="h-64 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
        </div>
      }
    >
      <StudentAssignmentsCatalogContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}