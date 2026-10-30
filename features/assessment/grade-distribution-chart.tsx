"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface GradeBucket {
  range: string;
  label: string;
  count: number;
}

interface GradeDistributionChartProps {
  buckets: GradeBucket[];
  totalGraded: number;
  averageScore: number | null;
}

export function GradeDistributionChart({
  buckets,
  totalGraded,
  averageScore,
}: GradeDistributionChartProps) {
  return (
    <div className="p-5 rounded-[8px] border border-[#E5E2DC] bg-white space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E2DC] pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#1E3A5F]">
            ANALYTICS // REAL DATABASE METRICS
          </p>
          <h2 className="text-sm font-semibold text-[#141413] mt-0.5">
            Distribusi Nilai Karya Desain Siswa
          </h2>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="px-2.5 py-1 rounded-[4px] bg-[#F7F6F2] border border-[#E5E2DC]">
            <span className="text-[#63615C] mr-1.5">TERVERIFIKASI:</span>
            <span className="font-semibold text-[#141413] tabular-nums">
              {totalGraded} Karya
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-[4px] bg-[#EAF2EE] border border-[#1F513F]/20">
            <span className="text-[#1F513F] mr-1.5">RATA-RATA:</span>
            <span className="font-semibold text-[#1F513F] tabular-nums">
              {averageScore !== null ? averageScore.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </div>

      {totalGraded === 0 ? (
        <div className="py-10 text-center text-xs text-[#63615C]">
          Grafik distribusi akan terisi otomatis setelah nilai final siswa
          diterbitkan.
        </div>
      ) : (
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buckets}
              margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E2DC"
              />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: "#575551", fontFamily: "monospace" }}
                axisLine={{ stroke: "#E5E2DC" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#575551", fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#F7F6F2" }}
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#E5E2DC",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#141413",
                }}
              />
              <Bar
                dataKey="count"
                name="Jumlah Karya"
                fill="#1E3A5F"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}