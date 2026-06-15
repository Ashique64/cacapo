"use client";

import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="relative bg-black border-t border-zinc-900 pt-12 pb-8 md:pt-16 md:pb-10 lg:pt-24 lg:pb-12 px-6 overflow-hidden select-none">
      {/* Ambient glowing highlights */}
      <div className="absolute bottom-0 left-1/3 -translate-x-1/2 w-[600px] h-[300px] bg-accent/3 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-10 lg:mb-20">
          {/* Newsletter Column - Text Only */}
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
            <p className="text-muted-text text-sm tracking-wide font-light max-w-sm">
              Receive private invitations to new collection previews, physical pop-up salons, and brand editorials.
            </p>
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
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="md:col-span-3 col-span-6 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-muted-text uppercase mb-6 block">
              COMPANY
            </span>
            <ul className="flex flex-col gap-3 text-xs tracking-widest text-muted-text font-light">
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">About Us</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Return Policy</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Shipping Info</span>
              </li>
              <li>
                <span className="hover:text-accent transition-colors cursor-pointer uppercase">Help & Support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Big Decorative Title */}
        <div className="border-t border-zinc-900 pt-16 flex flex-col items-center justify-center relative">
          <div className="flex gap-8 mb-8 text-muted-text">
            {/* Instagram */}
            <span className="hover:text-white transition-colors cursor-pointer" aria-label="Instagram">
              <FaInstagram className="w-5 h-5" />
            </span>
            {/* Facebook */}
            <span className="hover:text-white transition-colors cursor-pointer" aria-label="Facebook">
              <FaFacebook className="w-5 h-5" />
            </span>
            {/* WhatsApp */}
            <span className="hover:text-white transition-colors cursor-pointer" aria-label="WhatsApp">
              <FaWhatsapp className="w-5 h-5" />
            </span>
          </div>

          {/* Big CACAPO Logo with Letter Spacing */}
          <h1 className="text-[15vw] leading-none font-black tracking-[0.2em] text-zinc-950 font-sans text-center transition-colors duration-1000 hover:text-accent select-none">
            CACAPO
          </h1>
        </div>

        {/* Copyright and Credits */}
        <div className="mt-12 pt-6 border-t border-zinc-900/60 flex flex-col md:flex-row justify-between items-center text-[10px] tracking-[0.2em] text-muted-text font-light">
          <span>© 2026 CACAPO. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span className="hover:text-white transition-colors cursor-pointer">TERMS OF SERVICE</span>
            <span className="hover:text-white transition-colors cursor-pointer">PRIVACY POLICY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
