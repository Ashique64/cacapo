"use client";

import Link from "next/link";
import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="relative bg-black border-t border-zinc-900 pt-12 pb-8 md:pt-16 md:pb-10 lg:pt-24 lg:pb-12 px-6 overflow-hidden select-none">
      {/* Ambient glowing highlights */}
      <div className="absolute bottom-0 left-1/3 -translate-x-1/2 w-[600px] h-[300px] bg-accent/3 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-12 md:gap-12 mb-10 lg:mb-20">
          {/* Atelier Studio Details Column */}
          <div className="col-span-2 md:col-span-6 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-accent uppercase mb-4 block">
              THE IMPORT HOUSE
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4 uppercase leading-tight">
              GLOBAL LUXURY <br />
              <span className="text-accent">
                CURATED SELECTIONS
              </span>
            </h3>
            <p className="text-muted-text text-sm tracking-wide font-light max-w-sm mb-4">
              Curating premium imported ready-to-wear collections, accessories, and sculpted footwear from global fashion capitals, delivered directly from our hub in Kerala.
            </p>
            {/* <div className="border-t border-zinc-900 pt-4 max-w-sm">
              <span className="text-zinc-500 text-[10px] tracking-widest uppercase block font-medium">Flagship Showroom</span>
              <span className="text-zinc-300 text-xs tracking-wider block mt-1 uppercase">Malappuram, Kerala — By Appointment Only</span>
            </div> */}
          </div>

          {/* Links Column 1 */}
          <div className="col-span-1 md:col-span-3 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-muted-text uppercase mb-6 block">
              COLLECTIONS
            </span>
            <ul className="flex flex-col gap-3 text-xs tracking-widest text-muted-text font-light">
              <li>
                <Link href="/shop?category=clothing" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  Atelier Apparel
                </Link>
              </li>
              <li>
                <Link href="/shop?category=footwear" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  Sculpted Footwear
                </Link>
              </li>
              <li>
                <Link href="/shop?category=accessories" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  Couture Accents
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="col-span-1 md:col-span-3 flex flex-col justify-start">
            <span className="text-[10px] tracking-[0.4em] font-semibold text-muted-text uppercase mb-6 block">
              COMPANY
            </span>
            <ul className="flex flex-col gap-3 text-xs tracking-widest text-muted-text font-light">
              <li>
                <Link href="/about" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/return-policy" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  Return Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-info" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-accent transition-colors cursor-pointer uppercase block">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Big Decorative Title */}
        <div className="border-t border-zinc-900 pt-10 md:pt-16 flex flex-col items-center justify-center relative overflow-hidden w-full">
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
          <h1 className="text-[12vw] lg:text-[11vw] leading-none font-black tracking-[0.2em] mr-[0.2em] text-zinc-950 font-sans text-center transition-colors duration-1000 hover:text-accent select-none">
            CACAPO
          </h1>
        </div>

        {/* Copyright and Credits */}
        <div className="mt-12 pt-6 border-t border-zinc-900/60 flex flex-col md:flex-row justify-between items-center text-[10px] tracking-[0.2em] text-muted-text font-light">
          <span>© 2026 CACAPO. ALL RIGHTS RESERVED.</span>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/terms-of-service" className="hover:text-white transition-colors cursor-pointer">
              TERMS OF SERVICE
            </Link>
            <Link href="/privacy-policy" className="hover:text-white transition-colors cursor-pointer">
              PRIVACY POLICY
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
