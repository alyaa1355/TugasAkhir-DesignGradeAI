import { z } from "zod";

export const performanceDescriptorsSchema = z.object({
  excellent: z.string().min(3, "Indikator level Sangat Baik wajib diisi."),
  good: z.string().min(3, "Indikator level Baik wajib diisi."),
  fair: z.string().min(3, "Indikator level Cukup wajib diisi."),
  needs_improvement: z
    .string()
    .min(3, "Indikator level Perlu Perbaikan wajib diisi."),
});

export const rubricCriterionInputSchema = z.object({
  name: z.string().min(2, "Nama kriteria wajib diisi."),
  description: z.string().min(5, "Deskripsi kriteria wajib diisi."),
  weight: z.coerce
    .number()
    .positive("Bobot kriteria harus lebih dari 0%.")
    .max(100, "Bobot kriteria maksimal 100%."),
  performance_descriptors: performanceDescriptorsSchema,
  assessment_guidance: z
    .string()
    .min(5, "Panduan bukti visual / instruksi AI wajib diisi."),
});

export const createRubricSchema = z
  .object({
    title: z.string().min(3, "Judul rubrik minimal 3 karakter."),
    description: z.string().optional(),
    criteria: z
      .array(rubricCriterionInputSchema)
      .min(1, "Rubrik wajib memiliki minimal 1 kriteria."),
  })
  .refine(
    (data) => {
      const total = data.criteria.reduce((acc, item) => acc + item.weight, 0);
      return Math.abs(total - 100) < 0.01;
    },
    {
      message: "Total bobot seluruh kriteria harus berjumlah tepat 100%.",
      path: ["criteria"],
    }
  );

export type CreateRubricInput = z.infer<typeof createRubricSchema>;

export const DEFAULT_MOBILE_UI_RUBRIC_TEMPLATE: CreateRubricInput = {
  title: "Standar Rubrik Mobile App UI/UX",
  description:
    "Evaluasi antarmuka aplikasi mobile mencakup hierarki visual, tipografi, kontras warna, konsistensi komponen, kejelasan alur, dan kesesuaian brief.",
  criteria: [
    {
      name: "Hierarki Visual dan Layout",
      description:
        "Kejelasan titik fokus utama, pengelompokan elemen informasi, dan keseimbangan spasi antar-bagian.",
      weight: 20,
      performance_descriptors: {
        excellent:
          "Titik fokus langsung terlihat jelas, grid dan spacing konsisten di seluruh layar.",
        good: "Hierarki utama jelas, terdapat sedikit ketidakkonsistenan padding minor.",
        fair: "Elemen saling bersaing mendapatkan perhatian, pengelompokan kurang tegas.",
        needs_improvement:
          "Layout padat без struktur grid yang jelas dan menyulitkan pemindaian visual.",
      },
      assessment_guidance:
        "Periksa ukuran relatif heading vs body text, penempatan CTA utama, dan konsistensi margin/padding antar-kartu.",
    },
    {
      name: "Tipografi dan Keterbacaan",
      description:
        "Pemilihan skala ukuran huruf, tinggi baris (line-height), dan keterbacaan pada ukuran layar mobile.",
      weight: 15,
      performance_descriptors: {
        excellent:
          "Skala tipografi harmonis, teks sangat nyaman dibaca tanpa teks terlalu kecil.",
        good: "Keterbacaan baik secara keseluruhan dengan variasi bobot font yang tepat.",
        fair: "Beberapa label sekunder terlalu kecil atau terlalu rapat.",
        needs_improvement:
          "Banyak teks sulit dibaca, terlalu banyak variasi font yang mengganggu.",
      },
      assessment_guidance:
        "Amati proporsi ukuran judul, subjudul, isi, serta kepadatan teks dalam satu baris.",
    },
    {
      name: "Warna dan Kontras",
      description:
        "Penggunaan palet warna terukur, penekanan status/aksi, serta kontras teks terhadap latar belakang.",
      weight: 15,
      performance_descriptors: {
        excellent:
          "Warna aksen digunakan secara terukur untuk aksi penting, kontras teks sangat jelas.",
        good: "Palet warna rapi dan kontras memadai pada sebagian besar elemen.",
        fair: "Terdapat teks dengan kontras rendah di atas latar berwarna atau gambar.",
        needs_improvement:
          "Warna bertabrakan dan menyulitkan pembacaan informasi utama.",
      },
      assessment_guidance:
        "Periksa keterbacaan teks pada tombol, badge, dan kartu terhadap warna latar belakangnya.",
    },
    {
      name: "Konsistensi Komponen",
      description:
        "Keseragaman gaya tombol, ikon, radius sudut, border, dan kartu di seluruh frame.",
      weight: 15,
      performance_descriptors: {
        excellent:
          "Seluruh komponen mengikuti sistem desain yang seragam (radius, ikon, ukuran tombol).",
        good: "Komponen utama konsisten, hanya ada perbedaan kecil pada elemen pendukung.",
        fair: "Gaya tombol atau kartu berubah-ubah tanpa alasan fungsional.",
        needs_improvement:
          "Tidak tampak adanya pola komponen yang konsisten.",
      },
      assessment_guidance:
        "Bandingkan bentuk tombol, gaya ikon (outline vs solid), dan border-radius antar-komponen.",
    },
    {
      name: "Usability dan Kejelasan Alur",
      description:
        "Kemudahan pengguna memahami status layar, navigasi, dan langkah tindakan berikutnya.",
      weight: 20,
      performance_descriptors: {
        excellent:
          "Alur tugas sangat intuitif, label tindakan eksplisit, dan navigasi mudah dipahami.",
        good: "Pengguna dapat memahami langkah utama dengan mudah.",
        fair: "Beberapa tombol atau ikon tidak memiliki label yang jelas maknanya.",
        needs_improvement:
          "Membingungkan pengguna harus menekan apa untuk menyelesaikan tugas.",
      },
      assessment_guidance:
        "Periksa kejelasan label CTA, penanda lokasi navigasi aktif, dan kelengkapan informasi input.",
    },
    {
      name: "Kesesuaian dengan Brief",
      description:
        "Pemenuhan seluruh fitur wajib, target pengguna, dan skenario yang diminta pada brief tugas.",
      weight: 15,
      performance_descriptors: {
        excellent:
          "Menjawab seluruh kebutuhan brief dan tujuan pembelajaran secara lengkap.",
        good: "Memenuhi sebagian besar permintaan brief dengan relevan.",
        fair: "Beberapa elemen wajib pada brief belum disertakan pada layar.",
        needs_improvement:
          "Desain melenceng dari konteks brief yang ditugaskan.",
      },
      assessment_guidance:
        "Cocokkan elemen yang tampil pada layar dengan daftar kebutuhan pada brief tugas.",
    },
  ],
};