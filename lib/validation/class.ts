import { z } from "zod";

export const createClassSchema = z.object({
  name: z
    .string()
    .min(3, "Nama kelas minimal 3 karakter.")
    .max(80, "Nama kelas maksimal 80 karakter."),
  description: z
    .string()
    .max(300, "Deskripsi kelas maksimal 300 karakter.")
    .optional(),
});

export const joinClassSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .min(5, "Kode undangan kelas minimal 5 karakter.")
    .max(16, "Kode undangan tidak valid."),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type JoinClassInput = z.infer<typeof joinClassSchema>;