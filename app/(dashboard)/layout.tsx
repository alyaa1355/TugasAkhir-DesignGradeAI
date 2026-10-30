import { Suspense } from "react";
import { requireAuthenticatedUser } from "@/lib/permissions/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

async function AuthenticatedDashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, email } = await requireAuthenticatedUser();

  return (
    <DashboardShell profile={profile} email={email}>
      {children}
    </DashboardShell>
  );
}

function StudioWorkspaceSkeleton() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] flex flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-[248px] lg:flex-col px-3.5 py-4 space-y-6">
        <div className="h-8 w-40 rounded-[5px] bg-[#EFECE6] animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 w-full rounded-[6px] bg-[#EFECE6] animate-pulse" />
          <div className="h-8 w-5/6 rounded-[6px] bg-[#EFECE6]/70 animate-pulse" />
          <div className="h-8 w-4/6 rounded-[6px] bg-[#EFECE6]/70 animate-pulse" />
        </div>
      </aside>
      <div className="flex-1 lg:my-2.5 lg:mr-2.5 bg-white lg:rounded-[10px] border border-[#E5E2DC] p-8 space-y-6">
        <div className="h-6 w-48 rounded-[4px] bg-[#EFECE6] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
          <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
          <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
          <div className="h-24 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<StudioWorkspaceSkeleton />}>
      <AuthenticatedDashboardContent>{children}</AuthenticatedDashboardContent>
    </Suspense>
  );
}