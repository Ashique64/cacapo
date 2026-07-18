import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground font-sans">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-text animate-pulse">
          Loading Design...
        </span>
      </div>
    </div>
  );
}
