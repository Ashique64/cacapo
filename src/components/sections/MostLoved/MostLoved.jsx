"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ShoppingBag, Sparkles, Heart } from "lucide-react";

function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      setCurrentImageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isHovered, product.images]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="shrink-0 w-full lg:w-[32vw] h-[44vh] sm:h-[50vh] md:h-[35vh] lg:h-[75vh] flex flex-col justify-between p-4 md:p-4 lg:p-6 bg-zinc-950/40 border border-accent/30 sm:border-zinc-800/80 rounded-none backdrop-blur-md relative overflow-hidden group hover:border-accent/30 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,77,77,0.03)]"
    >
      {/* Ambient Background Light */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full pointer-events-none" />

      {/* Product Image Panel - rounded-none */}
      <div className="w-full h-[62%] lg:h-1/2 rounded-none overflow-hidden relative border border-zinc-900">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/60 z-2 pointer-events-none" />
        
        {/* Sliding Images Container */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out z-0"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {product.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={product.name}
              className="w-full h-full object-cover shrink-0 transform scale-100 group-hover:scale-105 transition-transform duration-1000"
            />
          ))}
        </div>

        {/* Premium Wishlist Overlay Button */}
        <button className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 border border-white/10 hover:border-accent/40 hover:bg-black/80 rounded-full text-white hover:text-accent transition-all duration-300 pointer-events-auto cursor-pointer group/wishlist active:scale-90">
          <Heart className="w-3.5 h-3.5 fill-transparent group-hover/wishlist:fill-accent transition-all" />
        </button>
      </div>

      {/* Card Info Section */}
      <div className="flex flex-col grow justify-between mt-3 md:mt-3 lg:mt-6">
        <div>
          <div className="mb-2">
            <Link href={`/shop/${product.slug}`} className="hover:text-accent transition-colors block">
              <h3 className="text-sm sm:text-base md:text-base lg:text-xl font-bold tracking-wide text-zinc-100 group-hover:text-white transition-colors truncate lg:whitespace-normal">
                {product.name}
              </h3>
            </Link>
            {/* Stock Availability status indicator */}
            <div className="hidden lg:flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[9px] tracking-[0.2em] text-muted-text uppercase font-light font-sans">
                Atelier Drop
              </span>
            </div>
          </div>

          {/* Proportional, aligned Rupee Currency Symbol style */}
          <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl font-semibold tracking-tight text-accent font-mono mt-2 md:mt-1 lg:mt-3 flex items-baseline gap-0.5">
            <span className="text-sm sm:text-lg font-sans font-normal">₹</span>
            <span>{product.price.replace("₹", "")}</span>
          </div>
        </div>

        {/* Purchase Button Action */}
        <div className="mt-3 lg:mt-6">
          <button className="w-full py-2.5 md:py-3 bg-zinc-900 border border-zinc-800 text-[10px] sm:text-xs font-semibold tracking-[0.2em] rounded-none text-white hover:bg-white hover:text-black hover:border-transparent transition-all duration-500 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
            <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
            ADD TO BAG
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  const triggerRef = useRef(null);
  const sectionRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = (e) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const cardWidth = e.currentTarget.scrollWidth / products.length;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIdx(Math.min(products.length - 1, Math.max(0, index)));
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const scrollSection = sectionRef.current;
    const triggerSection = triggerRef.current;

    // Calculate horizontal scroll distance
    const getScrollAmount = () => {
      return -(scrollSection.scrollWidth - window.innerWidth);
    };

    const mm = gsap.matchMedia();

    // Enable horizontal scroll trigger ONLY on desktop screens (>= 1024px)
    mm.add("(min-width: 1024px)", () => {
      const pinAnim = gsap.to(scrollSection, {
        x: getScrollAmount,
        ease: "none",
        scrollTrigger: {
          trigger: triggerSection,
          start: "top top",
          end: () => `+=${scrollSection.scrollWidth - window.innerWidth}`,
          scrub: 0.5,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        pinAnim.scrollTrigger?.kill();
        pinAnim.kill();
      };
    });

    // Refresh ScrollTrigger after a short delay to ensure card heights/widths are fully resolved
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 600);

    return () => {
      clearTimeout(refreshTimeout);
      mm.revert();
    };
  }, []);

  const products = [
    {
      name: "SILK SLIP ARCHIVE DRESS",
      category: "Clothing",
      price: "₹1,850",
      image: "/Images/clothing.jpg",
      images: ["/Images/clothing.jpg", "/Images/clothing.jpg", "/Images/clothing.jpg"],
      slug: "silk-slip-archive-dress",
    },
    {
      name: "PLATINUM BLOCK HEEL",
      category: "Footwear",
      price: "₹980",
      image: "/Images/footwear.jpg",
      images: ["/Images/footwear.jpg", "/Images/footwear.jpg", "/Images/footwear.jpg"],
      slug: "platinum-block-heel",
    },
    {
      name: "GEOMETRIC CLASP TOTE",
      category: "Accessories",
      price: "₹2,400",
      image: "/Images/accessories.jpg",
      images: ["/Images/accessories.jpg", "/Images/accessories.jpg", "/Images/accessories.jpg"],
      slug: "geometric-clasp-tote",
    },
    {
      name: "DRAPED CASHMERE TRENCH",
      category: "Clothing",
      price: "₹3,200",
      image: "/Images/clothing.jpg",
      images: ["/Images/clothing.jpg", "/Images/clothing.jpg", "/Images/clothing.jpg"],
      slug: "draped-cashmere-trench",
    },
    {
      name: "CHAMPAGNE STRAP HEELS",
      category: "Footwear",
      price: "₹1,100",
      image: "/Images/footwear.jpg",
      images: ["/Images/footwear.jpg", "/Images/footwear.jpg", "/Images/footwear.jpg"],
      slug: "champagne-strap-heels",
    },
    {
      name: "TEXTURED GOLD CHOKER",
      category: "Accessories",
      price: "₹1,450",
      image: "/Images/accessories.jpg",
      images: ["/Images/accessories.jpg", "/Images/accessories.jpg", "/Images/accessories.jpg"],
      slug: "textured-gold-choker",
    },
  ];

  return (
    <div ref={triggerRef} className="bg-black select-none w-full relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
      {/* Mobile/Tablet Title Section */}
      <div className="block lg:hidden px-4 md:px-8 pt-12 md:pt-16 max-w-7xl mx-auto relative z-10">
        <div className="text-center md:text-left mb-10 lg:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
              NEW ARRIVALS
            </span>
            <h2 className="text-4xl md:text-4xl lg:text-6xl font-bold tracking-tight text-white uppercase">
              LATEST <span className="text-accent">RELEASES</span>
            </h2>
          </div>
          <p className="text-muted-text text-sm md:text-sm lg:text-base max-w-sm tracking-wide font-light">
            Explore our newest seasonal drops. A fresh curation of contemporary silhouettes, refined textures, and modern essentials designed to elevate your wardrobe for the season ahead.
          </p>
        </div>
      </div>

      {/* Mobile/Tablet Carousel (lg:hidden) */}
      <div className="lg:hidden w-full relative">
        <div
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-6 pb-6 pt-0 w-full"
        >
          {products.map((product, idx) => (
            <div key={idx} className="snap-center shrink-0 w-[80vw] sm:w-[50vw] md:w-[45vw]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        
        {/* Carousel Progress Bar */}
        <div className="flex flex-col items-center mt-4 mb-12">
          <div className="w-24 h-px bg-zinc-900 relative">
            <div
              className="absolute h-full bg-accent transition-all duration-300 ease-out"
              style={{
                width: `${100 / products.length}%`,
                left: `${(activeIdx / products.length) * 100}%`,
              }}
            />
          </div>
          <div className="flex gap-2 mt-3 text-[9px] tracking-widest text-zinc-500 font-mono">
            <span>{(activeIdx + 1).toString().padStart(2, "0")}</span>
            <span>/</span>
            <span>{products.length.toString().padStart(2, "0")}</span>
          </div>
        </div>
      </div>

      {/* Desktop Container (hidden lg:flex) */}
      <div
        ref={sectionRef}
        className="hidden lg:flex lg:flex-row lg:items-center lg:justify-start lg:relative lg:px-[10vw] lg:gap-12 lg:w-fit lg:bg-black lg:py-0 lg:overflow-x-visible lg:max-w-none lg:mx-0 lg:h-screen"
        style={{
          willChange: "transform",
        }}
      >
        {/* Intro Slide (Desktop horizontal layout only) */}
        <div className="lg:shrink-0 lg:w-[45vw] lg:flex lg:flex-col lg:justify-center lg:pr-12">
          <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
            NEW ARRIVALS
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-6xl font-bold tracking-tight text-white uppercase leading-none">
            LATEST <span className="text-accent">RELEASES</span>
          </h2>
          <p className="text-muted-text text-xs sm:text-sm md:text-sm lg:text-base tracking-wide mt-4 md:mt-6 leading-relaxed font-light max-w-sm">
            Explore our newest seasonal drops. A fresh curation of contemporary silhouettes, refined textures, and modern essentials designed to elevate your wardrobe for the season ahead.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs tracking-widest text-muted-text">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            <span>SCROLL TO EXPLORE DROPS</span>
          </div>
        </div>

        {/* Product Cards */}
        {products.map((product, idx) => (
          <div key={idx} className="lg:shrink-0 lg:w-[32vw]">
            <ProductCard product={product} />
          </div>
        ))}

        {/* End Outro Slide */}
        <div className="lg:shrink-0 lg:w-[50vw] lg:flex lg:flex-col lg:justify-center lg:pl-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-700 tracking-tight leading-none uppercase">
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
