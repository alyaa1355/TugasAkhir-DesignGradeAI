import { Suspense } from "react";
import { requireRole } from "@/lib/permissions/auth";
import { RubricBuilderForm } from "@/features/assessment/rubric-builder-form";

async function NewRubricContent() {
  await requireRole(["teacher", "admin"]);
  return (
    <div className="space-y-6">
      <div className="border-b border-[#E5E2DC] pb-5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
          RUBRIC ARCHITECT
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
          Susun Standar Rubrik Penilaian Baru
        </h1>
      </div>
      <RubricBuilderForm />
    </div>
  );
}

export default function NewRubricPage() {
  return (
    <Suspense fallback={<div className="h-64 rounded-[8px] bg-[#EFECE6] animate-pulse" />}>
      <NewRubricContent />
    </Suspense>
  );
}