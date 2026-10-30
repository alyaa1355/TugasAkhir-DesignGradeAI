"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await loginAction(values);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] grid lg:grid-cols-12">
      {/* Kolom Kiri: Editorial Context (Hidden di Mobile, Tampil di Desktop) */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 border-r border-[#E5E2DC] relative overflow-hidden">
        <BrandMark />

        <div className="max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#EFECE6] border border-[#E5E2DC]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1E3A5F]" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#575551]">
              Rubric-Based Design Critique
            </span>
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.03em] leading-[1.15] text-[#141413]">
            Evaluasi karya antarmuka secara terukur,{" "}
            <span className="font-serif italic font-normal text-[#1E3A5F]">
              bukan sekadar opini bebas.
            </span>
          </h1>

          <p className="text-[15px] leading-relaxed text-[#575551]">
            Ruang kerja kolaboratif bagi guru dan siswa desain UI/UX. Kumpulkan
            artefak Figma atau eksplorasi antarmuka, dapatkan umpan balik awal
            berbasis bukti visual, dan terima penilaian akhir yang terkurasi.
          </p>

          {/* Spesifikasi Rubrik Mini (Visual Artifact) */}
          <div className="pt-4">
            <div className="rounded-[8px] bg-white border border-[#E5E2DC] p-4 shadow-[0_1px_2px_rgba(20,20,19,0.03)] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2.5">
                <span className="font-mono text-[11px] text-[#575551]">
                  SNAPSHOT RUBRIK // MOBILE UI
                </span>
                <span className="font-mono text-[11px] font-medium text-[#1F513F] bg-[#EAF2EE] px-2 py-0.5 rounded-[3px]">
                  BOBOT 100%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-[5px] bg-[#F7F6F2] border border-[#E5E2DC]/60">
                  <p className="text-[#63615C] text-[11px]">Hierarki Visual</p>
                  <p className="font-mono text-sm font-medium text-[#141413] mt-0.5 tabular-nums">
                    25.0%
                  </p>
                </div>
                <div className="p-2.5 rounded-[5px] bg-[#F7F6F2] border border-[#E5E2DC]/60">
                  <p className="text-[#63615C] text-[11px]">Konsistensi Komponen</p>
                  <p className="font-mono text-sm font-medium text-[#141413] mt-0.5 tabular-nums">
                    20.0%
                  </p>
                </div>
                <div className="p-2.5 rounded-[5px] bg-[#F7F6F2] border border-[#E5E2DC]/60">
                  <p className="text-[#63615C] text-[11px]">Kejelasan Alur UX</p>
                  <p className="font-mono text-sm font-medium text-[#141413] mt-0.5 tabular-nums">
                    25.0%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8A8884] font-mono">
          <span>DESIGNGRADE STUDIO</span>
          <span>HUMAN-IN-THE-LOOP GRADING</span>
        </div>
      </div>

      {/* Kolom Kanan: Form Autentikasi */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="lg:hidden mb-6">
            <BrandMark />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#141413]">
              Masuk ke Ruang Kerja
            </h2>
            <p className="text-[13px] text-[#575551] leading-relaxed">
              Gunakan kredensial akun sekolah Anda untuk melanjutkan ke meja
              kurasi atau pengumpulan tugas.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-[6px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-xs text-[#8C2D2D]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-[#141413]"
              >
                Alamat Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@institusi.sch.id"
                autoComplete="email"
                className="h-10 bg-[#F7F6F2]/60 border-[#E5E2DC] text-[13px] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#1E3A5F]"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[11px] text-[#8C2D2D]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-[#141413]"
                >
                  Kata Sandi
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[#575551] hover:text-[#1E3A5F] underline underline-offset-4"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-10 bg-[#F7F6F2]/60 border-[#E5E2DC] text-[13px] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#1E3A5F]"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-[11px] text-[#8C2D2D]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-[13px] font-medium rounded-[6px] transition-colors flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? "Memverifikasi Sesi..." : "Masuk ke Studio"}</span>
              {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </form>

          <div className="pt-4 border-t border-[#E5E2DC] flex items-center justify-between text-xs">
            <span className="text-[#575551]">Siswa baru di kelas desain?</span>
            <Link
              href="/register"
              className="font-medium text-[#1E3A5F] hover:underline underline-offset-4"
            >
              Buat Akun Siswa →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}