import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  SlidersHorizontal,
  Layers,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/database";

async function resolveUserDashboardUrl(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole) ?? "student";
  return role === "teacher"
    ? siteConfig.routes.teacherDashboard
    : role === "admin"
    ? siteConfig.routes.adminDashboard
    : siteConfig.routes.studentDashboard;
}

async function HeaderAuthCta() {
  const dashboardUrl = await resolveUserDashboardUrl();

  if (dashboardUrl) {
    return (
      <Link href={dashboardUrl}>
        <Button className="h-9 px-4 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs font-medium rounded-[6px] gap-2">
          <span>Buka Ruang Kerja</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/login">
        <Button
          variant="outline"
          className="h-9 px-3.5 bg-white border-[#E5E2DC] text-[#141413] hover:bg-[#EFECE6] text-xs font-medium rounded-[6px]"
        >
          Masuk
        </Button>
      </Link>
      <Link href="/register">
        <Button className="h-9 px-4 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-xs font-medium rounded-[6px]">
          Daftar Siswa
        </Button>
      </Link>
    </>
  );
}

async function HeroAuthCta() {
  const dashboardUrl = await resolveUserDashboardUrl();

  if (dashboardUrl) {
    return (
      <Link href={dashboardUrl}>
        <Button className="h-11 px-6 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-[13px] font-medium rounded-[6px] gap-2">
          <span>Lanjutkan ke Dashboard Anda</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/register">
        <Button className="h-11 px-6 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-[13px] font-medium rounded-[6px] gap-2">
          <span>Mulai Sebagai Siswa</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <Link href="/login">
        <Button
          variant="outline"
          className="h-11 px-5 bg-white border-[#E5E2DC] text-[#141413] hover:bg-[#EFECE6] text-[13px] font-medium rounded-[6px]"
        >
          Masuk Akun Pengajar / Siswa
        </Button>
      </Link>
    </>
  );
}

export default function LandingPage() {
  const workflowSteps = [
    {
      step: "01",
      title: "Penyusunan Brief & Snapshot Rubrik",
      desc: "Guru merancang tujuan pembelajaran, brief konteks produk, serta mengunci indikator rubrik berbobot 100%.",
    },
    {
      step: "02",
      title: "Eksplorasi & Pengumpulan Artefak",
      desc: "Siswa merancang antarmuka di Figma, lalu mengumpulkan tangkapan layar resolusi penuh beserta tautan kerja.",
    },
    {
      step: "03",
      title: "Evaluasi Awal Berbasis Bukti Visual",
      desc: "Asisten AI memeriksa elemen visual yang tampak terhadap indikator rubrik dan menyusun saran perbaikan awal.",
    },
    {
      step: "04",
      title: "Verifikasi & Pengesahan Guru",
      desc: "Guru meninjau hasil analisis, mengoreksi skor per kriteria, menambahkan catatan pedagogis, dan menerbitkan nilai final.",
    },
  ];

  const faqs = [
    {
      q: "Apakah AI menentukan nilai akhir siswa secara otomatis?",
      a: "Tidak. AI hanya menyediakan evaluasi awal berbasis rubrik untuk mempercepat umpan balik formatif. Seluruh nilai final wajib diperiksa, dikoreksi jika perlu, dan disahkan oleh guru pengampu.",
    },
    {
      q: "Bagaimana jika suatu kriteria tidak dapat dinilai dari tangkapan layar?",
      a: "Apabila suatu kriteria membutuhkan pengujian interaksi langsung atau struktur layer internal yang tidak tampak pada gambar, sistem menandainya sebagai memerlukan bukti tambahan (insufficient evidence), bukan memberikan skor nol secara sepihak.",
    },
    {
      q: "Apakah perubahan rubrik oleh guru akan mengubah nilai tugas lama?",
      a: "Tidak. Setiap tugas yang diterbitkan mengunci snapshot versi rubrik yang bersifat immutable, sehingga riwayat penilaian lama tetap konsisten dengan standar saat karya dikumpulkan.",
    },
    {
      q: "Apakah karya desain siswa dapat dilihat oleh publik atau siswa lain?",
      a: "Tidak. Berkas desain disimpan pada penyimpanan privat dengan akses terotorisasi (signed URL berbatas waktu) yang hanya dapat dibuka oleh siswa pemilik karya dan guru pengampu kelas.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] flex flex-col">
      {/* 1. Navigasi Atas */}
      <header className="sticky top-0 z-30 border-b border-[#E5E2DC] bg-[#F7F6F2]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandMark showSubtext />
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#575551]">
            <a href="#workflow" className="hover:text-[#141413] transition-colors">
              Alur Kerja
            </a>
            <a href="#rubric" className="hover:text-[#141413] transition-colors">
              Metodologi Rubrik
            </a>
            <a href="#features" className="hover:text-[#141413] transition-colors">
              Fitur Peran
            </a>
            <a href="#faq" className="hover:text-[#141413] transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Suspense
              fallback={
                <div className="h-9 w-36 rounded-[6px] bg-[#EFECE6] animate-pulse" />
              }
            >
              <HeaderAuthCta />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Hero Section & Fungsi Utama */}
        <section className="border-b border-[#E5E2DC] py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#EFECE6] border border-[#E5E2DC]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A5F]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#575551]">
                  Platform Kurasi & Evaluasi Pembelajaran UI/UX
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.12] text-[#141413]">
                Penilaian tugas desain yang berpihak pada{" "}
                <span className="font-serif italic font-normal text-[#1E3A5F]">
                  kejelasan rubrik & proses belajar.
                </span>
              </h1>

              <p className="text-[16px] leading-relaxed text-[#575551] max-w-2xl">
                DesignGrade membantu guru mengelola penugasan UI/UX, memberikan
                umpan balik awal berbasis bukti visual melalui dukungan AI, dan
                menjaga keputusan penilaian akhir sepenuhnya di tangan pengajar.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Suspense
                  fallback={
                    <div className="h-11 w-48 rounded-[6px] bg-[#EFECE6] animate-pulse" />
                  }
                >
                  <HeroAuthCta />
                </Suspense>
              </div>
            </div>

            {/* Spesifikasi Visual Kartu Inspeksi Rubrik */}
            <div className="lg:col-span-5">
              <div className="rounded-[10px] bg-white border border-[#E5E2DC] p-5 shadow-[0_2px_8px_rgba(20,20,19,0.04)] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A8884]">
                      CONTOH LEMBAR EVALUASI KRITERIA
                    </p>
                    <p className="text-sm font-semibold text-[#141413] mt-0.5">
                      Eksplorasi Mobile Checkout Flow
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-medium text-[#784916] bg-[#FDF6EC] border border-[#784916]/20 px-2 py-0.5 rounded-[4px]">
                    PROVISIONAL AI REVIEW
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#141413]">
                        1. Hierarki Visual & Layout (Bobot 20%)
                      </span>
                      <span className="font-mono font-semibold text-[#141413] tabular-nums">
                        84 / 100
                      </span>
                    </div>
                    <p className="text-[#575551] leading-relaxed">
                      <strong className="text-[#141413]">Bukti Teramati:</strong>{" "}
                      Tombol aksi utama memiliki kontras tinggi di area bawah viewport,
                      namun jarak antar-kartu alamat masih bervariasi (8px vs 16px).
                    </p>
                  </div>

                  <div className="p-3 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#141413]">
                        2. Tipografi & Keterbacaan (Bobot 15%)
                      </span>
                      <span className="font-mono font-semibold text-[#141413] tabular-nums">
                        88 / 100
                      </span>
                    </div>
                    <p className="text-[#575551] leading-relaxed">
                      <strong className="text-[#141413]">Saran Perbaikan:</strong>{" "}
                      Naikkan ukuran teks label sekunder dari 10px ke minimal 12px
                      agar nyaman dibaca pada layar mobile.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E2DC] flex items-center justify-between text-[11px] text-[#63615C]">
                  <span className="font-mono">STATUS: MENUNGGU VALIDASI GURU</span>
                  <span className="font-mono text-[#1E3A5F] font-medium">
                    HUMAN-VERIFIED WORKFLOW
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Gambaran Workflow Pengumpulan & Evaluasi */}
        <section id="workflow" className="border-b border-[#E5E2DC] py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
                01 // ALUR KERJA TERSTRUKTUR
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
                Dari penyusunan brief hingga pengesahan nilai akhir
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {workflowSteps.map((item) => (
                <div
                  key={item.step}
                  className="p-5 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <span className="inline-block font-mono text-xs font-medium text-[#1E3A5F] bg-[#EBF0F5] px-2 py-0.5 rounded-[4px]">
                      TAHAP {item.step}
                    </span>
                    <h3 className="text-[15px] font-semibold text-[#141413]">
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#575551]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Pendekatan Penilaian Berbasis Rubrik & Peran AI */}
        <section id="rubric" className="border-b border-[#E5E2DC] py-16">
          <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6 space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
                02 // PENDEKATAN BERBASIS RUBRIK
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
                Kriteria terukur dengan kendali penuh di tangan guru
              </h2>
              <p className="text-sm leading-relaxed text-[#575551]">
                Berbeda dari komentar estetika umum yang membingungkan siswa,
                DesignGrade mewajibkan setiap analisis merujuk pada deskriptor
                performa, bobot kriteria, dan tujuan pembelajaran yang ditetapkan
                guru.
              </p>
              <ul className="space-y-2.5 pt-2 text-xs text-[#141413]">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1F513F] shrink-0 mt-0.5" />
                  <span>
                    <strong>Perhitungan Skor di Server:</strong> Nilai berbobot
                    dihitung secara matematis di server berdasarkan bobot rubrik
                    resmi, bukan mengandalkan penjumlahan bebas dari model bahasa.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1F513F] shrink-0 mt-0.5" />
                  <span>
                    <strong>Transparansi Bukti Visual:</strong> Memisahkan fakta
                    visual yang terlihat pada gambar dari asumsi interaksi yang
                    belum diuji.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#1F513F] shrink-0 mt-0.5" />
                  <span>
                    <strong>Audit & Riwayat Koreksi:</strong> Guru dapat mengubah
                    skor kriteria mana pun sebelum menerbitkan nilai final kepada
                    siswa.
                  </span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 p-6 rounded-[8px] bg-white border border-[#E5E2DC] space-y-4">
              <div className="flex items-center gap-2.5 text-[#1E3A5F]">
                <UserCheck className="h-5 w-5" />
                <h3 className="text-base font-semibold text-[#141413]">
                  Prinsip Utama: AI Membantu Guru, Bukan Menggantikan Guru
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-[#575551]">
                Dalam pembelajaran desain antarmuka, konteks kelas, empati pengguna,
                dan perkembangan individu siswa hanya dapat dipahami secara utuh
                oleh pendidik. Oleh karena itu:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC]">
                  <p className="font-semibold text-[#141413] mb-1">
                    Peran Asisten AI
                  </p>
                  <p className="text-[#575551] leading-relaxed">
                    Memeriksa kelengkapan elemen visual terhadap brief dan menyiapkan
                    draf umpan balik awal per kriteria rubrik.
                  </p>
                </div>
                <div className="p-3.5 rounded-[6px] bg-[#F7F6F2] border border-[#E5E2DC]">
                  <p className="font-semibold text-[#141413] mb-1">
                    Keputusan Profesional Guru
                  </p>
                  <p className="text-[#575551] leading-relaxed">
                    Meninjau kelayakan saran, menyesuaikan skor kriteria, meminta
                    revisi karya, dan mengesahkan nilai akhir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Fitur Utama untuk Guru & Siswa */}
        <section id="features" className="border-b border-[#E5E2DC] py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
                03 // FITUR PERAN
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">
                Dirancang khusus untuk kebutuhan studio kelas desain
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[#1E3A5F] bg-[#EBF0F5] px-2.5 py-1 rounded-[4px]">
                    UNTUK GURU & INSTRUKTUR
                  </span>
                  <SlidersHorizontal className="h-4 w-4 text-[#575551]" />
                </div>
                <h3 className="text-lg font-semibold">
                  Manajemen Penugasan, Rubrik & Meja Review
                </h3>
                <ul className="space-y-2 text-xs text-[#575551]">
                  <li>• Pembuatan kelas dengan kode undangan unik.</li>
                  <li>• Rubric builder berbobot 100% dengan deskriptor performa & snapshot versi.</li>
                  <li>• Pengaturan visibilitas skor AI sebelum verifikasi guru.</li>
                  <li>• Panel perbandingan skor AI vs koreksi manual guru beserta log audit.</li>
                  <li>• Ekspor laporan nilai kelas ke format CSV.</li>
                </ul>
              </div>

              <div className="p-6 rounded-[8px] bg-[#F7F6F2] border border-[#E5E2DC] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[#1F513F] bg-[#EAF2EE] px-2.5 py-1 rounded-[4px]">
                    UNTUK SISWA DESAIN
                  </span>
                  <Layers className="h-4 w-4 text-[#575551]" />
                </div>
                <h3 className="text-lg font-semibold">
                  Pengumpulan Multi-Versi & Umpan Balik yang Dapat Ditindaklanjuti
                </h3>
                <ul className="space-y-2 text-xs text-[#575551]">
                  <li>• Baca brief desain, target pengguna, dan indikator penilaian secara transparan.</li>
                  <li>• Unggah gambar desain (PNG, JPG, WebP) atau kirim tautan Figma beserta bukti visual.</li>
                  <li>• Pantau status pemrosesan dan riwayat versi revisi karya dari perangkat mobile maupun desktop.</li>
                  <li>• Pelajari kekuatan visual serta rekomendasi perbaikan spesifik per kriteria.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="border-b border-[#E5E2DC] py-16">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F]">
                04 // PERTANYAAN UMUM
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                Pertanyaan yang sering diajukan
              </h2>
            </div>

            <div className="grid gap-4">
              {faqs.map((item) => (
                <div
                  key={item.q}
                  className="p-5 rounded-[8px] bg-white border border-[#E5E2DC] space-y-2"
                >
                  <h3 className="text-sm font-semibold text-[#141413]">
                    {item.q}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#575551]">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#63615C]">
          <BrandMark />
          <p className="font-mono text-[11px]">
            {siteConfig.fullName} — Educational UI/UX Assessment Platform
          </p>
        </div>
      </footer>
    </div>
  );
}