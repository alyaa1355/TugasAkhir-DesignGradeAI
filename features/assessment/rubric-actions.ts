"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/permissions/auth";
import {
  createRubricSchema,
  type CreateRubricInput,
} from "@/lib/validation/rubric";

export async function createRubricWithSnapshotAction(input: CreateRubricInput) {
  const session = await requireRole(["teacher", "admin"]);
  const parsed = createRubricSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Konfigurasi rubrik tidak valid.",
    };
  }

  const supabase = await createClient();

  // 1. Buat entitas rubrik utama
  const { data: rubric, error: rubricError } = await supabase
    .from("rubrics")
    .insert({
      owner_id: session.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      is_template: false,
    })
    .select("id")
    .single();

  if (rubricError || !rubric) {
    return {
      error: `Gagal menyimpan rubrik utama: ${
        rubricError?.message ?? "Periksa kebijakan RLS tabel rubrics."
      }`,
    };
  }

  // 2. Buat versi 1 (Immutable Snapshot) dengan total bobot tervalidasi 100.00
  const totalWeight = parsed.data.criteria.reduce((sum, c) => sum + c.weight, 0);

  const { data: version, error: versionError } = await supabase
    .from("rubric_versions")
    .insert({
      rubric_id: rubric.id,
      version_number: 1,
      criteria_snapshot: parsed.data.criteria,
      total_weight: Number(totalWeight.toFixed(2)),
    })
    .select("id")
    .single();

  if (versionError || !version) {
    await supabase.from("rubrics").delete().eq("id", rubric.id);
    return {
      error: `Gagal membuat snapshot versi rubrik: ${
        versionError?.message ?? "Kesalahan database."
      }`,
    };
  }

  // 3. Simpan baris kriteria terstruktur ke rubric_criteria
  const criteriaRows = parsed.data.criteria.map((c, idx) => ({
    rubric_version_id: version.id,
    name: c.name,
    description: c.description,
    weight: c.weight,
    performance_descriptors: c.performance_descriptors,
    assessment_guidance: c.assessment_guidance,
    sort_order: idx + 1,
  }));

  const { error: criteriaError } = await supabase
    .from("rubric_criteria")
    .insert(criteriaRows);

  if (criteriaError) {
    await supabase.from("rubrics").delete().eq("id", rubric.id);
    return {
      error: `Gagal menyimpan rincian kriteria rubrik: ${criteriaError.message}`,
    };
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/rubrics");
  revalidatePath("/teacher/assignments/new");

  return {
    rubricId: rubric.id,
    rubricVersionId: version.id,
  };
}