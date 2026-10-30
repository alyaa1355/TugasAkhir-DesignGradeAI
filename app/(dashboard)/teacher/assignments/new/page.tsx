import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { NewAssignmentForm } from "@/features/assignments/new-assignment-form";

async function NewAssignmentContent() {
  const { userId } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const [classesRes, rubricsRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rubric_versions")
      .select("id, version_number, rubrics!inner(title, owner_id)")
      .eq("rubrics.owner_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const classes = classesRes.data ?? [];
  const rubricVersions = (rubricsRes.data ?? []).map((rv) => {
    const r = Array.isArray(rv.rubrics) ? rv.rubrics[0] : rv.rubrics;
    return {
      id: rv.id,
      version_number: rv.version_number,
      title: r?.title ?? "Rubrik",
    };
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5E2DC] pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
          ASSIGNMENT STUDIO
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Buat Brief Penugasan Desain Baru
        </h1>
      </div>

      {(classes.length === 0 || rubricVersions.length === 0) && (
        <div className="p-4 rounded-[8px] border border-[#784916]/30 bg-[#FDF6EC] text-xs text-[#784916] space-y-1">
          <p className="font-semibold">Prasyarat Belum Lengkap:</p>
          <p>
            Pastikan Anda sudah membuat minimal{" "}
            <Link href="/teacher/classes" className="underline font-medium">
              1 Kelas
            </Link>{" "}
            dan{" "}
            <Link href="/teacher/rubrics/new" className="underline font-medium">
              1 Standar Rubrik
            </Link>{" "}
            sebelum menerbitkan tugas.
          </p>
        </div>
      )}

      <NewAssignmentForm classes={classes} rubricVersions={rubricVersions} />
    </div>
  );
}

export default function NewAssignmentPage() {
  return (
    <Suspense fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}>
      <NewAssignmentContent />
    </Suspense>
  );
}