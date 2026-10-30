import { Suspense } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  FolderKanban,
  Sparkles,
  AlertTriangle,
  History,
} from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";

async function AdminDashboardContent() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const env = getServerEnv();

  // Hanya memeriksa apakah API key terkonfigurasi, TIDAK PERNAH menampilkan nilai key
  const isGeminiKeyConfigured = Boolean(
    env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "your-gemini-api-key-here"
  );

  const [
    usersCountRes,
    classesCountRes,
    activeAssignCountRes,
    subsCountRes,
    aiCompletedRes,
    aiFailedRes,
    recentAuditsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("classes").select("id", { count: "exact", head: true }),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .neq("status", "draft"),
    supabase
      .from("ai_assessments")
      .select("id", { count: "exact", head: true })
      .in("status", ["completed", "incomplete_evidence"]),
    supabase
      .from("ai_assessments")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("assessment_audit_logs")
      .select("id, action, reason, created_at, profiles:actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            SYSTEM ADMINISTRATION & AUDIT
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Status Operasional & Pemantauan Sistem
          </h1>
        </div>

        <Link href="/admin/users">
          <Button className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Kelola Akun & Role Pengguna
          </Button>
        </Link>
      </div>

      {/* Ringkasan Entitas Sistem */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <span className="text-xs text-[#575551] block">Total Pengguna</span>
          <span className="font-mono text-2xl font-semibold mt-1 block tabular-nums">
            {usersCountRes.count ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <span className="text-xs text-[#575551] block">Jumlah Kelas</span>
          <span className="font-mono text-2xl font-semibold mt-1 block tabular-nums">
            {classesCountRes.count ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <span className="text-xs text-[#575551] block">Tugas Aktif</span>
          <span className="font-mono text-2xl font-semibold mt-1 block tabular-nums">
            {activeAssignCountRes.count ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-[8px] border border-[#E5E2DC] bg-white">
          <span className="text-xs text-[#575551] block">
            Submission Terkumpul
          </span>
          <span className="font-mono text-2xl font-semibold mt-1 block tabular-nums">
            {subsCountRes.count ?? 0}
          </span>
        </div>
      </div>

      {/* Status Layanan AI & Statistik Kegagalan */}
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 p-5 rounded-[8px] border border-[#E5E2DC] bg-[#F7F6F2]/70 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E2DC] pb-3">
            <Sparkles className="h-4 w-4 text-[#1E3A5F]" />
            <h2 className="text-xs font-semibold uppercase font-mono tracking-wider">
              Status Layanan AI & Konfigurasi Non-Rahasia
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-[5px] bg-white border border-[#E5E2DC]">
              <span className="text-[#575551]">Model Vision Aktif</span>
              <span className="font-mono font-semibold text-[#141413]">
                {env.GEMINI_MODEL}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[5px] bg-white border border-[#E5E2DC]">
              <span className="text-[#575551]">Status Kredensial Server</span>
              <span
                className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded-[3px] ${
                  isGeminiKeyConfigured
                    ? "bg-[#EAF2EE] text-[#1F513F]"
                    : "bg-[#FDF6EC] text-[#784916]"
                }`}
              >
                {isGeminiKeyConfigured ? "TERKONFIGURASI" : "BELUM DIISI"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[5px] bg-white border border-[#E5E2DC]">
              <span className="text-[#575551]">Assessment AI Berhasil</span>
              <span className="font-mono font-semibold text-[#1F513F] tabular-nums">
                {aiCompletedRes.count ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[5px] bg-white border border-[#E5E2DC]">
              <span className="text-[#575551]">Kegagalan Assessment AI</span>
              <span className="font-mono font-semibold text-[#8C2D2D] tabular-nums">
                {aiFailedRes.count ?? 0}
              </span>
            </div>
          </div>
        </section>

        {/* Audit Log Sistem */}
        <section className="lg:col-span-7 p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E2DC] pb-3">
            <History className="h-4 w-4 text-[#1E3A5F]" />
            <h2 className="text-xs font-semibold uppercase font-mono tracking-wider">
              Audit Log Penilaian Terbaru
            </h2>
          </div>

          {(recentAuditsRes.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-[#63615C]">
              Belum ada aktivitas audit perubahan nilai yang tercatat.
            </p>
          ) : (
            <div className="space-y-2">
              {(recentAuditsRes.data ?? []).map((log) => {
                const actor = Array.isArray(log.profiles)
                  ? log.profiles[0]
                  : log.profiles;
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-semibold uppercase text-[#1E3A5F] mr-2">
                        [{log.action}]
                      </span>
                      <span className="font-medium text-[#141413]">
                        {actor?.full_name ?? "Pengguna"}
                      </span>
                      {log.reason && (
                        <p className="text-[11px] text-[#575551] mt-0.5">
                          {log.reason}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-[#63615C] shrink-0">
                      {new Date(log.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <AdminDashboardContent />
    </Suspense>
  );
}