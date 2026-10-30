"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/permissions/auth";

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Nama lengkap minimal 3 karakter.")
    .max(100, "Nama lengkap maksimal 100 karakter."),
});

export async function updateProfileAction(input: { fullName: string }) {
  const session = await requireAuthenticatedUser();
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Nama profil tidak valid.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", session.userId);

  if (error) {
    return { error: "Gagal memperbarui nama profil." };
  }

  revalidatePath("/profile");
  revalidatePath("/student");
  revalidatePath("/teacher");
  revalidatePath("/admin");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const session = await requireAuthenticatedUser();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);

  revalidatePath("/profile");
  revalidatePath("/student");
  return { success: true };
}