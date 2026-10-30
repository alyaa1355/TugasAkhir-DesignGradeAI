"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  FileCheck2,
  Users,
  User,
  LogOut,
  Shield,
  SlidersHorizontal,
  Menu,
  ChevronRight,
} from "lucide-react";
import type { Profile } from "@/types/database";
import { logoutAction } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DashboardShellProps {
  profile: Profile;
  email: string;
  children: React.ReactNode;
}

export function DashboardShell({
  profile,
  email,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  const navGroups =
    profile.role === "teacher"
      ? [
          {
            groupLabel: "Ruang Pengajar",
            items: [
              { href: "/teacher", label: "Ikhtisar Studio", icon: LayoutGrid },
              { href: "/teacher/classes", label: "Kelas & Siswa", icon: Users },
              {
                href: "/teacher/assignments",
                label: "Brief & Penugasan",
                icon: FolderKanban,
              },
              {
                href: "/teacher/rubrics",
                label: "Standar Rubrik",
                icon: SlidersHorizontal,
              },
              {
                href: "/teacher/reviews",
                label: "Meja Kurasi & Review",
                icon: FileCheck2,
              },
            ],
          },
        ]
      : profile.role === "admin"
      ? [
          {
            groupLabel: "Administrasi Sistem",
            items: [
              { href: "/admin", label: "Status Operasional", icon: Shield },
              { href: "/admin/users", label: "Akun & Peran", icon: Users },
            ],
          },
        ]
      : [
          {
            groupLabel: "Ruang Belajar",
            items: [
              { href: "/student", label: "Meja Kerja", icon: LayoutGrid },
              {
                href: "/student/assignments",
                label: "Daftar Brief Tugas",
                icon: FolderKanban,
              },
              {
                href: "/student/classes",
                label: "Kelas Diikuti",
                icon: Users,
              },
            ],
          },
        ];

  const roleLabelMap = {
    student: "Student Designer",
    teacher: "Lead Instructor",
    admin: "System Curator",
  } as const;

  const isActiveRoute = (href: string) => {
    if (href === "/student" || href === "/teacher" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const SidebarNavigation = () => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="px-2 pt-1">
          <BrandMark
            href={
              profile.role === "teacher"
                ? "/teacher"
                : profile.role === "admin"
                ? "/admin"
                : "/student"
            }
            showSubtext
          />
        </div>

        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              <p className="px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#8A8884]">
                {group.groupLabel}
              </p>
              <nav className="space-y-0.5" aria-label={group.groupLabel}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-[6px] px-2.5 py-2 text-[13px] font-medium transition-all ${
                        active
                          ? "bg-[#EFECE6] text-[#141413] shadow-[inset_0_0_0_1px_rgba(20,20,19,0.08)]"
                          : "text-[#575551] hover:bg-[#EFECE6]/60 hover:text-[#141413]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            active
                              ? "text-[#1E3A5F]"
                              : "text-[#8A8884] group-hover:text-[#141413]"
                          }`}
                          strokeWidth={active ? 2 : 1.75}
                        />
                        <span>{item.label}</span>
                      </span>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A5F]" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Profil Pengguna */}
      <div className="border-t border-[#E5E2DC] pt-3 space-y-2">
        <div className="px-2 py-1.5 rounded-[6px] bg-[#EFECE6]/50 border border-[#E5E2DC]/80">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-[#141413] truncate">
              {profile.full_name || "Pengguna Studio"}
            </p>
            <span className="shrink-0 font-mono text-[10px] text-[#1E3A5F] bg-[#EBF0F5] px-1.5 py-0.5 rounded-[3px]">
              {profile.role}
            </span>
          </div>
          <p className="text-[11px] text-[#63615C] truncate mt-0.5">{email}</p>
          <p className="font-mono text-[10px] text-[#8A8884] mt-1">
            {roleLabelMap[profile.role]}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Link href="/profile" className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 justify-start gap-2 text-xs font-medium bg-white border-[#E5E2DC] text-[#141413] hover:bg-[#EFECE6]"
            >
              <User className="h-3.5 w-3.5 text-[#575551]" />
              Pengaturan Profil
            </Button>
          </Link>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-white border-[#E5E2DC] text-[#575551] hover:text-[#8C2D2D] hover:bg-[#FBEFEF] hover:border-[#8C2D2D]/30"
              aria-label="Keluar dari sesi"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-[248px] lg:flex-col lg:fixed lg:inset-y-0 px-3.5 py-4 select-none">
        <SidebarNavigation />
      </aside>

      {/* Header Mobile & Tablet */}
      <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E5E2DC] bg-[#F7F6F2]/95 backdrop-blur px-4">
        <BrandMark />
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-[#E5E2DC] bg-white"
                aria-label="Buka navigasi"
              >
                <Menu className="h-4 w-4 text-[#141413]" />
              </Button>
            }
          />
          <SheetContent
            side="left"
            className="w-[260px] bg-[#F7F6F2] border-r border-[#E5E2DC] p-4"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu Navigasi</SheetTitle>
            </SheetHeader>
            <SidebarNavigation />
          </SheetContent>
        </Sheet>
      </header>

      {/* Area Kanvas Utama (Inset Studio Canvas) */}
      <div className="flex-1 lg:pl-[248px] flex flex-col min-h-screen">
        <div className="flex-1 lg:my-2.5 lg:mr-2.5 bg-white lg:rounded-[10px] border-t lg:border border-[#E5E2DC] shadow-[0_1px_2px_rgba(20,20,19,0.03)] flex flex-col">
          {/* Topbar Breadcrumb Kontekstual */}
          <div className="h-12 px-6 border-b border-[#E5E2DC] flex items-center justify-between text-xs text-[#63615C]">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-[#8A8884]">workspace</span>
              <ChevronRight className="h-3 w-3 text-[#8A8884]" />
              <span className="text-[#141413] font-medium">
                {pathname.replace(/^\//, "").replace(/\//g, " / ") || "overview"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1F513F]" />
              <span className="font-mono text-[11px] text-[#575551]">
                Rubric Engine Ready
              </span>
            </div>
          </div>

          {/* Isi Halaman */}
          <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}