import { Suspense } from "react";
import Link from "next/link";
import { Plus, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/permissions/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

async function TeacherRubricsContent() {
  const { userId } = await requireRole(["teacher", "admin"]);
  const supabase = await createClient();

  const { data: rubrics } = await supabase
    .from("rubrics")
    .select(
      `
      id,
      title,
      description,
      created_at,
      rubric_versions(
        id,
        version_number,
        total_weight,
        rubric_criteria(id, name, weight, sort_order)
      )
    `
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const list = rubrics ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
            STANDAR EVALUASI STUDIO
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Daftar Standar Rubrik Penilaian
          </h1>
          <p className="text-xs text-[#575551] mt-1">
            Setiap rubrik yang disimpan memiliki snapshot versi immutable berbobot
            100%.
          </p>
        </div>

        <Link href="/teacher/rubrics/new">
          <Button className="h-9 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Susun Rubrik Baru
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="p-8 rounded-[8px] border border-dashed border-[#E5E2DC] bg-[#F7F6F2]/50 text-center space-y-3">
          <SlidersHorizontal className="h-6 w-6 text-[#1E3A5F] mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#141413]">
              Belum ada standar rubrik tersimpan
            </p>
            <p className="text-xs text-[#575551]">
              Buat rubrik pertama Anda menggunakan template Mobile UI/UX atau dari
              nol.
            </p>
          </div>
          <Link href="/teacher/rubrics/new" className="inline-block pt-1">
            <Button size="sm" className="bg-[#141413] text-[#F7F6F2] text-xs">
              Buat Standar Rubrik Pertama
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {list.map((rubric) => {
            const versions = Array.isArray(rubric.rubric_versions)
              ? rubric.rubric_versions
              : [];
            const latestVersion = versions[0];
            const criteria = (latestVersion?.rubric_criteria ?? []).sort(
              (a: { sort_order: number }, b: { sort_order: number }) =>
                a.sort_order - b.sort_order
            );

            return (
              <div
                key={rubric.id}
                className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E2DC] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#141413]">
                        {rubric.title}
                      </h2>
                      <span className="font-mono text-[10px] font-medium text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[3px]">
                        SNAPSHOT v{latestVersion?.version_number ?? 1}
                      </span>
                    </div>
                    {rubric.description && (
                      <p className="text-xs text-[#575551] mt-1">
                        {rubric.description}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#1F513F] bg-[#EAF2EE] border border-[#1F513F]/20 px-2.5 py-0.5 rounded-[4px]">
                    <CheckCircle2 className="h-3 w-3" />
                    TOTAL {latestVersion?.total_weight ?? 100}%
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {criteria.map(
                    (c: { id: string; name: string; weight: number }) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC] flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-[#141413] truncate pr-2">
                          {c.name}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#1E3A5F] tabular-nums shrink-0">
                          {c.weight}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeacherRubricsPage() {
  return (
    <Suspense
      fallback={<div className="h-48 rounded-[8px] bg-[#EFECE6] animate-pulse" />}
    >
      <TeacherRubricsContent />
    </Suspense>
  );
}