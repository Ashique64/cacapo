"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Hero() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const preloaderRef = useRef(null);
  const imagesRef = useRef([]);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPreloaderRemoved, setIsPreloaderRemoved] = useState(false);

  const totalFrames = 180;

  // Track resizing and redraw
  const currentFrameIndexRef = useRef(0);

  // Helper to get image source path
  const getFramePath = (index) => {
    return `/Images/Hero-Section/Desktop/ezgif-frame-${index.toString().padStart(3, "0")}.png`;
  };

  // Preload Images
  useEffect(() => {
    let loadedCount = 0;
    const imagesArray = [];

    const handleImageLoad = () => {
      loadedCount++;
      const progress = Math.round((loadedCount / totalFrames) * 100);
      setLoadingProgress(progress);

      if (loadedCount === totalFrames) {
        // Draw the first frame on the canvas immediately under the preloader
        if (imagesArray[0]) {
          drawImage(imagesArray[0]);
        }

        setTimeout(() => {
          // Luxury unmounting sequence
          if (preloaderRef.current) {
            setIsLoaded(true); // Trigger canvas triggers and ScrollTrigger initializations immediately as panels start opening

            const tl = gsap.timeline({
              onComplete: () => {
                setIsPreloaderRemoved(true);
                // Allow scroll on body
                document.body.style.overflow = "auto";
              }
            });

            // 1. Fade/slide out text and UI overlays
            tl.to(".preloader-brand, .preloader-subtext, .preloader-ui", {
              opacity: 0,
              y: -20,
              duration: 0.8,
              ease: "power3.in"
            })
            // 2. Split panels slide off screen
            .to(".preloader-top-panel", {
              y: "-100%",
              duration: 1.2,
              ease: "power4.inOut"
            }, "-=0.4")
            .to(".preloader-bottom-panel", {
              y: "100%",
              duration: 1.2,
              ease: "power4.inOut"
            }, "<"); // Starts at same time
          }
        }, 800);
      }
    };

    const handleImageError = () => {
      // Still count failures to prevent blocking the loader
      handleImageLoad();
    };

    // Lock scroll and reset viewport during preloading
    document.body.style.overflow = "hidden";

    // (Entrance animations now handled internally by <Preloader /> on mount)

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      imagesArray.push(img);
    }

    imagesRef.current = imagesArray;

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Canvas drawing logic
  const drawImage = (img) => {
    if (!canvasRef.current || !img) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Get current dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set canvas pixel size
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Cover scale logic
    const imgWidth = img.naturalWidth || img.width || 1920;
    const imgHeight = img.naturalHeight || img.height || 1080;

    const canvasAspect = width / height;
    const imgAspect = imgWidth / imgHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (canvasAspect > imgAspect) {
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawX = 0;
      drawY = (height - drawHeight) / 2;
    } else {
      drawWidth = height * imgAspect;
      drawHeight = height;
      drawX = (width - drawWidth) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  };

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (imagesRef.current[currentFrameIndexRef.current]) {
        drawImage(imagesRef.current[currentFrameIndexRef.current]);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // GSAP ScrollTrigger Animation
  useEffect(() => {
    if (!isLoaded) return;

    gsap.registerPlugin(ScrollTrigger);

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Set initial frame
    if (imagesRef.current[0]) {
      drawImage(imagesRef.current[0]);
    }

    const animationObj = { frame: 1 };

    // Scroll trigger for Canvas sequence
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      pin: ".hero-sticky-layer",
      pinSpacing: false,
      scrub: 1,
      onUpdate: (self) => {
        const frameIndex = Math.min(
          totalFrames - 1,
          Math.max(0, Math.floor(self.progress * (totalFrames - 1)))
        );
        currentFrameIndexRef.current = frameIndex;
        if (imagesRef.current[frameIndex]) {
          drawImage(imagesRef.current[frameIndex]);
        }
      },
    });

    // Text Fade Timeline
    const textTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    // Animate text sections based on scroll percentages
    // Let's create beautiful transitions
    textTl
      // Initial Title
      .to(".hero-title-main", { opacity: 0, y: -30, duration: 1 })
      .to({}, { duration: 0.5 }) // spacer

      // Segment 1 (Clothing): Right Aligned
      .fromTo(".hero-text-1", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 2 })
      .to(".hero-text-1", { opacity: 0, y: -40, duration: 2 })
      .to({}, { duration: 0.5 }) // spacer

      // Segment 2 (Footwear & Accessories): Right Aligned
      .fromTo(".hero-text-2", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 2 })
      .to(".hero-text-2", { opacity: 0, y: -40, duration: 2 })
      .to({}, { duration: 0.5 }) // spacer

      // Final Callout: Center Aligned
      .fromTo(".hero-text-final", { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 2 });

    return () => {
      trigger.kill();
      textTl.kill();
    };
  }, [isLoaded]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black"
      style={{ height: "240vh" }} // Balanced scrolling timeline
    >
      {/* Canvas Sticky Layer */}
      <div className="hero-sticky-layer w-full h-screen overflow-hidden z-10 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block object-cover"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/80 pointer-events-none z-15" />
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none z-15" />

        {/* Scrolling Text Overlays */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-6">
          {/* Main Initial Title */}
          <div className="hero-title-main text-center select-none">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-[0.2em] text-white">
              CACAPO
            </h1>
            <p className="text-[10px] sm:text-xs md:text-xs lg:text-sm tracking-[0.3em] sm:tracking-[0.6em] text-muted-text mt-4 uppercase">
              The Art of Modern Couture
            </p>
          </div>

          {/* Text 1: Clothing - Right Aligned on desktop, centered on mobile */}
          <div className="hero-text-1 absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-[15%] text-center md:text-right select-none opacity-0 w-full max-w-[90vw] md:max-w-md">
            <span className="text-[10px] sm:text-xs md:text-xs lg:text-sm tracking-[0.5em] text-accent uppercase font-semibold block mb-3">
              THE TEXTILE REVELATION
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-none uppercase">
              ELEGANCE IN <br />
              <span className="text-accent">
                EVERY THREAD
              </span>
            </h2>
            <p className="text-xs sm:text-sm md:text-sm lg:text-base text-muted-text mt-4 md:mt-6 tracking-wide font-light">
              Fluid drapery meets architecture-inspired tailoring. Silk, cashmere, and structural cotton engineered to contour.
            </p>
          </div>

          {/* Text 2: Footwear & Accessories - Left Aligned on desktop, centered on mobile */}
          <div className="hero-text-2 absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[8%] text-center md:text-left select-none opacity-0 w-full max-w-[90vw] md:max-w-md">
            <span className="text-[10px] sm:text-xs md:text-xs lg:text-sm tracking-[0.5em] text-accent uppercase font-semibold block mb-3">
              SCULPTED FOOTWEAR & ACCENTS
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-none uppercase">
              DESIGNED TO <br />
              <span className="text-accent">
                STEP AHEAD
              </span>
            </h2>
            <p className="text-xs sm:text-sm md:text-sm lg:text-base text-muted-text mt-4 md:mt-6 tracking-wide font-light">
              Italian calf leather heels and structural metal clasps designed to contour and seal your aesthetic presence.
            </p>
          </div>

          {/* Text 3: Final Screen - Left Aligned on desktop, centered on mobile */}
          <div className="hero-text-final absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[8%] text-center md:text-left select-none opacity-0 flex flex-col items-center md:items-start w-full max-w-[90vw] md:max-w-lg">
            <h2 className="text-3xl sm:text-4xl md:text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-none uppercase">
              UNCOMPROMISED <br />
              <span className="text-accent">
                COUTURE
              </span>
            </h2>
            <p className="text-xs sm:text-sm md:text-sm lg:text-base text-muted-text mt-4 md:mt-6 tracking-wider font-light">
              Experience the new collection. Scroll down to enter.
            </p>
            <div className="mt-6 md:mt-8 flex gap-4 justify-center md:justify-start">
              <button className="relative overflow-hidden px-8 py-3 bg-white text-black rounded-none font-semibold text-xs tracking-widest uppercase transition-all duration-500 cursor-pointer group active:scale-95 pointer-events-auto">
                <span className="absolute inset-0 bg-accent transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                <span className="relative z-10 transition-colors duration-500 group-hover:text-white">
                  SHOP COLLECTION
                </span>
              </button>
            </div>
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
