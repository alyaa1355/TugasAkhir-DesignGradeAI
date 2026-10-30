"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerStudentSchema } from "@/lib/validation/auth";
import { siteConfig } from "@/config/site";
import type { UserRole } from "@/types/database";

export async function loginAction(formData: {
  email: string;
  password: string;
}) {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      error: "Email atau password salah. Silakan periksa kembali kredensial Anda.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "student";
  const destinationMap: Record<UserRole, string> = {
    student: siteConfig.routes.studentDashboard,
    teacher: siteConfig.routes.teacherDashboard,
    admin: siteConfig.routes.adminDashboard,
  };

  redirect(destinationMap[role]);
}

export async function registerStudentAction(formData: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const parsed = registerStudentSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return {
      error: error.message || "Gagal mendaftarkan akun. Silakan coba lagi.",
    };
  }

  redirect(siteConfig.routes.studentDashboard);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(siteConfig.routes.login);
}