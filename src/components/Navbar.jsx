"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, User } from "lucide-react";

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isPastHero, setIsPastHero] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // The hero container has a height of 240vh
      const heroHeight = window.innerHeight * 2.4;

      const pastHero = currentScrollY >= heroHeight;
      setIsPastHero(pastHero);

      if (pastHero) {
        if (currentScrollY < lastScrollY) {
          // Scrolling up -> show
          setIsVisible(true);
        } else {
          // Scrolling down -> hide
          setIsVisible(false);
        }
      } else {
        // Within hero -> always show
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-40 select-none transition-all duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      } ${
        isPastHero
          ? "bg-black/80 backdrop-blur-md py-4 px-6"
          : "bg-transparent p-6"
      } flex justify-between items-center`}
    >
      <span className="text-xl font-extrabold tracking-[0.3em] text-white">CACAPO</span>
      <div className="flex gap-8 text-sm font-medium tracking-widest text-muted-text">
        <span className="hover:text-white transition-colors cursor-pointer">HOME</span>
        <span className="hover:text-white transition-colors cursor-pointer">SHOP</span>
        <span className="hover:text-white transition-colors cursor-pointer">ABOUT</span>
        <span className="hover:text-white transition-colors cursor-pointer">CONTACT</span>
      </div>
      <div className="flex items-center gap-4 text-white">
        <span className="hover:text-accent transition-colors cursor-pointer p-1">
          <User className="w-5 h-5" />
        </span>
        <span className="hover:text-accent transition-colors cursor-pointer p-1 relative">
          <ShoppingBag className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-accent text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold text-black font-mono">
            0
          </span>
        </span>
      </div>
    </nav>
  );
}
