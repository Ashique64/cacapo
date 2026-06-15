"use client";

import { Sparkles } from "lucide-react";

export default function Marquee() {
  const marqueeItems = [
    "CURATED STREETWEAR",
    "EAST ASIAN IMPORTS",
    "ATELIER COUTURE",
    "NEW RELEASES",
    "GEN-Z STYLE EXPRESSIONS",
    "WEEKLY FRESH DROPS",
    "LIMITED EDITION",
  ];

  // Repeat items to fill width and loop seamlessly
  const listItems = [...marqueeItems, ...marqueeItems];

  return (
    <div className="lg:hidden w-full overflow-hidden bg-zinc-950/40 backdrop-blur-md border-y border-zinc-900/60 py-3.5 sm:py-4 select-none relative z-20">
      {/* Side Vignette Fades */}
      <div className="absolute inset-y-0 left-0 w-12 bg-linear-to-r from-black to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-12 bg-linear-to-l from-black to-transparent pointer-events-none z-10" />
      
      <div className="animate-marquee flex items-center gap-12 whitespace-nowrap">
        {listItems.map((item, index) => (
          <div key={index} className="flex items-center gap-10 text-white">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] font-mono uppercase text-zinc-200">
              {item}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
