export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-[6px] bg-white border border-[#E5E2DC] shadow-sm">
        <span className="h-2 w-2 rounded-full bg-[#1E3A5F] animate-ping" />
        <span className="font-mono text-xs text-[#141413]">
          Menyiapkan Kanvas Studio...
        </span>
      </div>
    </div>
  );
}