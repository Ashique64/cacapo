"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

export default function BrandEthos() {
  const triggerRef = useRef(null);
  const textRef = useRef(null);
  const imageRef = useRef(null);

  const ethosText =
    "We curate the finest imported streetwear and modern apparel from across East Asia, bringing global trends directly to India. Tailored for Gen-Z style expressions, each piece is hand-selected to define the edge of modern youth culture.";

  const words = ethosText.split(" ");

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Animating text word reveal
    const textSpans = textRef.current.querySelectorAll(".ethos-word");
    const textAnim = gsap.fromTo(
      textSpans,
      { opacity: 0.15, color: "#71717a" },
      {
        opacity: 1,
        color: "#ffffff",
        stagger: 0.1,
        ease: "none",
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top 75%",
          end: "bottom 60%",
          scrub: 0.5,
        },
      }
    );

    // Parallax on image
    const imageAnim = gsap.fromTo(
      imageRef.current,
      { y: 40 },
      {
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );

    return () => {
      textAnim.scrollTrigger?.kill();
      textAnim.kill();
      imageAnim.scrollTrigger?.kill();
      imageAnim.kill();
    };
  }, []);

  return (
    <section
      ref={triggerRef}
      className="relative bg-black py-24 px-6 overflow-hidden border-t border-zinc-900 select-none"
      id="brand-ethos"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Ethos Text Reveal Column */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-6">
            OUR PHILOSOPHY
          </span>
          <p
            ref={textRef}
            className="text-2xl sm:text-3xl md:text-4xl font-light tracking-wide leading-relaxed text-muted-text uppercase"
          >
            {words.map((word, index) => (
              <span
                key={index}
                className="ethos-word inline-block mr-3 transition-colors duration-300 font-sans font-medium"
              >
                {word}
              </span>
            ))}
          </p>

          {/* Details below reveal */}
          <div className="mt-12 flex items-start gap-12 border-t border-zinc-900 pt-10">
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100 block">GLOBAL</span>
              <span className="text-[10px] text-muted-text tracking-widest uppercase mt-1 block">
                East Asian Imports
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100 block">16-30</span>
              <span className="text-[10px] text-muted-text tracking-widest uppercase mt-1 block">
                Gen-Z Youth Focus
              </span>
            </div>
            <div>
              <span className="text-2xl font-bold font-mono text-zinc-100 block">WEEKLY</span>
              <span className="text-[10px] text-muted-text tracking-widest uppercase mt-1 block">
                Fresh Curated Drops
              </span>
            </div>
          </div>
        </div>

        {/* Visual Parallax Column */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          {/* Decorative frame elements */}
          <div className="absolute inset-0 border border-zinc-800 rounded-none -m-4 pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 border-r border-t border-accent/20 rounded-none -m-4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-l border-b border-accent/20 rounded-none -m-4 pointer-events-none" />

          {/* Core Image container */}
          <div className="w-full aspect-3/4 overflow-hidden rounded-none relative shadow-2xl border border-zinc-900 bg-zinc-950">
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/35 z-10 pointer-events-none" />
            <img
              ref={imageRef}
              src="/Images/ethos.jpg"
              alt="Couture craftsmanship detail"
              className="w-full h-[120%] object-cover absolute top-[-10%] opacity-80"
            />
            {/* Ambient gold glow under layout */}
            <div className="absolute bottom-6 left-6 z-20">
              <span className="text-[10px] tracking-[0.3em] text-accent uppercase font-semibold">
                CURATED IMPORT SELECTION
              </span>
              <span className="text-sm font-semibold tracking-wider text-white block mt-1">
                Sourced from China, Indonesia & Vietnam
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
