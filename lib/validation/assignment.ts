import { z } from "zod";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createAssignmentSchema = z.object({
  classId: z
    .string()
    .trim()
    .regex(uuidRegex, "Pilih kelas tujuan yang valid."),
  rubricVersionId: z
    .string()
    .trim()
    .regex(uuidRegex, "Pilih versi rubrik penilaian yang valid."),
  title: z
    .string()
    .trim()
    .min(3, "Judul tugas minimal 3 karakter."),
  description: z
    .string()
    .trim()
    .min(3, "Deskripsi singkat minimal 3 karakter."),
  learningObjectives: z
    .string()
    .trim()
    .min(3, "Tujuan pembelajaran wajib diisi minimal 3 karakter."),
  designBrief: z
    .string()
    .trim()
    .min(5, "Brief desain wajib diisi minimal 5 karakter."),
  instructions: z.string().optional(),
  designType: z.enum([
    "mobile_app_ui",
    "web_dashboard_ui",
    "wireframe",
    "high_fidelity_mockup",
    "design_system",
    "prototype",
    "ux_flow",
    "other",
  ]),
  targetPlatform: z.string().trim().min(2, "Platform target wajib diisi."),
  targetUser: z.string().optional(),
  allowedSubmissionTypes: z
    .array(z.enum(["image", "figma"]))
    .min(1, "Pilih minimal satu jalur pengumpulan."),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(3),
  deadline: z.string().min(1, "Batas waktu pengumpulan wajib diisi."),
  lateSubmissionPolicy: z.enum(["allow_with_flag", "strict_reject"]),
  showAiScoreBeforeReview: z.boolean().default(false),
  allowRevision: z.boolean().default(true),
  publishImmediately: z.boolean().default(true),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;