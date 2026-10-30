import { z } from "zod";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const ALLOWED_FIGMA_HOSTS = new Set(["figma.com", "www.figma.com"]);
const ALLOWED_FIGMA_PATH_PREFIXES = [
  "/file/",
  "/design/",
  "/proto/",
  "/board/",
];

/**
 * Memvalidasi URL Figma menggunakan URL parser resmi dan allowlist domain/path.
 * Mencegah SSRF atau penyisipan URL berbahaya.
 */
export function isValidFigmaUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return false;
    if (!ALLOWED_FIGMA_HOSTS.has(parsed.hostname.toLowerCase())) return false;

    const hasValidPrefix = ALLOWED_FIGMA_PATH_PREFIXES.some((prefix) =>
      parsed.pathname.startsWith(prefix)
    );
    return hasValidPrefix && parsed.pathname.length > 10;
  } catch {
    return false;
  }
}

export const submissionMetadataSchema = z.object({
  assignmentId: z.string().uuid("ID tugas tidak valid."),
  submissionMode: z.enum(["image", "figma"]),
  figmaUrl: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || isValidFigmaUrl(val), {
      message:
        "Tautan harus berupa URL HTTPS Figma yang valid (contoh: https://www.figma.com/design/...).",
    }),
  figmaArtifactType: z
    .enum(["design_file", "interactive_prototype", "wireframe_board"])
    .optional(),
  submissionNote: z
    .string()
    .max(1000, "Catatan siswa maksimal 1000 karakter.")
    .optional(),
  intent: z.enum(["save_draft", "submit_final"]),
});

/**
 * Memeriksa header biner (magic bytes) di server agar ekstensi palsu ditolak.
 */
export function verifyImageMagicBytes(
  buffer: Uint8Array,
  declaredMime: string
): { valid: boolean; detectedExt: "png" | "jpg" | "webp" | null } {
  if (buffer.byteLength < 12) {
    return { valid: false, detectedExt: null };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;

  if (isPng && declaredMime === "image/png") {
    return { valid: true, detectedExt: "png" };
  }

  // JPEG: FF D8 FF
  const isJpeg =
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  if (isJpeg && declaredMime === "image/jpeg") {
    return { valid: true, detectedExt: "jpg" };
  }

  // WebP: "RIFF" (52 49 46 46) di byte 0..3 dan "WEBP" (57 45 42 50) di byte 8..11
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  if (isWebp && declaredMime === "image/webp") {
    return { valid: true, detectedExt: "webp" };
  }

  return { valid: false, detectedExt: null };
}