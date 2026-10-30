import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, CheckCircle2, Eye } from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { AssignmentLifecycleBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

async function TeacherAssignmentDetailContent({
    paramsPromise,
}: {
    paramsPromise: Promise<{ id: string }>;
}) {
    const { id } = await paramsPromise;
    const { userId } = await requireRole(["teacher", "admin"]);
    const supabase = await createClient();

    const { data: assignment } = await supabase
        .from("assignments")
        .select(
            `
      *,
      classes(id, name, join_code),
      assignment_rubrics(
        rubric_version_id,
        rubric_versions(
          version_number,
          total_weight,
          rubrics(title),
          rubric_criteria(id, name, weight, description, sort_order)
        )
      ),
      submissions(
        id,
        version_number,
        status,
        is_late,
        submitted_at,
        profiles:student_id(full_name)
      )
    `
        )
        .eq("id", id)
        .eq("teacher_id", userId)
        .single();

    if (!assignment) {
        notFound();
    }

    const cls = Array.isArray(assignment.classes)
        ? assignment.classes[0]
        : assignment.classes;

    const rubricLink = Array.isArray(assignment.assignment_rubrics)
        ? assignment.assignment_rubrics[0]
        : assignment.assignment_rubrics;

    const rubricVersion = rubricLink?.rubric_versions;
    const rubricCriteria = (rubricVersion?.rubric_criteria ?? []).sort(
        (a: { sort_order: number }, b: { sort_order: number }) =>
            a.sort_order - b.sort_order
    );

    const submissions = Array.isArray(assignment.submissions)
        ? assignment.submissions
        : [];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E5E2DC] pb-6">
                <div className="space-y-2">
                    <Link
                        href="/teacher/assignments"
                        className="inline-flex items-center gap-1.5 text-xs text-[#575551] hover:text-[#141413]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Kembali ke Daftar Penugasan
                    </Link>
                    <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                            {assignment.design_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-[#575551]">
                            • Kelas: <strong>{cls?.name}</strong> (Kode:{" "}
                            <span className="font-mono">{cls?.join_code}</span>)
                        </span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-[-0.02em]">
                        {assignment.title}
                    </h1>
                    <p className="font-mono text-xs text-[#63615C]">
                        Tenggat:{" "}
                        {new Date(assignment.deadline).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                </div>

                <AssignmentLifecycleBadge status={assignment.status} />
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Kolom Kiri: Brief & Daftar Submission Siswa */}
                <div className="lg:col-span-7 space-y-6">
                    <section className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-3">
                        <h2 className="font-mono text-xs uppercase tracking-wider text-[#1E3A5F]">
                            BRIEF DESAIN & TUJUAN PEMBELAJARAN
                        </h2>
                        <p className="text-xs font-medium text-[#141413] whitespace-pre-line">
                            {assignment.learning_objectives}
                        </p>
                        <div className="pt-3 border-t border-[#E5E2DC]">
                            <p className="text-xs leading-relaxed text-[#575551] whitespace-pre-line">
                                {assignment.design_brief}
                            </p>
                        </div>
                    </section>

                    <section className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-[#1E3A5F]" />
                                <h2 className="text-xs font-semibold uppercase font-mono tracking-wider">
                                    Pengumpulan Karya Siswa ({submissions.length})
                                </h2>
                            </div>
                        </div>

                        {submissions.length === 0 ? (
                            <div className="py-8 text-center text-xs text-[#575551]">
                                Belum ada siswa yang mengumpulkan karya pada tugas ini. Bagikan
                                kode kelas <strong className="font-mono">{cls?.join_code}</strong>{" "}
                                kepada siswa Anda.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {submissions.map((sub: any) => {
                                    const studentProfile = Array.isArray(sub.profiles)
                                        ? sub.profiles[0]
                                        : sub.profiles;
                                    return (
                                        <div
                                            key={sub.id}
                                            className="p-3.5 rounded-[6px] border border-[#E5E2DC] bg-[#F7F6F2]/60 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div>
                                                <p className="font-semibold text-[#141413]">
                                                    {studentProfile?.full_name ?? "Siswa"} •{" "}
                                                    <span className="font-mono text-[#1E3A5F]">
                                                        v{sub.version_number}
                                                    </span>
                                                </p>
                                                <p className="font-mono text-[11px] text-[#63615C] mt-0.5">
                                                    Status: {sub.status}
                                                </p>
                                            </div>

                                            <Link href={`/teacher/reviews/${sub.id}`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs bg-white border-[#E5E2DC] gap-1.5"
                                                >
                                                    <Eye className="h-3.5 w-3.5 text-[#1E3A5F]" />
                                                    Periksa Karya
                                                </Button>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                {/* Kolom Kanan: Snapshot Rubrik Terkunci */}
                <div className="lg:col-span-5">
                    <div className="p-5 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/70 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
                            <div>
                                <p className="font-mono text-[10px] uppercase text-[#1E3A5F]">
                                    IMMUTABLE RUBRIC SNAPSHOT
                                </p>
                                <h2 className="text-xs font-semibold text-[#141413] mt-0.5">
                                    Versi v{rubricVersion?.version_number ?? 1} Terkunci
                                </h2>
                            </div>
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#1F513F] bg-[#EAF2EE] px-2 py-0.5 rounded-[3px]">
                                <CheckCircle2 className="h-3 w-3" />
                                {rubricVersion?.total_weight ?? 100}%
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {rubricCriteria.map(
                                (c: {
                                    id: string;
                                    name: string;
                                    weight: number;
                                    description: string;
                                }) => (
                                    <div
                                        key={c.id}
                                        className="p-3 rounded-[6px] bg-white border border-[#E5E2DC] space-y-1"
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-[#141413]">
                                                {c.name}
                                            </span>
                                            <span className="font-mono font-medium text-[#1E3A5F] tabular-nums">
                                                {c.weight}%
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-[#575551] leading-relaxed">
                                            {c.description}
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TeacherAssignmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    return (
        <Suspense
            fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
        >
            <TeacherAssignmentDetailContent paramsPromise={params} />
        </Suspense>
    );
}