import Link from "next/link";
import { siteConfig } from "@/config/site";

interface BrandMarkProps {
  href?: string;
  showSubtext?: boolean;
}

export function BrandMark({
  href = "/",
  showSubtext = false,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 focus:outline-none"
    >
      {/* Bespoke Architectural Grid + Frame SVG Mark */}
      <div className="relative flex h-7 w-7 items-center justify-center rounded-[5px] border border-[#141413]/15 bg-[#141413] text-[#F7F6F2] transition-colors group-hover:bg-[#1E3A5F] group-hover:border-[#1E3A5F]">
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Artboard Outer Frame */}
          <rect
            x="2"
            y="2"
            width="12"
            height="12"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          {/* Golden Ratio / Layout Split Line */}
          <line
            x1="6.5"
            y1="2"
            x2="6.5"
            y2="14"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <line
            x1="6.5"
            y1="7.5"
            x2="14"
            y2="7.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          {/* Precision Focal Dot */}
          <circle cx="10.25" cy="10.75" r="1.25" fill="currentColor" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#141413]">
            {siteConfig.name}
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#1E3A5F] bg-[#EBF0F5] px-1.5 py-0.5 rounded-[3px]">
            Studio
          </span>
        </div>
        {showSubtext && (
          <span className="text-[11px] text-[#63615C] leading-none mt-0.5">
            UI/UX Critique & Grading
          </span>
        )}
      </div>
    </Link>
  );
}