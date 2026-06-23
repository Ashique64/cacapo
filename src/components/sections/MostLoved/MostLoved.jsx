"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ShoppingBag, Sparkles, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useAuthStore } from "@/store/useAuthStore";

// No local fallback mock data — loads exclusively from Supabase

function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const wishlistItems = useWishlistStore((state) => state.items);

  const isWishlisted = wishlistItems.some((item) => item.id === product.id);
  const images = product.images && product.images.length > 0 ? product.images : ["/Images/clothing.jpg"];
  const hasVariants = product.variants && product.variants.length > 0;
  const variantHasStock = hasVariants && product.variants.some((v) => v.stock_quantity > 0);
  const isCardOutOfStock = product.status === "draft" || (hasVariants ? !variantHasStock : product.stock_quantity <= 0);

  const activePrice = product.sale_price ? product.sale_price : product.price;
  const originalPrice = product.sale_price ? product.price : null;

  const displayPrice = (activePrice / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const displayOriginalPrice = originalPrice ? (originalPrice / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) : null;

  useEffect(() => {
    if (!isHovered) {
      setCurrentImageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHovered, images]);

  const handleAddBag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCardOutOfStock) return;
    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    addItem(product, defaultVariant, 1, user?.id);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="shrink-0 w-full lg:w-[32vw] h-[44vh] sm:h-[50vh] md:h-[35vh] lg:h-[75vh] flex flex-col justify-between p-4 md:p-4 lg:p-6 bg-zinc-950/40 border border-accent/30 sm:border-zinc-800/80 rounded-none backdrop-blur-md relative overflow-hidden group hover:border-accent/30 transition-all duration-700 hover:shadow-[0_0_40px_rgba(255,77,77,0.03)]"
    >
      {/* Ambient Background Light */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] rounded-full pointer-events-none" />

      {/* Product Image Panel */}
      <div className="w-full h-[62%] lg:h-1/2 rounded-none overflow-hidden relative border border-zinc-900">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/60 z-2 pointer-events-none" />

        <Link href={`/shop/${product.slug}`} className="block w-full h-full" aria-label={`View ${product.name}`}>
          {/* Sliding Images Container */}
          <div
            className="flex h-full w-full transition-transform duration-700 ease-in-out z-0"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((img, i) => (
              <div key={i} className="relative w-full h-full shrink-0">
                <Image
                  src={img}
                  alt={`${product.name} — view ${i + 1}`}
                  fill
                  sizes="(max-width: 1024px) 80vw, 32vw"
                  className="object-cover transform scale-100 group-hover:scale-105 transition-transform duration-1000"
                  loading={i === 0 ? "eager" : "lazy"}
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </Link>

        {/* Sold Out Overlay */}
        {isCardOutOfStock && (
          <span className="absolute top-4 left-4 bg-black/85 border border-red-500/30 text-red-500 text-[8px] font-extrabold tracking-widest px-2.5 py-1 uppercase z-10 font-mono">
            Sold Out
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 border border-white/10 hover:border-accent/40 hover:bg-black/80 rounded-full text-white hover:text-accent transition-all duration-300 pointer-events-auto cursor-pointer group/wishlist active:scale-90"
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-accent text-accent" : "fill-transparent"} group-hover/wishlist:fill-accent transition-all`} />
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
            {/* New Arrival Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[9px] tracking-[0.2em] text-muted-text uppercase font-light font-sans">
                New Arrival
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="text-xl sm:text-2xl md:text-xl lg:text-2xl font-semibold tracking-tight text-accent font-mono mt-2 md:mt-1 lg:mt-3 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-lg font-sans font-normal">₹</span>
            <span>{displayPrice}</span>
            {displayOriginalPrice && (
              <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-500 line-through">
                ₹{displayOriginalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Purchase Button */}
        <div className="mt-3 lg:mt-6">
          <Link
            href={`/shop/${product.slug}`}
            className="w-full py-2.5 md:py-3 text-[10px] sm:text-xs font-semibold tracking-[0.2em] rounded-none transition-all duration-500 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] bg-zinc-900 border border-zinc-800 text-white hover:bg-white hover:text-black hover:border-transparent"
          >
            {isCardOutOfStock ? "VIEW DETAILS (SOLD OUT)" : "VIEW DETAILS"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase({ initialProducts }) {
  const triggerRef = useRef(null);
  const sectionRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts || initialProducts.length === 0);

  // Fetch newest active products from Supabase if not provided
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      return;
    }

    async function loadNewArrivals() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id, name, slug, price,
            product_images(image_url, sort_order),
            product_variants(id, size, color, price, stock_quantity)
          `)
          .in("status", ["active", "draft"])
          .eq("featured", true)
          .order("created_at", { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          const formatted = data.map((p) => ({
            ...p,
            images: p.product_images
              ? p.product_images
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((img) => img.image_url)
              : ["/Images/clothing.jpg"],
            variants: p.product_variants || [],
          }));
          setProducts(formatted);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Failed to load new arrivals:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    loadNewArrivals();
  }, [initialProducts]);

  const handleScroll = (e) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const cardWidth = e.currentTarget.scrollWidth / Math.max(products.length, 1);
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIdx(Math.min(products.length - 1, Math.max(0, index)));
  };

  // GSAP horizontal scroll — only desktop, re-init when products load
  useEffect(() => {
    if (products.length === 0 || !sectionRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const scrollSection = sectionRef.current;
    const triggerSection = triggerRef.current;

    const getScrollAmount = () => -(scrollSection.scrollWidth - window.innerWidth);

    const mm = gsap.matchMedia();

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

    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 600);

    return () => {
      clearTimeout(refreshTimeout);
      mm.revert();
    };
  }, [products]);

  return (
    <div ref={triggerRef} className="bg-black select-none w-full relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-32 gap-3 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className="text-xs tracking-[0.3em] font-mono uppercase">Loading New Arrivals…</span>
        </div>
      )}

      {!loading && (
        <>
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

          {/* Mobile/Tablet Carousel */}
          <div className="lg:hidden w-full relative">
            <div
              onScroll={handleScroll}
              className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-6 pb-6 pt-0 w-full"
            >
              {products.map((product, idx) => (
                <div key={product.id || idx} className="snap-center shrink-0 w-[80vw] sm:w-[50vw] md:w-[45vw]">
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
                    width: `${100 / Math.max(products.length, 1)}%`,
                    left: `${(activeIdx / Math.max(products.length, 1)) * 100}%`,
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

          {/* Desktop Horizontal Scroll */}
          <div
            ref={sectionRef}
            className="hidden lg:flex lg:flex-row lg:items-center lg:justify-start lg:relative lg:px-[10vw] lg:gap-12 lg:w-fit lg:bg-black lg:py-0 lg:overflow-x-visible lg:max-w-none lg:mx-0 lg:h-screen"
            style={{ willChange: "transform" }}
          >
            {/* Intro Slide */}
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
              <div key={product.id || idx} className="lg:shrink-0 lg:w-[32vw]">
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
        </>
      )}
    </div>
  );
}
