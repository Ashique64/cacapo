"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, X, ArrowRight, Check } from "lucide-react";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";

export default function WishlistPage() {
  const { user } = useAuthStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const addItem = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setCartOpen);

  const [mounted, setMounted] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [errors, setErrors] = useState({});
  const [addedStates, setAddedStates] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMoveToBag = (product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const selectedSize = selectedSizes[product.id] || "";

    if (hasVariants && !selectedSize) {
      setErrors((prev) => ({ ...prev, [product.id]: "CHOOSE SIZE" }));
      return;
    }

    setErrors((prev) => ({ ...prev, [product.id]: "" }));

    let variant = null;
    if (hasVariants) {
      variant = product.variants.find((v) => v.size === selectedSize);
    }

    // Add to Zustand Cart Store
    addItem(product, variant, 1, user?.id);
    setCartOpen(true);

    // Show visual check confirmation
    setAddedStates((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedStates((prev) => ({ ...prev, [product.id]: false }));
    }, 2000);
  };

  const wishlistCount = mounted ? wishlistItems.length : 0;

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
            Curated designs saved in your private archives. Select sizing options to add them to your cart, or remove them at any time.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistItems.map((product) => {
                const displayPrice = (product.price / 100).toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                });
                const images = product.images && product.images.length > 0 ? product.images : ["/Images/clothing.jpg"];
                const sizes = product.variants ? Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) : [];
                const hasVariants = product.variants && product.variants.length > 0;
                const selectedSize = selectedSizes[product.id] || "";
                const error = errors[product.id] || "";
                const isAdded = addedStates[product.id] || false;

                return (
                  <div 
                    key={product.id} 
                    className="group flex flex-col bg-zinc-950/40 border border-zinc-900 relative overflow-hidden transition-all duration-500 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(255,77,77,0.03)]"
                  >
                    
                    {/* Image frame with aspect ratio 15/16 */}
                    <div className="w-full overflow-hidden relative" style={{ aspectRatio: "15/16" }}>
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

                    {/* Meta info & Quick Sizing Selection */}
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

                        {/* Size Picker for products with variants */}
                        {hasVariants && (
                          <div className="mt-4 pt-4 border-t border-zinc-900/60">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] tracking-widest text-zinc-500 uppercase">
                                Select Size
                              </span>
                              {error && (
                                <span className="text-[9px] tracking-widest text-accent font-mono uppercase">
                                  {error}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {sizes.map((size) => {
                                const sizeVariant = product.variants.find((v) => v.size === size);
                                const isOutOfStock = sizeVariant ? sizeVariant.stock_quantity <= 0 : false;
                                const isSelected = selectedSize === size;
                                return (
                                  <button
                                    key={size}
                                    disabled={isOutOfStock}
                                    onClick={() => {
                                      setSelectedSizes((prev) => ({ ...prev, [product.id]: size }));
                                      setErrors((prev) => ({ ...prev, [product.id]: "" }));
                                    }}
                                    className={`text-[9px] min-w-[32px] h-7 px-2 border transition-all flex items-center justify-center cursor-pointer ${
                                      isOutOfStock 
                                        ? "border-zinc-900/40 text-zinc-800 line-through cursor-not-allowed bg-zinc-950/20" 
                                        : isSelected 
                                        ? "border-accent bg-accent/10 text-accent font-bold" 
                                        : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                                    }`}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add to Bag Action CTA */}
                      <div className="mt-6 pt-4 border-t border-zinc-900/60">
                        <button
                          onClick={() => handleMoveToBag(product)}
                          className={`w-full py-2.5 border text-[10px] font-semibold tracking-[0.2em] transition-all duration-300 uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                            isAdded 
                              ? "border-accent bg-accent text-white" 
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:bg-white hover:text-black hover:border-white"
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {isAdded ? "ADDED ✓" : "ADD TO BAG"}
                        </button>
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
