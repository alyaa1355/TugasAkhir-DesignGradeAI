import { Suspense } from "react";
import Link from "next/link";
import {
  FileCheck2,
  ArrowRight,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { GradeDistributionChart } from "@/features/assessment/grade-distribution-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 8;

interface ReviewsSearchParams {
  q?: string;
  classId?: string;
  status?: string;
  page?: string;
}

async function TeacherReviewsQueueContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<ReviewsSearchParams>;
}) {
  const params = (await searchParamsPromise) ?? {};
  const { userId } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const searchQuery = (params.q ?? "").trim();
  const selectedClassId = (params.classId ?? "").trim();
  const selectedStatus = (params.status ?? "all").trim();
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const fromIndex = (currentPage - 1) * PAGE_SIZE;
  const toIndex = fromIndex + PAGE_SIZE - 1;

  // 1. Ambil daftar kelas milik guru untuk dropdown filter
  const { data: teacherClasses } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", userId)
    .order("name", { ascending: true });

  // 2. Bangun query server-side dengan filter & pagination
  let submissionsQuery = supabase
    .from("submissions")
    .select(
      `
      id,
      version_number,
      status,
      is_late,
      submitted_at,
      profiles:student_id(full_name),
      assignments!inner(
        id,
        title,
        class_id,
        teacher_id,
        deadline,
        classes(name)
      ),
      ai_assessments(
        id,
        status,
        calculated_score
      ),
      teacher_reviews(
        id,
        status,
        final_score,
        published_at
      )
    `,
      { count: "exact" }
    )
    .eq("assignments.teacher_id", userId)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false })
    .range(fromIndex, toIndex);

  if (searchQuery) {
    submissionsQuery = submissionsQuery.ilike(
      "assignments.title",
      `%${searchQuery}%`
    );
  }

  if (selectedClassId) {
    submissionsQuery = submissionsQuery.eq(
      "assignments.class_id",
      selectedClassId
    );
  }

  if (selectedStatus === "ungraded") {
    submissionsQuery = submissionsQuery.in("status", [
      "submitted",
      "processing",
      "awaiting_teacher_review",
      "failed",
    ]);
  } else if (selectedStatus !== "all") {
    submissionsQuery = submissionsQuery.eq("status", selectedStatus);
  }

  // 3. Ambil data nyata nilai final untuk statistik distribusi Recharts
  const [submissionsRes, statsReviewsRes] = await Promise.all([
    submissionsQuery,
    supabase
      .from("teacher_reviews")
      .select("final_score, status")
      .eq("teacher_id", userId)
      .eq("status", "published")
      .not("final_score", "is", null),
  ]);

  const list = submissionsRes.data ?? [];
  const totalCount = submissionsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Hitung distribusi nilai nyata dari database
  const publishedScores = (statsReviewsRes.data ?? []).map((r) =>
    Number(r.final_score)
  );
  const averageScore =
    publishedScores.length > 0
      ? publishedScores.reduce((a, b) => a + b, 0) / publishedScores.length
      : null;

  const gradeBuckets = [
    {
      range: "< 55",
      label: "Perlu Perbaikan",
      count: publishedScores.filter((s) => s < 55).length,
    },
    {
      range: "55–69",
      label: "Cukup",
      count: publishedScores.filter((s) => s >= 55 && s < 70).length,
    },
    {
      range: "70–84",
      label: "Baik",
      count: publishedScores.filter((s) => s >= 70 && s < 85).length,
    },
    {
      range: "85–100",
      label: "Sangat Baik",
      count: publishedScores.filter((s) => s >= 85).length,
    },
  ];

  const csvExportHref = `/api/reports/export-csv${
    selectedClassId ? `?classId=${encodeURIComponent(selectedClassId)}` : ""
  }`;

  const statusBadgeMap: Record<string, { label: string; className: string }> = {
    submitted: {
      label: "BARU MASUK",
      className: "bg-[#EBF0F5] text-[#1E3A5F] border-[#1E3A5F]/20",
    },
    processing: {
      label: "ANALISIS AI",
      className: "bg-[#FDF6EC] text-[#784916] border-[#784916]/25",
    },
    awaiting_teacher_review: {
      label: "PERLU REVIEW GURU",
      className: "bg-[#FDF6EC] text-[#784916] border-[#784916]/25",
    },
    revision_requested: {
      label: "PERLU REVISI SISWA",
      className: "bg-[#FBEFEF] text-[#8C2D2D] border-[#8C2D2D]/25",
    },
    graded: {
      label: "NILAI DITERBITKAN",
      className: "bg-[#EAF2EE] text-[#1F513F] border-[#1F513F]/25",
    },
    failed: {
      label: "AI GAGAL // REVIEW MANUAL",
      className: "bg-[#FBEFEF] text-[#8C2D2D] border-[#8C2D2D]/25",
    },
  };

  function buildPageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (searchQuery) sp.set("q", searchQuery);
    if (selectedClassId) sp.set("classId", selectedClassId);
    if (selectedStatus && selectedStatus !== "all")
      sp.set("status", selectedStatus);
    sp.set("page", String(targetPage));
    return `/teacher/reviews?${sp.toString()}`;
  }

  return (
    <div className="space-y-8">
      {/* Header & Tombol Export CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            CURATION, ANALYTICS & REPORTING
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Meja Kurasi & Laporan Penilaian Kelas
          </h1>
          <p className="text-xs text-[#575551] mt-1">
            Cari, saring antrean submission, pantau distribusi nilai, dan unduh
            laporan CSV resmi.
          </p>
        </div>

        <a href={csvExportHref} download>
          <Button
            variant="outline"
            size="sm"
            className="h-9 bg-white border-[#E5E2DC] text-[#141413] hover:bg-[#EFECE6] text-xs gap-2"
          >
            <Download className="h-3.5 w-3.5 text-[#1E3A5F]" />
            Unduh Laporan CSV
          </Button>
        </a>
      </div>

      {/* Grafik Statistik Distribusi Nilai */}
      <GradeDistributionChart
        buckets={gradeBuckets}
        totalGraded={publishedScores.length}
        averageScore={averageScore}
      />

      {/* Bar Pencarian & Filter Server-Side */}
      <form
        method="GET"
        action="/teacher/reviews"
        className="p-4 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/80 grid sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-5 space-y-1">
          <label
            htmlFor="search-title"
            className="font-mono text-[10px] uppercase text-[#575551]"
          >
            Cari Judul Tugas
          </label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[#8A8884] absolute left-3 top-2.5" />
            <Input
              id="search-title"
              name="q"
              defaultValue={searchQuery}
              placeholder="Ketik judul brief tugas..."
              className="h-9 pl-8 bg-white border-[#E5E2DC] text-xs"
            />
          </div>
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label
            htmlFor="filter-class"
            className="font-mono text-[10px] uppercase text-[#575551]"
          >
            Filter Kelas
          </label>
          <select
            id="filter-class"
            name="classId"
            defaultValue={selectedClassId}
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-white px-3 text-xs text-[#141413]"
          >
            <option value="">Semua Kelas</option>
            {(teacherClasses ?? []).map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="filter-status"
            className="font-mono text-[10px] uppercase text-[#575551]"
          >
            Status Penilaian
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={selectedStatus}
            className="w-full h-9 rounded-[6px] border border-[#E5E2DC] bg-white px-3 text-xs text-[#141413]"
          >
            <option value="all">Semua Status</option>
            <option value="ungraded">Belum Dinilai Final</option>
            <option value="awaiting_teacher_review">Menunggu Review Guru</option>
            <option value="revision_requested">Perlu Revisi Siswa</option>
            <option value="graded">Selesai Dinilai</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <Button
            type="submit"
            className="w-full h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs"
          >
            Terapkan Filter
          </Button>
        </div>
      </form>

      {/* Daftar Antrean Submission */}
      {list.length === 0 ? (
        <div className="p-10 rounded-[8px] border border-dashed border-[#E5E2DC] bg-[#F7F6F2]/50 text-center space-y-2">
          <FileCheck2 className="h-6 w-6 text-[#1E3A5F] mx-auto" />
          <p className="text-xs font-semibold text-[#141413]">
            Tidak ada karya siswa yang sesuai dengan kriteria filter
          </p>
          <p className="text-xs text-[#63615C]">
            Coba ubah kata kunci pencarian atau pilih &ldquo;Semua Status&rdquo;.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((sub) => {
            const student = Array.isArray(sub.profiles)
              ? sub.profiles[0]
              : sub.profiles;
            const assign = Array.isArray(sub.assignments)
              ? sub.assignments[0]
              : sub.assignments;
            const cls = Array.isArray(assign?.classes)
              ? assign.classes[0]
              : assign?.classes;
            const ai = Array.isArray(sub.ai_assessments)
              ? sub.ai_assessments[0]
              : sub.ai_assessments;
            const review = Array.isArray(sub.teacher_reviews)
              ? sub.teacher_reviews[0]
              : sub.teacher_reviews;

            const badge = statusBadgeMap[sub.status] ?? {
              label: sub.status.toUpperCase(),
              className: "bg-[#EFECE6] text-[#141413] border-[#E5E2DC]",
            };

            return (
              <div
                key={sub.id}
                className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white hover:border-[#1E3A5F]/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-[3px] border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="font-mono text-[11px] text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                      v{sub.version_number}
                    </span>
                    {sub.is_late && (
                      <span className="font-mono text-[10px] text-[#8C2D2D] bg-[#FBEFEF] px-2 py-0.5 rounded-[3px]">
                        TERLAMBAT
                      </span>
                    )}
                    <span className="text-xs text-[#63615C]">
                      • {cls?.name ?? "Kelas"}
                    </span>
                  </div>

                  <h2 className="text-sm font-semibold text-[#141413]">
                    {student?.full_name ?? "Siswa"} —{" "}
                    <span className="font-normal text-[#575551]">
                      {assign?.title}
                    </span>
                  </h2>

                  <p className="font-mono text-[11px] text-[#63615C]">
                    Dikirim:{" "}
                    {sub.submitted_at
                      ? new Date(sub.submitted_at).toLocaleString("id-ID")
                      : "-"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 text-right">
                    <div className="px-3 py-1.5 rounded-[5px] bg-[#F7F6F2] border border-[#E5E2DC]">
                      <span className="font-mono text-[9px] uppercase text-[#63615C] block">
                        SKOR AI
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
                        {ai?.calculated_score !== null &&
                        ai?.calculated_score !== undefined
                          ? `${Number(ai.calculated_score).toFixed(1)}`
                          : "—"}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 rounded-[5px] bg-[#EAF2EE]/70 border border-[#1F513F]/20">
                      <span className="font-mono text-[9px] uppercase text-[#1F513F] block">
                        NILAI GURU
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#1F513F] tabular-nums">
                        {review?.final_score !== null &&
                        review?.final_score !== undefined
                          ? `${Number(review.final_score).toFixed(1)}`
                          : "Belum Disahkan"}
                      </span>
                    </div>
                  </div>

                  <Link href={`/teacher/reviews/${sub.id}`}>
                    <Button
                      size="sm"
                      className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs gap-1.5"
                    >
                      <span>Buka Meja Review</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Navigasi Server-Side Pagination */}
          <div className="pt-4 border-t border-[#E5E2DC] flex items-center justify-between text-xs text-[#575551]">
            <span className="font-mono text-[11px]">
              Menampilkan {list.length} dari {totalCount} submission (Halaman{" "}
              {currentPage} / {totalPages})
            </span>

            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link href={buildPageHref(currentPage - 1)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white border-[#E5E2DC] gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Sebelumnya
                  </Button>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={buildPageHref(currentPage + 1)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white border-[#E5E2DC] gap-1"
                  >
                    Berikutnya
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherReviewsQueuePage({
  searchParams,
}: {
  searchParams: Promise<ReviewsSearchParams>;
}) {
  return (
    <Suspense
      fallback={<div className="h-80 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <TeacherReviewsQueueContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}