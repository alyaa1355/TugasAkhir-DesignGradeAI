import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import type { UserRole } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedRoute =
    pathname.startsWith("/student") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/profile");

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = siteConfig.routes.login;
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isAuthRoute || isProtectedRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as UserRole) ?? "student";

    const roleHomeMap: Record<UserRole, string> = {
      student: siteConfig.routes.studentDashboard,
      teacher: siteConfig.routes.teacherDashboard,
      admin: siteConfig.routes.adminDashboard,
    };

    // Jika sudah login dan membuka halaman login/register, arahkan ke dashboard sesuai role
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = roleHomeMap[role];
      return NextResponse.redirect(url);
    }

    // Proteksi route lintas role
    if (pathname.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL(roleHomeMap[role], request.url));
    }
    if (pathname.startsWith("/teacher") && role !== "teacher" && role !== "admin") {
      return NextResponse.redirect(new URL(roleHomeMap[role], request.url));
    }
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(roleHomeMap[role], request.url));
    }
  }

  return supabaseResponse;
}