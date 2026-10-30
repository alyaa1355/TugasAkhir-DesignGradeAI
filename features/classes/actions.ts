"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";
import { createClassSchema, joinClassSchema } from "@/lib/validation/class";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DG-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createClassAction(input: {
  name: string;
  description?: string;
}) {
  const session = await requireRole(["teacher", "admin"]);
  const parsed = createClassSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data kelas tidak valid.",
    };
  }

  const supabase = await createClient();
  const joinCode = generateJoinCode();

  const { data, error } = await supabase
    .from("classes")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      teacher_id: session.userId,
      join_code: joinCode,
    })
    .select()
    .single();

  if (error) {
    return { error: "Gagal membuat kelas baru. Silakan coba kembali." };
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/classes");
  return { data };
}

export async function joinClassByCodeAction(input: { joinCode: string }) {
  await requireRole(["student"]);
  const parsed = joinClassSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Kode undangan tidak valid.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_class_by_code", {
    p_join_code: parsed.data.joinCode.toUpperCase(),
  });

  if (error) {
    return {
      error:
        error.message ||
        "Gagal bergabung ke kelas. Pastikan kode undangan benar.",
    };
  }

  revalidatePath("/student");
  revalidatePath("/student/classes");
  revalidatePath("/student/assignments");
  revalidatePath("/teacher/classes");
  return { classId: data as string };
}

const updateMemberStatusSchema = z.object({
  memberId: z.string().uuid("ID keanggotaan tidak valid."),
  classId: z.string().uuid("ID kelas tidak valid."),
  status: z.enum(["active", "removed"]),
});

export async function updateClassMemberStatusAction(input: {
  memberId: string;
  classId: string;
  status: "active" | "removed";
}) {
  const session = await requireRole(["teacher", "admin"]);
  const parsed = updateMemberStatusSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Parameter perubahan status siswa tidak valid." };
  }

  const supabase = await createClient();

  // Pastikan kelas ini memang milik guru yang sedang login (atau admin)
  const { data: cls } = await supabase
    .from("classes")
    .select("id, teacher_id")
    .eq("id", parsed.data.classId)
    .single();

  if (
    !cls ||
    (cls.teacher_id !== session.userId && session.profile.role !== "admin")
  ) {
    return {
      error: "FORBIDDEN: Anda tidak berwenang mengubah anggota kelas ini.",
    };
  }

  const { error } = await supabase
    .from("class_members")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.memberId)
    .eq("class_id", parsed.data.classId);

  if (error) {
    return { error: `Gagal memperbarui status siswa: ${error.message}` };
  }

  revalidatePath("/teacher/classes");
  revalidatePath("/student");
  revalidatePath("/student/classes");
  revalidatePath("/student/assignments");

  return { success: true };
}