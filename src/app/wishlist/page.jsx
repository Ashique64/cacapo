"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Heart, X, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/store/useWishlistStore";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";

export default function WishlistPage() {
  const wishlistItems = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wishlistCount = useMemo(() => mounted ? wishlistItems.length : 0, [mounted, wishlistItems]);

  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-black text-white min-h-screen pt-24 overflow-x-hidden">
        
        {/* Title Block */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 select-none relative z-10 text-center md:text-left">
          <span className="text-[10px] font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
            YOUR ARCHIVE
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white uppercase font-sans">
            THE <span className="text-accent">WISHLIST</span>
          </h1>
          <p className="text-xs text-muted-text tracking-wide mt-3 font-light max-w-md leading-relaxed mx-auto md:mx-0">
            Curated designs saved in your private archives. Select designs to view options and sizing details, or remove them at any time.
          </p>
        </div>

        {/* Empty State */}
        {mounted && wishlistCount === 0 && (
          <div className="max-w-7xl mx-auto px-6 py-20 text-center select-none relative z-10">
            <div className="inline-flex p-5 bg-zinc-950/60 border border-zinc-900 rounded-none mb-6 text-zinc-500">
              <Heart className="w-8 h-8 stroke-1" />
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-wider text-zinc-300 uppercase mb-3">
              YOUR WISHLIST IS EMPTY
            </h2>
            <p className="text-xs text-muted-text tracking-wide max-w-xs mx-auto mb-8 font-light leading-relaxed">
              Find and save pieces that resonate with your personal aesthetic. Explore our catalog to add products.
            </p>
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 px-8 py-3.5 border border-zinc-700 bg-white text-black text-xs font-semibold tracking-[0.2em] transition-all hover:bg-black hover:text-white hover:border-white uppercase"
            >
              Explore Shop <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {mounted && wishlistCount > 0 && (
          <div className="max-w-7xl mx-auto px-6 pb-24 select-none relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {wishlistItems.map((product) => {
                const displayPrice = (product.price / 100).toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                });
                const images = product.images && product.images.length > 0 ? product.images : ["/Images/clothing.jpg"];

                return (
                  <div 
                    key={product.id} 
                    className="group flex flex-col bg-zinc-950/40 border border-zinc-900 relative overflow-hidden transition-all duration-500 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(255,77,77,0.03)]"
                  >
                    
                    {/* Image frame with aspect ratio 15/16 on mobile/tablet and square on desktop */}
                    <div className="w-full overflow-hidden relative aspect-15/16 lg:aspect-square">
                      <Link href={`/shop/${product.slug}`} className="block w-full h-full">
                        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/50 z-2 pointer-events-none" />
                        <img 
                          src={images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700" 
                        />
                      </Link>

                      {/* Remove from wishlist button */}
                      <button 
                        onClick={() => removeItem(product.id)}
                        className="absolute top-3 right-3 p-1.5 bg-black/60 border border-white/10 hover:border-accent hover:text-accent rounded-full text-zinc-400 transition-all z-10 active:scale-90 cursor-pointer"
                        title="Remove Item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Brand Label */}
                      {product.brand && (
                        <span className="absolute bottom-3 left-3 text-[9px] tracking-[0.3em] font-semibold text-accent uppercase font-sans z-10">
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="p-4 flex flex-col justify-between grow">
                      <div>
                        <Link href={`/shop/${product.slug}`} className="hover:text-accent transition-colors block">
                          <h3 className="text-xs font-semibold tracking-wide text-zinc-200 truncate">
                            {product.name}
                          </h3>
                        </Link>
                        <div className="mt-2 text-xs font-bold font-mono text-accent flex items-baseline gap-0.5">
                          <span className="text-[10px] font-sans font-normal">₹</span>
                          <span>{displayPrice}</span>
                        </div>
                      </div>

                      {/* View Details CTA */}
                      <div className="mt-6 pt-4 border-t border-zinc-900/60">
                        <Link
                          href={`/shop/${product.slug}`}
                          className="w-full py-2.5 border border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:bg-white hover:text-black hover:border-white text-[10px] font-semibold tracking-[0.2em] transition-all duration-300 uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                          VIEW DETAILS
                        </Link>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
      <Footer />
    </SmoothScroll>
  );
}
