import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/\r?\n|\r/g, " ").trim();
  // Proteksi CSV Formula Injection (=, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const searchParams = request.nextUrl.searchParams;
  const classId = searchParams.get("classId");
  const assignmentId = searchParams.get("assignmentId");

  let query = supabase
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
        classes(name)
      ),
      ai_assessments(calculated_score, status),
      teacher_reviews(final_score, status, teacher_feedback)
    `
    )
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });

  // Pastikan guru hanya mengekspor data kelas yang menjadi tanggung jawabnya
  if (session.profile.role === "teacher") {
    query = query.eq("assignments.teacher_id", session.userId);
  }

  if (classId) {
    query = query.eq("assignments.class_id", classId);
  }

  if (assignmentId) {
    query = query.eq("assignment_id", assignmentId);
  }

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data laporan penilaian." },
      { status: 500 }
    );
  }

  const headers = [
    "Nama Siswa",
    "Kelas",
    "Judul Tugas",
    "Versi",
    "Waktu Pengumpulan",
    "Keterlambatan",
    "Status Submission",
    "Nilai AI",
    "Nilai Final Guru",
    "Status Review",
    "Feedback Singkat Guru",
  ];

  const csvLines = [headers.map(escapeCsvCell).join(",")];

  for (const row of rows ?? []) {
    const student = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const assignment = Array.isArray(row.assignments)
      ? row.assignments[0]
      : row.assignments;
    const cls = Array.isArray(assignment?.classes)
      ? assignment.classes[0]
      : assignment?.classes;
    const ai = Array.isArray(row.ai_assessments)
      ? row.ai_assessments[0]
      : row.ai_assessments;
    const review = Array.isArray(row.teacher_reviews)
      ? row.teacher_reviews[0]
      : row.teacher_reviews;

    const line = [
      student?.full_name ?? "Siswa",
      cls?.name ?? "-",
      assignment?.title ?? "-",
      `v${row.version_number}`,
      row.submitted_at
        ? new Date(row.submitted_at).toLocaleString("id-ID")
        : "-",
      row.is_late ? "Terlambat" : "Tepat Waktu",
      row.status,
      ai?.calculated_score !== null && ai?.calculated_score !== undefined
        ? Number(ai.calculated_score).toFixed(2)
        : "-",
      review?.final_score !== null && review?.final_score !== undefined
        ? Number(review.final_score).toFixed(2)
        : "-",
      review?.status ?? "belum_direview",
      review?.teacher_feedback ?? "-",
    ];

    csvLines.push(line.map(escapeCsvCell).join(","));
  }

  const csvContent = "\uFEFF" + csvLines.join("\n");
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-penilaian-designgrade-${dateStamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}