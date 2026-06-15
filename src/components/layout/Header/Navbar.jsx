"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "HOME", path: "/" },
    { name: "SHOP", path: "/shop" },
    { name: "ABOUT", path: "/about" },
    { name: "CONTACT", path: "/contact" },
  ];

  useEffect(() => {
    const getHeroHeight = () => {
      const heroEl = document.getElementById("hero");
      return heroEl ? heroEl.offsetHeight : window.innerHeight * 2.4;
    };

    // Check initial scroll on mount to avoid flashes and preserve styling if page was refreshed scrolled down
    const initialScrollY = window.scrollY;
    const heroHeight = getHeroHeight();
    setIsPastHero(initialScrollY >= heroHeight);
    
    let lastScrollY = initialScrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = getHeroHeight();

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
    <>
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
        
        {/* Desktop Menu Links */}
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-widest">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <span
                key={item.name}
                className={`transition-colors cursor-pointer ${
                  isActive ? "text-accent font-semibold" : "text-muted-text hover:text-white"
                }`}
              >
                {item.name}
              </span>
            );
          })}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4 text-white">
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

        {/* Mobile Right Controls */}
        <div className="flex items-center gap-4 md:hidden">
          <span className="hover:text-accent transition-colors cursor-pointer p-1 relative">
            <ShoppingBag className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 bg-accent text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold text-black font-mono">
              0
            </span>
          </span>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-white hover:text-accent transition-colors p-1"
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/98 backdrop-blur-xl z-50 flex flex-col justify-between p-8 transition-all duration-500 ease-out md:hidden ${
          isMobileMenuOpen 
            ? "opacity-100 pointer-events-auto translate-y-0" 
            : "opacity-0 pointer-events-none -translate-y-4"
        }`}
      >
        {/* Header inside mobile menu */}
        <div className="flex justify-end items-center">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white hover:text-accent transition-colors p-1"
            aria-label="Close Menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col gap-8 text-2xl font-bold tracking-[0.2em] text-center uppercase my-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <span
                key={item.name}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`transition-colors cursor-pointer ${
                  isActive ? "text-accent" : "text-muted-text hover:text-white"
                }`}
              >
                {item.name}
              </span>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex justify-center gap-12 text-white border-t border-zinc-900 pt-8">
          <span className="hover:text-accent transition-colors cursor-pointer flex items-center gap-2 text-xs tracking-widest" onClick={() => setIsMobileMenuOpen(false)}>
            <User className="w-4 h-4" /> ACCOUNT
          </span>
          <span className="hover:text-accent transition-colors cursor-pointer flex items-center gap-2 text-xs tracking-widest" onClick={() => setIsMobileMenuOpen(false)}>
            <ShoppingBag className="w-4 h-4" /> BAG (0)
          </span>
        </div>
      </div>
    </>
  );
}
