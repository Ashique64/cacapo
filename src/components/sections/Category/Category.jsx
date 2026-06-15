"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";

export default function Collections() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Stagger reveal cards
    const anim = gsap.fromTo(
      cardsRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, []);

  const collectionItems = [
    {
      title: "ATELIER APPAREL",
      desc: "Architectural lines meets flowing silks. Expertly tailored drapery designed to contour and elevate the feminine form.",
      shortDesc: "Architectural lines meet flowing silks. Expertly tailored drapery.",
      image: "/Images/clothing.jpg",
      tag: "CLOTHING",
    },
    {
      title: "SCULPTED FOOTWEAR",
      desc: "Crafted in Italy. Striking structural heels and premium buttery leathers that deliver unparalleled elegance with every step.",
      shortDesc: "Italian crafted heels and premium leathers for unparalleled elegance.",
      image: "/Images/footwear.jpg",
      tag: "FOOTWEAR",
    },
    {
      title: "COUTURE ACCENTS",
      desc: "Statement jewelry, structural bags, and luxury accessories made with high-shine gold accents and clean geometric lines.",
      shortDesc: "Statement jewelry and bags featuring clean geometric gold lines.",
      image: "/Images/accessories.jpg",
      tag: "ACCESSORIES",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative bg-black py-32 px-6 overflow-hidden border-t border-zinc-900"
      id="collections"
    >
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center md:text-left mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
              THE RANGE
            </span>
            <h2 className="text-4xl md:text-4xl lg:text-6xl font-bold tracking-tight text-white uppercase">
              Curated <span className="text-accent">Couture</span>
            </h2>
          </div>
          <p className="text-muted-text text-sm md:text-sm lg:text-base max-w-sm tracking-wide font-light">
            An uncompromising selection of garments, footwear, and accessories tailored for the modern, design-focused woman.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collectionItems.map((item, idx) => (
            <div
              key={idx}
              ref={(el) => (cardsRef.current[idx] = el)}
              className={`group relative flex flex-col justify-end h-[460px] rounded-none overflow-hidden border border-zinc-800/80 bg-zinc-950/20 backdrop-blur-md cursor-pointer transition-all duration-700 hover:border-accent/40 hover:shadow-[0_0_40px_rgba(255,77,77,0.06)] ${
                idx === 2 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Card Image with Parallax & Hover Zoom */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {/* Fallback elegant gradient background if image isn't loaded yet */}
                <div className="absolute inset-0 bg-linear-to-b from-zinc-900/10 via-zinc-950/40 to-black z-1" />
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transform scale-100 transition-transform duration-1000 ease-out group-hover:scale-105 opacity-75 lg:opacity-60 lg:group-hover:opacity-85"
                />
              </div>

              {/* Glassmorphic border glow line on top (micro-interaction) */}
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent group-hover:via-accent/50 transition-all duration-700" />

              {/* Card Content */}
              <div className="relative z-10 p-6 flex flex-col justify-end h-[210px] bg-linear-to-t from-black via-black/95 to-transparent transform translate-y-0 lg:translate-y-[90px] lg:group-hover:translate-y-0 transition-transform duration-500 ease-out">
                <span className="text-[9px] tracking-[0.4em] font-semibold text-accent mb-2 block">
                  {item.tag}
                </span>
                
                <h3 className="text-xl md:text-lg lg:text-xl font-bold text-white tracking-wide mb-2 flex items-center justify-between group-hover:text-accent transition-colors">
                  {item.title}
                  <span className="opacity-100 translate-x-0 translate-y-0 lg:opacity-0 lg:-translate-x-2 lg:translate-y-2 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 lg:group-hover:translate-y-0 transition-all duration-500 text-accent">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </h3>

                {/* Mobile & Tablet Short Description */}
                <p className="block lg:hidden text-muted-text text-xs tracking-wide leading-relaxed font-light mb-4 h-[60px] overflow-hidden">
                  {item.shortDesc}
                </p>

                {/* Desktop Full Description */}
                <p className="hidden lg:block text-muted-text text-xs tracking-wide leading-relaxed font-light mb-4 h-[60px] overflow-hidden lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-500 lg:delay-75">
                  {item.desc}
                </p>

                <div className="w-full h-px bg-accent/20 lg:bg-zinc-900 lg:group-hover:bg-accent/20 mb-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 lg:delay-100" />

                <span className="text-[10px] text-white/90 font-medium tracking-[0.2em] uppercase lg:group-hover:translate-x-1 inline-flex items-center gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 lg:delay-150">
                  VIEW COLLECTION <span className="text-accent transition-transform duration-500 lg:group-hover:translate-x-1">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
