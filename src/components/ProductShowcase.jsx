"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ShoppingBag, Star, Sparkles } from "lucide-react";

export default function ProductShowcase() {
  const triggerRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const scrollSection = sectionRef.current;
    const triggerSection = triggerRef.current;

    // Calculate horizontal scroll distance
    const getScrollAmount = () => {
      return -(scrollSection.scrollWidth - window.innerWidth);
    };

    const pinAnim = gsap.to(scrollSection, {
      x: getScrollAmount,
      ease: "none",
      scrollTrigger: {
        trigger: triggerSection,
        start: "top top",
        end: () => `+=${scrollSection.scrollWidth - window.innerWidth}`,
        scrub: 0.5,
        pin: true,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      pinAnim.scrollTrigger?.kill();
      pinAnim.kill();
    };
  }, []);

  const products = [
    {
      name: "SILK SLIP ARCHIVE DRESS",
      category: "Clothing",
      price: "$1,850",
      rating: "4.9",
      image: "/Images/clothing.jpg",
      details: ["100% Mulberry Silk", "Bias-cut silhouette", "Asymmetric hemline"],
    },
    {
      name: "PLATINUM BLOCK HEEL",
      category: "Footwear",
      price: "$980",
      rating: "4.8",
      image: "/Images/footwear.jpg",
      details: ["Italian Calf Leather", "65mm Sculpted Heel", "Hand-stitched sole"],
    },
    {
      name: "GEOMETRIC CLASP TOTE",
      category: "Accessories",
      price: "$2,400",
      rating: "5.0",
      image: "/Images/accessories.jpg",
      details: ["Milled Grain Leather", "Solid Brass Clasp", "Suede Lining"],
    },
    {
      name: "DRAPED CASHMERE TRENCH",
      category: "Clothing",
      price: "$3,200",
      rating: "4.9",
      image: "/Images/clothing.jpg", // Reusing clothing for couture look
      details: ["Pure Italian Cashmere", "Double-breasted front", "Relaxed fit"],
    },
    {
      name: "CHAMPAGNE STRAP HEELS",
      category: "Footwear",
      price: "$1,100",
      rating: "4.7",
      image: "/Images/footwear.jpg", // Reusing footwear for couture look
      details: ["Satin Finish Straps", "Gilded Metal Buckle", "Cushioned Insole"],
    },
  ];

  return (
    <div ref={triggerRef} className="bg-black select-none">
      {/* Scroll timeline height container */}
      <div
        ref={sectionRef}
        className="h-screen flex items-center justify-start relative px-[10vw] gap-12 w-fit bg-black"
        style={{ willChange: "transform" }}
      >
        {/* Intro Slide */}
        <div className="flex-shrink-0 w-[80vw] md:w-[45vw] flex flex-col justify-center pr-12">
          <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
            LIMITED EDITION
          </span>
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight text-white leading-tight uppercase">
            Signature <br />
            <span className="text-accent">
              Editions
            </span>
          </h2>
          <p className="text-muted-text text-sm tracking-wide mt-6 leading-relaxed font-light">
            Every piece is numbered, crafted in extremely small batches, and represents the zenith of our design language. Swipe or scroll down to explore the details of each garment.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs tracking-widest text-muted-text">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            <span>SCROLL DOWN TO INERTIA SLIDE</span>
          </div>
        </div>

        {/* Product Cards */}
        {products.map((product, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-[85vw] sm:w-[50vw] md:w-[32vw] h-[75vh] flex flex-col justify-between p-6 bg-zinc-950/40 border border-zinc-800/80 rounded-[2.5rem] backdrop-blur-md relative overflow-hidden group hover:border-accent/30 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,77,77,0.03)]"
          >
            {/* Ambient Background Light */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full pointer-events-none" />

            {/* Product Image Panel */}
            <div className="w-full h-1/2 rounded-[2rem] overflow-hidden relative border border-zinc-900">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-1 pointer-events-none" />
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover transform scale-100 transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/60 border border-white/10 text-[9px] tracking-widest rounded-full text-white backdrop-blur-sm">
                {product.category.toUpperCase()}
              </span>
            </div>

            {/* Card Info Section */}
            <div className="flex flex-col flex-grow justify-between mt-6">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg md:text-xl font-bold tracking-wide text-zinc-100 group-hover:text-white transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-accent font-mono">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{product.rating}</span>
                  </div>
                </div>

                <div className="text-2xl font-semibold tracking-tight text-accent font-mono mt-1">
                  {product.price}
                </div>

                {/* Specs List */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.details.map((spec, specIdx) => (
                    <span
                      key={specIdx}
                      className="text-[10px] bg-zinc-900/60 border border-zinc-800 text-muted-text px-3 py-1 rounded-full font-light tracking-wide"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Purchase Button Action */}
              <div className="mt-6">
                <button className="w-full py-3 bg-zinc-900 border border-zinc-800 text-xs font-semibold tracking-[0.2em] rounded-full text-white hover:bg-white hover:text-black hover:border-transparent transition-all duration-500 flex items-center justify-center gap-2 cursor-pointer">
                  <ShoppingBag className="w-4 h-4" />
                  ACQUIRE ITEM
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* End Outro Slide */}
        <div className="flex-shrink-0 w-[50vw] flex flex-col justify-center pl-12">
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-700 tracking-tight leading-none uppercase">
            END OF <br />
            <span className="text-muted-text font-light font-serif italic">Edition</span>
          </h2>
          <p className="text-muted-text text-xs mt-4 tracking-widest max-w-xs font-light">
            Keep scrolling down to explore the brand story and vision behind the CACAPO house.
          </p>
        </div>
      </div>
    </div>
  );
}
