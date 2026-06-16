import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF4D4D]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
          Loading Design...
        </span>
      </div>
    </div>
  );
}
