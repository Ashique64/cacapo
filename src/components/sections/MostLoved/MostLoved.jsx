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
      className="shrink-0 w-[85vw] sm:w-[50vw] md:w-[32vw] h-[60vh] sm:h-[65vh] md:h-[75vh] flex flex-col justify-between p-6 bg-zinc-950/40 border border-zinc-800/80 rounded-none backdrop-blur-md relative overflow-hidden group hover:border-accent/30 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,77,77,0.03)]"
    >
      {/* Ambient Background Light */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full pointer-events-none" />

      {/* Product Image Panel - rounded-none */}
      <div className="w-full h-1/2 rounded-none overflow-hidden relative border border-zinc-900">
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
      <div className="flex flex-col grow justify-between mt-6">
        <div>
          <div className="mb-2">
            <Link href={`/products/${product.slug}`} className="hover:text-accent transition-colors block">
              <h3 className="text-lg md:text-xl font-bold tracking-wide text-zinc-100 group-hover:text-white transition-colors">
                {product.name}
              </h3>
            </Link>
            {/* Stock Availability status indicator */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[9px] tracking-[0.2em] text-muted-text uppercase font-light font-sans">
                Atelier Drop
              </span>
            </div>
          </div>

          {/* Proportional, aligned Rupee Currency Symbol style */}
          <div className="text-2xl font-semibold tracking-tight text-accent font-mono mt-3 flex items-baseline gap-0.5">
            <span className="text-lg font-sans font-normal">₹</span>
            <span>{product.price.replace("₹", "")}</span>
          </div>
        </div>

        {/* Purchase Button Action */}
        <div className="mt-6">
          <button className="w-full py-3 bg-zinc-900 border border-zinc-800 text-xs font-semibold tracking-[0.2em] rounded-none text-white hover:bg-white hover:text-black hover:border-transparent transition-all duration-500 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]">
            <ShoppingBag className="w-4 h-4" />
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
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Refresh ScrollTrigger after a short delay to ensure card image heights/widths are fully resolved
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 600);

    return () => {
      clearTimeout(refreshTimeout);
      pinAnim.scrollTrigger?.kill();
      pinAnim.kill();
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
  ];

  return (
    <div ref={triggerRef} className="bg-black select-none w-full relative overflow-hidden">
      {/* Scroll timeline height container */}
      <div
        ref={sectionRef}
        className="h-screen flex items-center justify-start relative px-[10vw] gap-12 w-fit bg-black"
        style={{ willChange: "transform" }}
      >
        {/* Intro Slide */}
        <div className="shrink-0 w-[80vw] md:w-[45vw] flex flex-col justify-center pr-12">
          <span className="text-xs font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
            NEW ARRIVALS
          </span>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white uppercase leading-none">
            LATEST <span className="text-accent">RELEASES</span>
          </h2>
          <p className="text-muted-text text-sm md:text-base tracking-wide mt-6 leading-relaxed font-light max-w-sm">
            Explore our newest seasonal drops. A fresh curation of contemporary silhouettes, refined textures, and modern essentials designed to elevate your wardrobe for the season ahead.
          </p>
          <div className="mt-8 flex items-center gap-3 text-xs tracking-widest text-muted-text">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            <span>SCROLL TO EXPLORE DROPS</span>
          </div>
        </div>

        {/* Product Cards */}
        {products.map((product, idx) => (
          <ProductCard key={idx} product={product} />
        ))}

        {/* End Outro Slide */}
        <div className="shrink-0 w-[50vw] flex flex-col justify-center pl-12">
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
