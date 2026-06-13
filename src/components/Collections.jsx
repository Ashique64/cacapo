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
      { opacity: 0, y: 80 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
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
      image: "/Images/clothing.jpg",
      tag: "CLOTHING",
    },
    {
      title: "SCULPTED FOOTWEAR",
      desc: "Crafted in Italy. Striking structural heels and premium buttery leathers that deliver unparalleled elegance with every step.",
      image: "/Images/footwear.jpg",
      tag: "FOOTWEAR",
    },
    {
      title: "COUTURE ACCENTS",
      desc: "Statement jewelry, structural bags, and luxury accessories made with high-shine gold accents and clean geometric lines.",
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
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white uppercase">
              Curated <span className="text-accent italic font-serif">Couture</span>
            </h2>
          </div>
          <p className="text-muted-text text-sm max-w-sm tracking-wide font-light">
            An uncompromising selection of garments, footwear, and accessories tailored for the modern, design-focused woman.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {collectionItems.map((item, idx) => (
            <div
              key={idx}
              ref={(el) => (cardsRef.current[idx] = el)}
              className="group relative flex flex-col justify-end h-[600px] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950/20 backdrop-blur-md cursor-pointer transition-all duration-700 hover:border-accent/40 hover:shadow-[0_0_50px_rgba(255,77,77,0.08)]"
            >
              {/* Card Image with Parallax & Hover Zoom */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                {/* Fallback elegant gradient background if image isn't loaded yet */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/10 via-zinc-950/40 to-black z-1" />
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transform scale-105 transition-transform duration-1000 ease-out group-hover:scale-110 opacity-70 group-hover:opacity-90"
                />
              </div>

              {/* Glassmorphic border glow line on top (micro-interaction) */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent group-hover:via-accent/50 transition-all duration-700" />

              {/* Card Content */}
              <div className="relative z-10 p-8 flex flex-col justify-end h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent">
                <span className="text-[10px] tracking-[0.4em] font-semibold text-accent mb-3 block">
                  {item.tag}
                </span>
                
                <h3 className="text-2xl font-bold text-white tracking-wide mb-3 flex items-center justify-between group-hover:text-accent transition-colors">
                  {item.title}
                  <span className="opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 text-accent">
                    <ArrowUpRight className="w-5 h-5" />
                  </span>
                </h3>

                <p className="text-muted-text text-sm tracking-wide leading-relaxed font-light mb-6 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                  {item.desc}
                </p>

                <div className="w-full h-[1px] bg-zinc-800 group-hover:bg-accent/30 transition-colors duration-500 mb-6" />

                <span className="text-xs text-white/90 font-medium tracking-[0.2em] uppercase group-hover:translate-x-2 transition-transform duration-500 inline-flex items-center gap-2">
                  VIEW COLLECTION <span className="text-accent">→</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
