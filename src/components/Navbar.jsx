"use client";

import { ShoppingBag, User } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-40 bg-transparent select-none">
      <span className="text-xl font-extrabold tracking-[0.3em] text-white">CACAPO</span>
      <div className="flex gap-8 text-sm font-medium tracking-widest text-muted-text">
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
