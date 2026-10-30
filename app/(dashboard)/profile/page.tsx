import { Suspense } from "react";
import { Bell } from "lucide-react";
import { requireAuthenticatedUser } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ProfileSettingsForm,
  MarkNotificationsReadButton,
} from "@/features/profile/profile-settings-form";

async function ProfileAndNotificationsContent() {
  const { userId, email, profile } = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, message, notification_type, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E5E2DC] pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
          ACCOUNT & NOTIFICATIONS
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Pengaturan Profil & Notifikasi Aktivitas
        </h1>
      </div>

      <ProfileSettingsForm
        initialName={profile.full_name}
        email={email}
        role={profile.role}
      />

      {/* Panel Notifikasi In-App */}
      <section className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#1E3A5F]" />
            <h2 className="text-xs font-semibold uppercase font-mono tracking-wider">
              Notifikasi In-App ({unreadCount} Belum Dibaca)
            </h2>
          </div>
          <MarkNotificationsReadButton unreadCount={unreadCount} />
        </div>

        {list.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#63615C]">
            Belum ada notifikasi aktivitas baru.
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-[6px] border text-xs space-y-1 ${
                  n.read_at
                    ? "bg-[#F7F6F2]/50 border-[#E5E2DC] text-[#575551]"
                    : "bg-[#EBF0F5]/40 border-[#1E3A5F]/30 text-[#141413]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#141413]">{n.title}</span>
                  <span className="font-mono text-[10px] text-[#63615C]">
                    {new Date(n.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <ProfileAndNotificationsContent />
    </Suspense>
  );
}