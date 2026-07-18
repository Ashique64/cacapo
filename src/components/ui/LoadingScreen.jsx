"use client";

import { useEffect } from "react";
import gsap from "gsap";

export default function LoadingScreen({ preloaderRef, loadingProgress, isPreloaderRemoved }) {
  useEffect(() => {
    // Trigger initial preloader entrance animations on mount
    gsap.to(".preloader-brand", {
      y: 0,
      opacity: 1,
      duration: 1.4,
      ease: "power4.out",
      delay: 0.2
    });
    gsap.to(".preloader-subtext", {
      opacity: 1,
      duration: 1.2,
      delay: 0.6
    });
  }, []);

  if (isPreloaderRemoved) return null;

  return (
    <div
      ref={preloaderRef}
      className="fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden"
    >
      {/* Top Sliding Panel */}
      <div className="preloader-top-panel absolute top-0 left-0 w-full h-[50vh] bg-loading-bg border-b border-loading-border z-10 select-none" />

      {/* Bottom Sliding Panel */}
      <div className="preloader-bottom-panel absolute bottom-0 left-0 w-full h-[50vh] bg-loading-bg border-t border-loading-border z-10 select-none" />

      {/* Center Brand / Progress Layer */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 md:p-16 pointer-events-none">
        {/* Top Indicator */}
        <div className="preloader-ui flex justify-between items-center text-[9px] tracking-[0.4em] text-muted-text font-light">
          <span>CACAPO EDIT.01</span>
          <span>EST. 2026</span>
        </div>

        {/* Center Typographic Reveal */}
        <div className="text-center my-auto flex flex-col items-center">
          <div className="overflow-hidden mb-5">
            <img 
              src="/Cacapo-Logo.svg" 
              alt="CACAPO" 
              className="preloader-brand h-9 md:h-12 w-auto object-contain opacity-0 translate-y-full" 
            />
          </div>
          <p className="preloader-subtext text-[10px] tracking-[0.5em] text-accent font-light uppercase opacity-0">
            ATELIER COUTURE
          </p>
        </div>

        {/* Bottom Controls / Counter */}
        <div className="preloader-ui flex flex-col gap-4">
          {/* 1px Progress Bar */}
          <div className="w-full h-px bg-loading-progress-bg relative overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-150 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>

          {/* Counter details */}
          <div className="flex justify-between items-center text-[10px] tracking-[0.3em] text-muted-text font-mono">
            <span className="animate-pulse">LOADING EXPERIENCE</span>
            <span>
              {loadingProgress.toString().padStart(3, "0")} / 100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
