"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Hero() {
  const containerRef = useRef(null);
  const preloaderRef = useRef(null);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPreloaderRemoved, setIsPreloaderRemoved] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const dismissPreloader = () => {
    setIsLoaded(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cacapo_preloader_done", "true");
    }

    if (preloaderRef.current) {
      gsap.killTweensOf(".preloader-brand, .preloader-subtext, .preloader-ui, .preloader-top-panel, .preloader-bottom-panel");
      const tl = gsap.timeline({
        onComplete: () => {
          setIsPreloaderRemoved(true);
          document.body.style.overflow = "auto";
        }
      });

      tl.to(".preloader-brand, .preloader-subtext, .preloader-ui", {
        opacity: 0,
        y: -15,
        duration: 0.25,
        ease: "power2.in"
      });

      tl.to(".preloader-top-panel", {
        y: "-100%",
        duration: 0.5,
        ease: "power3.inOut"
      }, "-=0.1");

      tl.to(".preloader-bottom-panel", {
        y: "100%",
        duration: 0.5,
        ease: "power3.inOut"
      }, "-=0.5");
    } else {
      setIsPreloaderRemoved(true);
      document.body.style.overflow = "auto";
    }
  };

  // Preload Background Images & Smooth Progress
  useEffect(() => {
    const isMobileDevice = window.innerWidth < 1024;
    setIsMobile(isMobileDevice);

    const hasPreloaderRun = typeof window !== "undefined" && sessionStorage.getItem("cacapo_preloader_done") === "true";

    if (hasPreloaderRun) {
      setLoadingProgress(100);
      setIsLoaded(true);
      setIsPreloaderRemoved(true);
      document.body.style.overflow = "auto";
      return;
    }

    document.body.style.overflow = "hidden";

    let finished = false;
    let animFrame;
    const startTime = performance.now();
    const duration = 400; // Snappy 400ms progress ticker

    const completeLoading = () => {
      if (finished) return;
      finished = true;
      setLoadingProgress(100);
      setTimeout(() => {
        dismissPreloader();
      }, 50);
    };

    const animateProgress = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setLoadingProgress(progress);

      if (progress < 100) {
        animFrame = requestAnimationFrame(animateProgress);
      } else {
        completeLoading();
      }
    };

    animFrame = requestAnimationFrame(animateProgress);

    // Hard fallback safety: never stay locked more than 600ms
    const safetyTimeout = setTimeout(completeLoading, 600);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(safetyTimeout);
      document.body.style.overflow = "auto";
    };
  }, []);

  // GSAP entrance animation for title
  useEffect(() => {
    if (!isLoaded) return;
    
    gsap.fromTo(".hero-title-main", 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.1 }
    );
  }, [isLoaded]);

  // Resize handler to update isMobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      id="hero"
      className="relative w-full bg-background h-screen"
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-10">
        {/* Mobile Hero Background */}
        <Image
          src="/Images/mobile_hero_bg_white.png"
          alt="CACAPO — Trendy Imported Fashion for Girls"
          fill
          sizes="(max-width: 1023px) 100vw, 0px"
          className="object-cover opacity-60 scale-110 animate-swing block lg:hidden"
          priority
          quality={75}
        />

        {/* Desktop Hero Background */}
        <Image
          src="/Images/desktop_hero_bg_v5.png"
          alt="CACAPO — Trendy Imported Fashion for Girls"
          fill
          sizes="(min-width: 1024px) 100vw, 0px"
          className="object-cover opacity-60 scale-110 animate-swing hidden lg:block"
          priority
          quality={75}
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-background/10 pointer-events-none z-15" />
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none z-15" />
      </div>

      {/* Scrolling Text Overlays */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-6">
        {/* Main Initial Title */}
        <div className="hero-title-main text-center select-none flex flex-col items-center justify-center opacity-0 translate-y-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.2em] text-black">
            CACAPO
          </h1>
          <p className="text-xs sm:text-sm md:text-sm lg:text-sm tracking-[0.3em] sm:tracking-[0.6em] text-accent mt-4 uppercase">
            Trendy Imported Fashion for Girls
          </p>
          <div className="mt-8 flex justify-center pointer-events-auto">
            <button
              onClick={() => {
                document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="relative overflow-hidden px-8 py-3 bg-transparent border border-foreground text-foreground rounded-none font-semibold text-[10px] sm:text-xs tracking-widest uppercase transition-all duration-500 cursor-pointer group active:scale-95"
            >
              <span className="absolute inset-0 bg-foreground transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
              <span className="relative z-10 transition-colors duration-500 group-hover:text-background">
                SHOP COLLECTION
              </span>
            </button>
          </div>
        </div>
      </div>

      <LoadingScreen
        preloaderRef={preloaderRef}
        loadingProgress={loadingProgress}
        isPreloaderRemoved={isPreloaderRemoved}
      />
    </div>
  );
}
