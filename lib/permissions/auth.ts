import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import type { Profile, UserRole } from "@/types/database";

export async function requireAuthenticatedUser(): Promise<{
  userId: string;
  email: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(siteConfig.routes.login);
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Self-healing: Jika user ada di auth.users namun belum tercatat di tabel profiles
  if (!profile) {
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Siswa Studio";

    const { data: createdProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: fallbackName,
        role: "student",
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError || !createdProfile) {
      console.error("Gagal memuat atau membuat profil pengguna:", insertError?.message);
      redirect("/unauthorized");
    }

    profile = createdProfile;
  }

  if (!profile.is_active) {
    redirect("/unauthorized");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
  };
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuthenticatedUser();
  if (!allowedRoles.includes(session.profile.role)) {
    redirect("/unauthorized");
  }
  return session;
}