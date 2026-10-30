import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] flex flex-col justify-between p-6 md:p-12">
      <div>
        <BrandMark />
      </div>

      <div className="max-w-md w-full mx-auto bg-white border border-[#E5E2DC] rounded-[8px] p-6 sm:p-8 space-y-5">
        <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F] bg-[#EBF0F5] px-2.5 py-1 rounded-[4px]">
          HTTP 404 // HALAMAN TIDAK DITEMUKAN
        </span>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">
            Artefak atau Halaman Tidak Tersedia
          </h1>
          <p className="text-xs leading-relaxed text-[#575551]">
            Tautan yang Anda tuju mungkin telah dipindahkan, dihapus, atau alamat
            URL tidak sesuai.
          </p>
        </div>

        <Link href="/" className="block pt-1">
          <Button className="w-full h-9 text-xs bg-[#141413] hover:bg-[#1E3A5F] text-[#F7F6F2] gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Beranda Studio
          </Button>
        </Link>
      </div>

      <div className="text-center font-mono text-[11px] text-[#8A8884]">
        DESIGNGRADE STUDIO
      </div>
    </div>
  );
}