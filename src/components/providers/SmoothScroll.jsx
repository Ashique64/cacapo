"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

export default function SmoothScroll({ children }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // ✅ Drive Lenis from GSAP's ticker — this is the correct integration pattern.
    // Using gsap.ticker instead of requestAnimationFrame directly ensures Lenis
    // and ScrollTrigger are always in sync on the same frame.
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000); // gsap time is in seconds, Lenis expects ms
    });

    // ✅ Disable GSAP's built-in lag smoothing so Lenis handles it
    gsap.ticker.lagSmoothing(0);

    // ✅ Tell ScrollTrigger to use Lenis's scroll position for its calculations
    lenis.on("scroll", ScrollTrigger.update);

    // Make lenis globally accessible
    window.lenis = lenis;

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(lenis.raf);
      lenis.destroy();
      window.lenis = null;
    };
  }, []);

  return <>{children}</>;
}
