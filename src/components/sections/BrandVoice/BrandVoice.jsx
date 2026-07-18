"use client";

import { useEffect, useRef } from "react";

export default function BrandEthos() {
  const triggerRef = useRef(null);
  const textRef = useRef(null);
  const imageRef = useRef(null);

  const ethosText =
    "We curate the finest imported streetwear and modern apparel from across East Asia, bringing global trends directly to India. Tailored for Gen-Z style expressions, each piece is hand-selected to define the edge of modern youth culture.";

  const words = ethosText.split(" ");

  useEffect(() => {
    const section = triggerRef.current;
    const textEl = textRef.current;
    const imageEl = imageRef.current;
    if (!section || !textEl) return;

    const wordEls = Array.from(textEl.querySelectorAll(".ethos-word"));

    // Force initial dim state so words start gray before any scroll
    wordEls.forEach((w) => {
      w.style.color = "#a1a1aa";   // zinc-400
      w.style.opacity = "0.2";
    });

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // ── Word reveal ──────────────────────────────────────────────────────
      // progress = 0  →  section top is at 85% of the viewport (just entering)
      // progress = 1  →  section bottom reaches the bottom of the viewport
      //                  (the full section is visible — no need to scroll further)
      //
      // At the end-condition:
      //   rect.bottom = vh  →  rect.top = vh - rect.height
      //   revealStart = vh*0.85 - (vh - rect.height) = rect.height - vh*0.15
      //   so revealTotal must equal that same value.
      const revealStart = vh * 0.85 - rect.top;
      const revealTotal = Math.max(50, rect.height - vh * 0.15);
      const progress = Math.min(1, Math.max(0, revealStart / revealTotal));

      const count = wordEls.length;
      wordEls.forEach((word, i) => {
        // Each word gets its own threshold in [0, 1]
        const threshold = i / count;
        // Local word progress: goes 0→1 as global progress passes its threshold
        const wordP = Math.min(1, Math.max(0, (progress - threshold) * count));
        word.style.opacity = String(0.2 + wordP * 0.8);
        // Interpolate from zinc-400 (#a1a1aa, lightness 66%) to foreground text (#111111, lightness 7%)
        const l = Math.round(66 - wordP * 59);   // lightness 66% → 7%
        word.style.color = `hsl(0,0%,${l}%)`;
      });

      // ── Image parallax ────────────────────────────────────────────────────
      if (imageEl) {
        // section centre relative to viewport centre, normalised to [-1, 1]
        const sectionCenter = rect.top + rect.height / 2;
        const t = (sectionCenter - vh / 2) / (vh / 2);   // +1 below fold, -1 above fold
        const translateY = Math.max(-40, Math.min(40, t * 40));
        imageEl.style.transform = `translateY(${translateY}px)`;
      }
    };

    // Lenis dispatches native scroll events on window — this listener is always reliable
    window.addEventListener("scroll", onScroll, { passive: true });

    // Run once immediately so initial state is correct (handles page-load-with-hash)
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      // Clean up inline styles on unmount
      wordEls.forEach((w) => {
        w.style.color = "";
        w.style.opacity = "";
      });
      if (imageEl) imageEl.style.transform = "";
    };
  }, []);

  return (
    <section
      ref={triggerRef}
      className="hidden md:block relative bg-background py-12 md:py-16 lg:py-24 px-6 md:px-12 lg:px-6 overflow-hidden border-card-border select-none"
      id="brand-ethos"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 md:gap-10 lg:gap-16 items-center">
        {/* Ethos Text Reveal Column */}
        <div className="md:col-span-1 lg:col-span-7 flex flex-col justify-center">
          <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-6">
            OUR PHILOSOPHY
          </span>
          <p
            ref={textRef}
            className="text-2xl sm:text-3xl md:text-2xl lg:text-4xl font-light tracking-wide leading-relaxed uppercase"
          >
            {words.map((word, index) => (
              <span
                key={index}
                className="ethos-word inline-block mr-3 font-sans font-medium"
                style={{ color: "#a1a1aa", opacity: 0.2 }}
              >
                {word}
              </span>
            ))}
          </p>

          {/* Details below reveal */}
          <div className="mt-10 flex items-start justify-between md:justify-start gap-4 md:gap-8 lg:gap-12 border-t border-card-border pt-8">
            <div>
              <span className="text-2xl font-bold font-mono text-foreground block">GLOBAL</span>
              <span className="text-[10px] text-muted-text tracking-widest uppercase mt-1 block">
                East Asian Imports
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-foreground block">16-30</span>
              <span className="text-[10px] text-muted-text tracking-widest uppercase mt-1 block">
                Gen-Z Youth Focus
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-foreground block">WEEKLY</span>
              <span className="text-[10px] text-muted-text tracking-widest uppercase mt-1 block">
                Fresh Curated Drops
              </span>
            </div>
          </div>
        </div>

        {/* Visual Parallax Column */}
        <div className="md:col-span-1 lg:col-span-5 relative flex justify-center items-center w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
          {/* Decorative frame elements */}
          <div className="absolute inset-0 border border-card-border rounded-none -m-4 pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 border-r border-t border-accent/20 rounded-none -m-4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-l border-b border-accent/20 rounded-none -m-4 pointer-events-none" />

          {/* Core Image container */}
          <div className="w-full aspect-3/4 overflow-hidden rounded-none relative shadow-2xl border border-card-border bg-card-bg">
            <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-background/35 z-10 pointer-events-none" />
            <img
              ref={imageRef}
              src="/Images/ethos_white.png"
              alt="Couture craftsmanship detail"
              className="w-full h-[120%] object-cover absolute top-[-10%] opacity-80"
              style={{ willChange: "transform" }}
            />
            {/* Ambient label */}
            <div className="absolute bottom-6 left-6 z-20">
              <span className="text-[10px] tracking-[0.3em] text-accent uppercase font-semibold">
                CURATED IMPORT SELECTION
              </span>
              <span className="text-sm font-semibold tracking-wider text-foreground block mt-1">
                Sourced from China, Indonesia &amp; Vietnam
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
