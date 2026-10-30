import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/actions";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] flex flex-col justify-between p-6 md:p-12">
      <div>
        <BrandMark />
      </div>

      <div className="max-w-md w-full mx-auto bg-white border border-[#E5E2DC] rounded-[8px] p-6 sm:p-8 space-y-5 shadow-[0_1px_2px_rgba(20,20,19,0.03)]">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#FBEFEF] border border-[#8C2D2D]/25 text-[#8C2D2D]">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider">
            HTTP 403 // AKSES DIBATASI
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">
            Otorisasi Ruang Kerja Tidak Memadai
          </h1>
          <p className="text-xs leading-relaxed text-[#575551]">
            Akun Anda belum memiliki profil aktif di database atau tidak memiliki
            hak akses (role) untuk membuka halaman ini. Pastikan migrasi SQL
            Supabase telah dijalankan.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-9 text-xs bg-white border-[#E5E2DC] text-[#141413] hover:bg-[#EFECE6] gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Halaman Utama
            </Button>
          </Link>

          <form action={logoutAction} className="flex-1">
            <Button
              type="submit"
              className="w-full h-9 text-xs bg-[#141413] hover:bg-[#8C2D2D] text-[#F7F6F2] gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar & Login Ulang
            </Button>
          </form>
        </div>
      </div>

      <div className="text-center font-mono text-[11px] text-[#8A8884]">
        DESIGNGRADE STUDIO — SECURITY GUARD
      </div>
    </div>
  );
}