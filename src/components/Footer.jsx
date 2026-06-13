"use client";

import { ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-black border-t border-zinc-900 pt-24 pb-12 px-6 overflow-hidden select-none">
      {/* Ambient glowing highlights */}
      <div className="absolute bottom-0 left-1/3 -translate-x-1/2 w-[600px] h-[300px] bg-accent/3 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          {/* Newsletter Column */}
          <div className="md:col-span-6 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-accent uppercase mb-4 block">
              NEWSLETTER
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-6 uppercase">
              Stay tuned <br />
              <span className="text-accent">
                to the Atelier
              </span>
            </h3>
            <p className="text-muted-text text-sm tracking-wide font-light max-w-sm mb-8">
              Receive private invitations to new collection previews, physical pop-up salons, and brand editorials.
            </p>

            {/* Premium Underlined Form */}
            <form onSubmit={(e) => e.preventDefault()} className="relative max-w-md w-full">
              <input
                type="email"
                placeholder="YOUR EMAIL"
                suppressHydrationWarning
                className="w-full bg-transparent border-b border-zinc-800 focus:border-accent/60 text-white font-mono text-xs tracking-widest py-3 pr-10 outline-none transition-colors uppercase placeholder:text-muted-text"
              />
              <button
                type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-text hover:text-white transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Links Column 1 */}
          <div className="md:col-span-3 col-span-6 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-muted-text uppercase mb-6 block">
              COLLECTIONS
            </span>
            <ul className="flex flex-col gap-3 text-xs tracking-widest text-muted-text font-light">
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Atelier Apparel</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Sculpted Footwear</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Couture Accents</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">The Runway Archive</span>
              </li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="md:col-span-3 col-span-6 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-muted-text uppercase mb-6 block">
              COMPANY
            </span>
            <ul className="flex flex-col gap-3 text-xs tracking-widest text-muted-text font-light">
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Our Ethos</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Sustainability Charter</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Atelier Logbook</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Customer Care</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Big Decorative Title */}
        <div className="border-t border-zinc-900 pt-16 flex flex-col items-center justify-center relative">
          <div className="flex gap-8 mb-8 text-muted-text">
            <span className="hover:text-white transition-colors cursor-pointer">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </span>
            <span className="hover:text-white transition-colors cursor-pointer">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </span>
          </div>

          {/* Big CACAPO Logo with Letter Spacing */}
          <h1 className="text-[15vw] leading-none font-black tracking-[0.2em] text-zinc-950 font-sans text-center transition-colors duration-1000 hover:text-zinc-900 select-none">
            CACAPO
          </h1>
        </div>

        {/* Copyright and Credits */}
        <div className="mt-12 pt-6 border-t border-zinc-900/60 flex flex-col md:flex-row justify-between items-center text-[10px] tracking-[0.2em] text-muted-text font-light">
          <span>© 2026 CACAPO COUTURE. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="hover:text-white transition-colors cursor-pointer">TERMS OF SERVICE</span>
            <span className="hover:text-white transition-colors cursor-pointer">PRIVACY POLICY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
