"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  Info, 
  Truck, 
  Ruler, 
  Share2, 
  Check 
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useAuthStore } from "@/store/useAuthStore";

const SIZE_ORDER = {
  "XXS": 1,
  "XS": 2,
  "S": 3,
  "M": 4,
  "L": 5,
  "XL": 6,
  "XXL": 7,
  "XXXL": 8,
  "3XL": 9,
  "4XL": 10
};

function sortSizes(sizesArray) {
  return [...sizesArray].sort((a, b) => {
    const orderA = SIZE_ORDER[a.toUpperCase()];
    const orderB = SIZE_ORDER[b.toUpperCase()];
    
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) return -1;
    if (orderB !== undefined) return 1;

    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    return a.localeCompare(b);
  });
}

export default function ProductDetailsClient({ product, relatedProducts }) {
  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const wishlistItems = useWishlistStore((state) => state.items);

  // Gallery State
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  
  // Magnifier Zoom State (Desktop)
  const [zoomStyle, setZoomStyle] = useState({ display: "none" });
  const [isZooming, setIsZooming] = useState(false);
  const mainImageRef = useRef(null);

  // Variants State
  const unsortedSizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)));
  const sizes = sortSizes(unsortedSizes);
  const firstInStockVariant = product.variants
    ?.filter((v) => v.stock_quantity > 0)
    .sort((a, b) => sizes.indexOf(a.size) - sizes.indexOf(b.size))[0] || null;
  const [selectedSize, setSelectedSize] = useState(firstInStockVariant?.size || sizes[0] || "");
  const [errorMsg, setErrorMsg] = useState("");

  // Quantity State
  const [quantity, setQuantity] = useState(1);

  // Accordion State
  const [openSection, setOpenSection] = useState("description");

  // Success Message State
  const [addedState, setAddedState] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  // Check if current product is in wishlist
  const isWishlisted = wishlistItems.some((item) => item.id === product.id);

  const images = product.images && product.images.length > 0 ? product.images : ["/Images/clothing.jpg"];
  
  // Find current selected variant
  const currentVariant = product.variants.find((v) => v.size === selectedSize) || null;
  const isOutOfStock = product.status === "draft" || (currentVariant ? currentVariant.stock_quantity <= 0 : product.variants.length > 0 && !firstInStockVariant);

  // Pricing
  const regularPrice = (currentVariant && currentVariant.price) ? currentVariant.price : product.price;
  const salePrice = (currentVariant && currentVariant.sale_price) ? currentVariant.sale_price : product.sale_price;

  const activePrice = salePrice ? salePrice : regularPrice;
  const originalPrice = salePrice ? regularPrice : null;

  const displayPrice = (activePrice / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const displayOriginalPrice = originalPrice ? (originalPrice / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) : null;

  // Share link copy handler
  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }
  };

  // Magnifier MouseMove Handlers
  const handleMouseMove = (e) => {
    if (!mainImageRef.current) return;
    const { left, top, width, height } = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: "block",
      backgroundImage: `url(${images[activeImgIdx]})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: "200%",
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none" });
    setIsZooming(false);
  };

  // Mobile Carousel Scroll & Click Handlers
  const mobileScrollRef = useRef(null);

  const handleMobileScroll = () => {
    if (!mobileScrollRef.current) return;
    const container = mobileScrollRef.current;
    const width = container.clientWidth;
    if (width === 0) return;
    const index = Math.round(container.scrollLeft / width);
    if (index >= 0 && index < images.length && index !== activeImgIdx) {
      setActiveImgIdx(index);
    }
  };

  const handleArrowClick = (direction) => {
    if (!mobileScrollRef.current) return;
    const container = mobileScrollRef.current;
    const width = container.clientWidth;
    if (width === 0) return;
    
    let nextIdx = activeImgIdx;
    if (direction === "prev") {
      nextIdx = activeImgIdx === 0 ? images.length - 1 : activeImgIdx - 1;
    } else {
      nextIdx = activeImgIdx === images.length - 1 ? 0 : activeImgIdx + 1;
    }
    
    container.scrollTo({
      left: nextIdx * width,
      behavior: "smooth"
    });
    setActiveImgIdx(nextIdx);
  };

  // Cart Add Handler
  const handleAddToBag = () => {
    if (product.variants.length > 0 && !selectedSize) {
      setErrorMsg("Please select a size");
      return;
    }
    setErrorMsg("");

    // Add item
    addItem(product, currentVariant, quantity, user?.id);
    setAddedState(true);
    setTimeout(() => setAddedState(false), 3000);
    // Slide open cart sidebar
    setCartOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 md:py-16 select-none relative z-10">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-zinc-500 uppercase mb-8 md:mb-12">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-white transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-zinc-300 truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
        
        {/* LEFT COLUMN: Gallery & Magnifier (Lg: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col md:flex-row-reverse gap-4 sticky top-28">
          
          {/* Desktop Showcase Image & Magnifier */}
          <div 
            ref={mainImageRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={handleMouseLeave}
            style={{ aspectRatio: "15/16" }}
            className="hidden md:block w-full bg-zinc-950/60 border border-zinc-900 overflow-hidden relative cursor-crosshair shrink-0 md:shrink md:flex-1"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-black/10 to-black/60 pointer-events-none z-1" />
            
            <img 
              src={images[activeImgIdx]} 
              alt={product.name}
              className={`w-full h-full object-cover transition-opacity duration-500 ${isZooming ? "opacity-0" : "opacity-100"}`}
            />

            {/* Custom hover zoom magnifier box */}
            <div 
              className="absolute inset-0 pointer-events-none bg-no-repeat"
              style={zoomStyle}
            />
          </div>

          {/* Mobile Showcase Carousel (Supports smooth swiping and arrow clicks) */}
          <div 
            style={{ aspectRatio: "15/16" }}
            className="w-full bg-zinc-950/60 border border-zinc-900 overflow-hidden relative shrink-0 md:hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-transparent via-black/10 to-black/60 pointer-events-none z-10" />

            <div 
              ref={mobileScrollRef}
              onScroll={handleMobileScroll}
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
            >
              {images.map((img, idx) => (
                <div key={idx} className="w-full h-full shrink-0 snap-center">
                  <img 
                    src={img} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Carousel navigation arrows (Visible on touch/tablet) */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArrowClick("prev");
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 border border-white/10 hover:border-accent hover:text-accent rounded-full text-white transition-all z-20 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArrowClick("next");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 border border-white/10 hover:border-accent hover:text-accent rounded-full text-white transition-all z-20 active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Left Thumbnails (Hidden on mobile, vertically stacked on md+) */}
          {images.length > 1 && (
            <div className="hidden md:flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-fit md:px-1 md:h-full md:max-h-full overflow-y-auto no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIdx(idx)}
                  style={{ aspectRatio: "15/16" }}
                  className={`w-20 border-2 overflow-hidden transition-all duration-300 relative ${
                    activeImgIdx === idx ? "border-accent" : "border-zinc-900 hover:border-zinc-600"
                  }`}
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Thumbnails indicator bar on mobile */}
          {images.length > 1 && (
            <div className="flex md:hidden gap-1.5 justify-center mt-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (mobileScrollRef.current) {
                      mobileScrollRef.current.scrollTo({
                        left: idx * mobileScrollRef.current.clientWidth,
                        behavior: "smooth"
                      });
                    }
                    setActiveImgIdx(idx);
                  }}
                  className={`h-1 transition-all rounded-full ${
                    activeImgIdx === idx ? "w-6 bg-accent" : "w-2 bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Product Config & Buy Panel (Lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Metadata Block */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-[10px] tracking-[0.4em] font-semibold text-accent uppercase font-sans">
                {product.brand || "CACAPO"}
              </span>
              
              {/* Share & Wishlist action controls */}
              <div className="flex gap-2">
                <button 
                  onClick={handleShare}
                  className="p-2 bg-zinc-950 border border-zinc-900 hover:border-zinc-700 hover:text-accent rounded-full text-zinc-400 transition-all cursor-pointer relative"
                  title="Copy Link"
                >
                  {copiedState ? <Check className="w-3.5 h-3.5 text-accent" /> : <Share2 className="w-3.5 h-3.5" />}
                  {copiedState && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-mono tracking-widest px-2 py-1 uppercase rounded-sm border border-zinc-800 whitespace-nowrap shadow-md z-20">
                      COPIED ✓
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => toggleWishlist(product)}
                  className="p-2 bg-zinc-950 border border-zinc-900 hover:border-accent/40 rounded-full transition-all cursor-pointer group"
                  title="Add to Wishlist"
                >
                  <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-accent text-accent" : "text-zinc-400 group-hover:text-accent"}`} />
                </button>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-zinc-100 uppercase mb-4 leading-tight">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="flex items-baseline gap-2 mt-4 flex-wrap">
              <span className="text-base text-zinc-400 font-sans font-normal">₹</span>
              <span className="text-3xl font-bold font-mono tracking-tight text-white">{displayPrice}</span>
              {displayOriginalPrice && (
                <span className="text-sm font-semibold font-mono text-zinc-500 line-through ml-2">
                  ₹{displayOriginalPrice}
                </span>
              )}
            </div>

            {/* Color Display */}
            {product.variants?.[0]?.color && (
              <div className="text-[11px] tracking-[0.25em] text-zinc-400 uppercase mt-3">
                Color: <span className="text-zinc-100 font-semibold">{product.variants[0].color}</span>
              </div>
            )}
            
            {/* Inventory alert */}
            {currentVariant && currentVariant.stock_quantity > 0 && currentVariant.stock_quantity <= 3 && (
              <span className="inline-block bg-accent/10 border border-accent/30 text-[9px] tracking-widest font-mono text-accent px-2.5 py-1 uppercase mt-3">
                ONLY {currentVariant.stock_quantity} PIECE{currentVariant.stock_quantity > 1 ? "S" : ""} LEFT
              </span>
            )}
          </div>

          <div className="h-px bg-zinc-900" />

          {/* Sizing Section */}
          {sizes.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs tracking-wider">
                <span className="font-bold uppercase text-zinc-400">Select Size</span>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => {
                  const sizeVariant = product.variants.find((v) => v.size === size);
                  const isSizeOutOfStock = sizeVariant ? sizeVariant.stock_quantity <= 0 : false;
                  const isSelected = selectedSize === size;

                  return (
                    <button
                      key={size}
                      onClick={() => {
                        if (!isSizeOutOfStock) {
                          setSelectedSize(size);
                          setErrorMsg("");
                        }
                      }}
                      className={`h-11 min-w-[50px] px-4 text-xs tracking-widest uppercase transition-all duration-300 border flex items-center justify-center relative cursor-pointer ${
                        isSizeOutOfStock
                          ? "border-zinc-900 text-zinc-700 bg-zinc-950/20 cursor-not-allowed line-through"
                          : isSelected
                          ? "border-accent bg-accent/10 text-accent font-semibold"
                          : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-600 hover:text-white"
                      }`}
                      disabled={isSizeOutOfStock}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="text-[10px] tracking-widest font-mono text-accent uppercase pt-1">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Quantity selector */}
          <div className="space-y-3">
            <span className="block text-xs font-bold tracking-wider uppercase text-zinc-400">Quantity</span>
            <div className="flex items-center border border-zinc-800 bg-zinc-950/40 w-fit">
              <button 
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-12 text-center text-xs font-mono font-bold text-zinc-100">{quantity}</span>
              <button 
                onClick={() => {
                  const maxStock = currentVariant ? currentVariant.stock_quantity : 99;
                  setQuantity((q) => Math.min(maxStock, q + 1));
                }}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Add to Bag Action */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleAddToBag}
              disabled={isOutOfStock}
              className={`w-full py-4 border text-xs font-semibold tracking-[0.25em] transition-all duration-500 uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
                isOutOfStock
                  ? "border-zinc-900 bg-zinc-950 text-zinc-600 cursor-not-allowed"
                  : addedState
                  ? "border-accent bg-accent text-white"
                  : "border-zinc-700 bg-white text-black hover:bg-black hover:text-white hover:border-white"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock ? "SOLD OUT" : addedState ? "ADDED TO BAG ✓" : "ADD TO BAG"}
            </button>
            
            <div className="flex items-center justify-center gap-4 text-[10px] tracking-widest text-zinc-500 uppercase pt-2">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-accent" /> Free Express Shipping
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-accent" /> 14-Day Returns
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-900" />

          {/* Accordion Tabs */}
          <div className="space-y-3 pt-2">
            {[
              { 
                id: "description", 
                title: "Product Description", 
                content: product.description || "No description available." 
              },
              { 
                id: "sizing", 
                title: "Sizing & Fit", 
                content: "Tailored to contour the form. Runs true to standard European sizing. Models in photos wear Size S / 38. If in between sizes, we recommend sizing up." 
              },
              { 
                id: "shipping", 
                title: "Shipping & Returns", 
                content: "Complimentary express delivery in signature recyclable CACAPO packaging. Items returned in original, unworn condition with tags attached are eligible for full refund or store exchange within 14 days." 
              }
            ].map((section) => {
              const isOpen = openSection === section.id;
              return (
                <div key={section.id} className="border-b border-zinc-900 pb-3">
                  <button
                    onClick={() => setOpenSection(isOpen ? "" : section.id)}
                    className="w-full flex items-center justify-between text-left text-xs tracking-wider uppercase font-semibold text-zinc-300 hover:text-white py-1.5 cursor-pointer"
                  >
                    {section.title}
                    <span className="text-zinc-500 text-lg font-light leading-none">{isOpen ? "−" : "+"}</span>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isOpen ? "max-h-[200px] mt-2 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-xs text-muted-text tracking-wide leading-relaxed font-light font-sans text-justify">
                      {section.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* RELATED PIECES SECTION */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-zinc-900 mt-20 md:mt-32 pt-16 select-none">
          <div className="mb-12 text-center md:text-left">
            <span className="text-[10px] font-semibold tracking-[0.4em] text-accent uppercase block mb-3">
              YOU MAY ALSO LIKE
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white uppercase font-sans">
              RELATED <span className="text-accent">PIECES</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => {
              const relImages = p.images && p.images.length > 0 ? p.images : ["/Images/clothing.jpg"];
              const relDisplayPrice = (p.price / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              });
              
              return (
                <div key={p.id} className="group flex flex-col bg-zinc-950/40 border border-zinc-900 relative overflow-hidden transition-all duration-500 hover:border-accent/30 hover:shadow-[0_0_30px_rgba(255,77,77,0.03)]">
                  {/* Aspect ratio frame */}
                  <div className="w-full overflow-hidden relative" style={{ aspectRatio: "15/16" }}>
                    <Link href={`/shop/${p.slug}`} className="block w-full h-full">
                      <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/50 z-2 pointer-events-none" />
                      <img 
                        src={relImages[0]} 
                        alt={p.name}
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700" 
                      />
                    </Link>
                  </div>
                  
                  {/* Metadata below image */}
                  <div className="p-4 flex flex-col justify-between grow">
                    <Link href={`/shop/${p.slug}`} className="hover:text-accent transition-colors block">
                      <h3 className="text-xs font-semibold tracking-wide text-zinc-200 truncate">{p.name}</h3>
                    </Link>
                    <div className="mt-2 text-xs font-bold font-mono text-accent flex items-baseline gap-0.5">
                      <span className="text-[10px] font-sans font-normal">₹</span>
                      <span>{relDisplayPrice}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
