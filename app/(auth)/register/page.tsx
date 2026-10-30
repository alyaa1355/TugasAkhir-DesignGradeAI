"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, AlertCircle } from "lucide-react";
import {
  registerStudentSchema,
  type RegisterStudentInput,
} from "@/lib/validation/auth";
import { registerStudentAction } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterStudentInput>({
    resolver: zodResolver(registerStudentSchema),
  });

  async function onSubmit(values: RegisterStudentInput) {
    setServerError(null);
    const result = await registerStudentAction(values);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] grid lg:grid-cols-12">
      {/* Kolom Kiri: Panduan Singkat Alur Siswa */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 border-r border-[#E5E2DC]">
        <BrandMark />

        <div className="max-w-lg space-y-6 my-auto">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2.5 py-1 rounded-[4px]">
            Student Onboarding
          </span>

          <h1 className="text-4xl font-semibold tracking-[-0.03em] leading-[1.15] text-[#141413]">
            Bangun portofolio UI/UX melalui{" "}
            <span className="font-serif italic font-normal text-[#1E3A5F]">
              iterasi yang terarah.
            </span>
          </h1>

          <div className="space-y-4 pt-2 text-[14px] text-[#575551]">
            <div className="flex items-start gap-3.5">
              <span className="font-mono text-xs text-[#141413] bg-white border border-[#E5E2DC] px-2 py-0.5 rounded-[4px]">
                01
              </span>
              <div>
                <p className="font-medium text-[#141413]">
                  Pelajari Brief & Indikator Rubrik
                </p>
                <p className="text-xs text-[#63615C] mt-0.5">
                  Setiap tugas dilengkapi bobot kriteria eksplisit dari guru.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="font-mono text-xs text-[#141413] bg-white border border-[#E5E2DC] px-2 py-0.5 rounded-[4px]">
                02
              </span>
              <div>
                <p className="font-medium text-[#141413]">
                  Unggah Eksplorasi Antarmuka atau Tautan Figma
                </p>
                <p className="text-xs text-[#63615C] mt-0.5">
                  Kirimkan tangkapan layar resolusi penuh beserta referensi frame.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="font-mono text-xs text-[#141413] bg-white border border-[#E5E2DC] px-2 py-0.5 rounded-[4px]">
                03
              </span>
              <div>
                <p className="font-medium text-[#141413]">
                  Terima Evaluasi Terstruktur & Feedback Guru
                </p>
                <p className="text-xs text-[#63615C] mt-0.5">
                  Pahami kekuatan visual dan area perbaikan secara spesifik.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#8A8884] font-mono">
          <span>ROLE DEFAULT: STUDENT</span>
          <span>PRIVILEGE PROTECTED</span>
        </div>
      </div>

      {/* Kolom Kanan: Formulir Pendaftaran */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-16 bg-white">
        <div className="w-full max-w-sm mx-auto space-y-7">
          <div className="lg:hidden mb-4">
            <BrandMark />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#141413]">
              Registrasi Akun Siswa
            </h2>
            <p className="text-[13px] text-[#575551]">
              Lengkapi identitas Anda untuk bergabung ke dalam kelas desain.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
              <Label htmlFor="fullName" className="text-xs font-medium">
                Nama Lengkap Siswa
              </Label>
              <Input
                id="fullName"
                placeholder="Contoh: Alya Rafiah"
                className="h-10 bg-[#F7F6F2]/60 border-[#E5E2DC] text-[13px] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#1E3A5F]"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-[11px] text-[#8C2D2D]">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Alamat Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="alya@siswa.sch.id"
                className="h-10 bg-[#F7F6F2]/60 border-[#E5E2DC] text-[13px] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#1E3A5F]"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[11px] text-[#8C2D2D]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">
                  Kata Sandi
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 karakter"
                  className="h-10 bg-[#F7F6F2]/60 border-[#E5E2DC] text-[13px] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#1E3A5F]"
                  {...register("password")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium">
                  Ulangi Sandi
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Konfirmasi"
                  className="h-10 bg-[#F7F6F2]/60 border-[#E5E2DC] text-[13px] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#1E3A5F]"
                  {...register("confirmPassword")}
                />
              </div>
            </div>
            {(errors.password || errors.confirmPassword) && (
              <p className="text-[11px] text-[#8C2D2D]">
                {errors.password?.message || errors.confirmPassword?.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 mt-2 bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] text-[13px] font-medium rounded-[6px] transition-colors flex items-center justify-center gap-2"
            >
              <span>
                {isSubmitting ? "Membuat Profil..." : "Daftarkan Akun Siswa"}
              </span>
              {!isSubmitting && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </form>

          <div className="pt-4 border-t border-[#E5E2DC] flex items-center justify-between text-xs">
            <span className="text-[#575551]">Sudah memiliki akun?</span>
            <Link
              href="/login"
              className="font-medium text-[#1E3A5F] hover:underline underline-offset-4"
            >
              Masuk ke Studio →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}