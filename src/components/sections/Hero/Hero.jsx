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

  // Preload Background Images
  useEffect(() => {
    const isMobileDevice = window.innerWidth < 1024;
    setIsMobile(isMobileDevice);

    const hasPreloaderRun = typeof window !== "undefined" && sessionStorage.getItem("cacapo_preloader_done") === "true";

    if (hasPreloaderRun) {
      setLoadingProgress(100);
      setIsLoaded(true);
      setIsPreloaderRemoved(true);
      return;
    }

    // Preload the background images
    const imagesToPreload = isMobileDevice 
      ? ["/Images/mobile_hero_bg_white.png"] 
      : ["/Images/desktop_hero_bg.png"];
    
    let loadedCount = 0;
    
    imagesToPreload.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      const handleLoad = () => {
        loadedCount++;
        const progress = Math.min(100, Math.round((loadedCount / imagesToPreload.length) * 100));
        setLoadingProgress(progress);

        if (loadedCount === imagesToPreload.length) {
          setIsLoaded(true);
          setTimeout(() => {
            if (preloaderRef.current) {
              gsap.killTweensOf(".preloader-brand, .preloader-subtext, .preloader-ui");
              const tl = gsap.timeline({
                onComplete: () => {
                  setIsPreloaderRemoved(true);
                  sessionStorage.setItem("cacapo_preloader_done", "true");
                  document.body.style.overflow = "auto";
                }
              });

              tl.to(".preloader-brand, .preloader-subtext, .preloader-ui", {
                opacity: 0,
                y: -20,
                duration: 0.8,
                ease: "power3.in"
              })
              .to(".preloader-top-panel", {
                y: "-100%",
                duration: 1.2,
                ease: "power4.inOut"
              }, "-=0.4")
              .to(".preloader-bottom-panel", {
                y: "100%",
                duration: 1.2,
                ease: "power4.inOut"
              }, "<");
            } else {
              setIsPreloaderRemoved(true);
              sessionStorage.setItem("cacapo_preloader_done", "true");
              document.body.style.overflow = "auto";
            }
          }, 800);
        }
      };
      
      img.onload = handleLoad;
      img.onerror = handleLoad;
    });

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // GSAP entrance animation for title
  useEffect(() => {
    if (!isLoaded) return;
    
    gsap.fromTo(".hero-title-main", 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.5, ease: "power4.out", delay: 0.2 }
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
        <Image
          src={isMobile ? "/Images/mobile_hero_bg_white.png" : "/Images/desktop_hero_bg_v5.png"}
          alt="CACAPO Couture — House of Modern Luxury Fashion"
          fill
          sizes="100vw"
          className="object-cover opacity-60 scale-110 animate-swing"
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
            The Art of Modern Couture
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
