import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export const SUBMISSION_BUCKET = "submission-assets";

export function buildSafeSubmissionStoragePath(params: {
  classId: string;
  assignmentId: string;
  studentId: string;
  versionNumber: number;
  extension: "png" | "jpg" | "webp";
}): string {
  const randomId = crypto.randomUUID();
  return `${params.classId}/${params.assignmentId}/${params.studentId}/v${params.versionNumber}/${randomId}.${params.extension}`;
}

/**
 * Menerbitkan Signed URL sementara (berlaku 60 menit) setelah RLS diverifikasi.
 */
export async function createSignedAssetUrl(
  storagePath: string | null,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!storagePath) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}