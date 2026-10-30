"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";

const updateUserRoleSchema = z.object({
  targetUserId: z.string().uuid("ID pengguna tidak valid."),
  newRole: z.enum(["student", "teacher", "admin"]),
  isActive: z.boolean(),
});

export async function adminUpdateUserRoleAction(input: {
  targetUserId: string;
  newRole: "student" | "teacher" | "admin";
  isActive: boolean;
}) {
  const session = await requireRole(["admin"]);
  const parsed = updateUserRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Parameter perubahan role tidak valid." };
  }

  // Cegah admin menonaktifkan dirinya sendiri secara tidak sengaja
  if (
    parsed.data.targetUserId === session.userId &&
    (!parsed.data.isActive || parsed.data.newRole !== "admin")
  ) {
    return {
      error: "Anda tidak dapat mencabut akses admin dari akun Anda sendiri.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.newRole,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.targetUserId);

  if (error) {
    return { error: `Gagal memperbarui role pengguna: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { success: true };
}