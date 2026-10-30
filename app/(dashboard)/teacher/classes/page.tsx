import { Suspense } from "react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { TeacherCreateClassForm } from "@/features/classes/teacher-create-class-form";
import {
  TeacherClassDetailCard,
  type ClassParticipantItem,
  type ClassAssignmentSummary,
} from "@/features/classes/teacher-class-detail-card";
import type { AssignmentStatus, ClassMemberStatus } from "@/types/database";

async function TeacherClassesContent() {
  const { userId } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select(
      `
      id,
      name,
      description,
      join_code,
      created_at,
      class_members(
        id,
        student_id,
        joined_at,
        status,
        profiles:student_id(
          id,
          full_name
        )
      ),
      assignments(
        id,
        title,
        design_type,
        deadline,
        status
      )
    `
    )
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false });

  const formattedClasses = (classes ?? []).map((cls) => {
    const rawMembers = Array.isArray(cls.class_members)
      ? cls.class_members
      : [];

    const participants: ClassParticipantItem[] = rawMembers.map(
      (m: {
        id: string;
        student_id: string;
        joined_at: string;
        status: string;
        profiles:
          | { id: string; full_name: string }
          | { id: string; full_name: string }[]
          | null;
      }) => {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          memberId: m.id,
          studentId: m.student_id,
          fullName: prof?.full_name || "Siswa Studio",
          joinedAt: m.joined_at,
          status: (m.status as ClassMemberStatus) ?? "active",
        };
      }
    );

    const rawAssignments = Array.isArray(cls.assignments)
      ? cls.assignments
      : [];

    const assignments: ClassAssignmentSummary[] = rawAssignments.map(
      (a: {
        id: string;
        title: string;
        design_type: string;
        deadline: string;
        status: string;
      }) => ({
        id: a.id,
        title: a.title,
        designType: a.design_type,
        deadline: a.deadline,
        status: a.status as AssignmentStatus,
      })
    );

    return {
      id: cls.id,
      name: cls.name,
      description: cls.description,
      joinCode: cls.join_code,
      createdAt: cls.created_at,
      participants,
      assignments,
    };
  });

  const totalActiveStudentsAcrossClasses = formattedClasses.reduce(
    (sum, c) =>
      sum + c.participants.filter((p) => p.status === "active").length,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            CLASSROOM & PARTICIPANT MANAGEMENT
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Kelas, Partisipan Siswa & Distribusi Tugas
          </h1>
          <p className="text-xs text-[#575551] mt-1">
            Pantau daftar siswa yang bergabung di setiap kelas serta tugas yang
            terikat khusus pada masing-masing kelas.
          </p>
        </div>

        <div className="font-mono text-xs text-[#575551] bg-[#F7F6F2] border border-[#E5E2DC] px-3 py-1.5 rounded-[6px] shrink-0">
          Total Kelas:{" "}
          <strong className="text-[#141413] tabular-nums">
            {formattedClasses.length}
          </strong>{" "}
          • Total Partisipan Aktif:{" "}
          <strong className="text-[#1F513F] tabular-nums">
            {totalActiveStudentsAcrossClasses}
          </strong>
        </div>
      </div>

      <TeacherCreateClassForm />

      <div className="space-y-6">
        {formattedClasses.map((classItem) => (
          <TeacherClassDetailCard key={classItem.id} classItem={classItem} />
        ))}
      </div>
    </div>
  );
}

export default function TeacherClassesPage() {
  return (
    <Suspense
      fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <TeacherClassesContent />
    </Suspense>
  );
}