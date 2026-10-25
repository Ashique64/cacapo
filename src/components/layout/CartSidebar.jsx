"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus, Minus, Trash2, ShoppingBag, Truck, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";

const FREE_SHIPPING_THRESHOLD = 300000; // ₹3,000 in paise

export default function CartSidebar() {
  const { user } = useAuthStore();
  const isOpen = useCartStore((state) => state.isCartOpen);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized Subtotal Calculations
  const subtotal = useMemo(() =>
    items.reduce((sum, item) => {
      const variant = item.variant;
      const product = item.product;
      const itemPrice = (variant && variant.sale_price) ? variant.sale_price : (variant && variant.price) ? variant.price : product?.sale_price || product?.price || 0;
      return sum + itemPrice * item.quantity;
    }, 0),
  [items]);

  const displaySubtotal = useMemo(() =>
    (subtotal / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
  [subtotal]);

  // Free shipping calculations (₹3,000 threshold)
  const amountRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercentage = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const isFreeShippingUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;
  const displayAmountRemaining = (amountRemaining / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const cartCount = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
  [items]);

  const handleClose = useCallback(() => setCartOpen(false), [setCartOpen]);

  // Disable body scroll when cart sidebar is open
  useEffect(() => {
    if (mounted && isOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      if (typeof window !== "undefined" && window.lenis) {
        window.lenis.stop();
      }
    } else if (mounted) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (typeof window !== "undefined" && window.lenis) {
        window.lenis.start();
      }
    }
    return () => {
      if (mounted) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        if (typeof window !== "undefined" && window.lenis) {
          window.lenis.start();
        }
      }
    };
  }, [isOpen, mounted]);

  if (!mounted) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-500 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sliding Sidebar Panel */}
      <div
        data-lenis-prevent
        className={`fixed inset-y-0 right-0 h-dvh max-h-dvh w-full sm:w-110 bg-card-bg border-l border-card-border z-50 flex flex-col justify-between overflow-hidden shadow-2xl transition-transform duration-500 ease-in-out select-none overscroll-contain ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-card-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold tracking-[0.2em] text-foreground uppercase">
              YOUR BAG <span className="font-mono text-muted-text font-normal">({cartCount})</span>
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-text hover:text-accent transition-colors p-1.5 hover:bg-zinc-100 rounded-full cursor-pointer"
            aria-label="Close Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bouncing Free Shipping Progress Bar */}
        {items.length > 0 && (
          <div className="px-4 py-3 sm:px-6 sm:pt-3.5 sm:pb-4 bg-zinc-50/95 border-b border-card-border space-y-1.5 sm:space-y-2 select-none shrink-0">
            <div className="flex items-center justify-between text-xs">
              {isFreeShippingUnlocked ? (
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 text-xs tracking-wide">
                  <span className="inline-block animate-gentle-bounce">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </span>
                  <span>🎉 You unlocked <strong className="underline decoration-emerald-400 underline-offset-2">FREE Shipping</strong>!</span>
                </span>
              ) : (
                <span className="text-[11px] text-muted-text tracking-wide flex items-center gap-1.5">
                  <span className="inline-block animate-gentle-bounce">
                    <Truck className="w-4 h-4 text-accent shrink-0" />
                  </span>
                  <span>
                    Add <strong className="font-bold text-foreground font-mono">₹{displayAmountRemaining}</strong> more for <strong className="font-semibold text-accent">FREE Shipping</strong>
                  </span>
                </span>
              )}
              <span className="text-[10px] font-mono font-bold text-foreground bg-white px-2 py-0.5 rounded-full border border-card-border shadow-xs">
                {Math.round(progressPercentage)}%
              </span>
            </div>

            {/* Bouncing Progress Track & Riding Pin */}
            <div className="relative pt-2.5 pb-0.5">
              {/* Background Track with Inner Glow */}
              <div className="w-full h-2.5 bg-zinc-200/80 rounded-full overflow-hidden relative shadow-inner">
                {/* Animated Fill Bar with Moving Stripes */}
                <div
                  className={`h-full transition-all duration-700 ease-out rounded-full relative animate-stripes ${
                    isFreeShippingUnlocked 
                      ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
                      : "bg-accent shadow-[0_0_10px_rgba(255,77,77,0.4)]"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Bouncing Marker Pin riding on top of the progress tip */}
              <div
                className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-out pointer-events-none z-10"
                style={{ left: `${Math.max(3, Math.min(97, progressPercentage))}%` }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-gentle-bounce ${
                    isFreeShippingUnlocked
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-200 shadow-emerald-500/30"
                      : "bg-accent text-white ring-2 ring-red-100 shadow-red-500/30"
                  }`}
                >
                  {isFreeShippingUnlocked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <Truck className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Cart Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center py-20">
              <div className="p-4 bg-background border border-card-border rounded-none text-zinc-400 mb-6">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-sm font-bold tracking-widest text-foreground uppercase mb-2">
                YOUR BAG IS EMPTY
              </h3>
              <p className="text-xs text-muted-text tracking-wide font-light max-w-60 mb-8 leading-relaxed">
                Add statement pieces from our collections to customize your look.
              </p>
              <Link
                href="/shop"
                onClick={handleClose}
                className="inline-block px-6 py-2.5 border border-foreground bg-foreground text-background text-[10px] font-bold tracking-[0.2em] transition-all hover:bg-accent hover:text-white hover:border-accent uppercase"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const product = item.product || {};
              const variant = item.variant || {};
              
              const dbImages = product.product_images ? product.product_images.map(img => img.image_url) : [];
              const images = product.images && product.images.length > 0 
                ? product.images 
                : (dbImages.length > 0 ? dbImages : ["/Images/clothing.jpg"]);
              const activePrice = variant.sale_price ? variant.sale_price : variant.price ? variant.price : product.sale_price || product.price || 0;
              const displayItemPrice = (activePrice / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });
              const productSlug = product.slug ? `/shop/${product.slug}` : product.id ? `/shop/${product.id}` : "/shop";

              return (
                <div key={item.id} className="flex gap-4 pb-6 border-b border-card-border items-start">
                  
                  {/* Thumbnail frame with aspect ratio 15/16 */}
                  <Link
                    href={productSlug}
                    onClick={handleClose}
                    className="w-20 overflow-hidden border border-card-border shrink-0 relative bg-background block group cursor-pointer"
                    style={{ aspectRatio: "15/16" }}
                  >
                    <Image
                      src={images[0]}
                      alt={product.name || "Product"}
                      fill
                      sizes="80px"
                      className="object-cover pointer-events-none select-none group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      draggable={false}
                    />
                  </Link>

                  {/* Item Specifications & Quantities */}
                  <div className="flex-1 flex flex-col justify-between min-h-21.25">
                    <div>
                      <div className="flex justify-between gap-2">
                        <Link
                          href={productSlug}
                          onClick={handleClose}
                          className="text-xs font-semibold tracking-wide text-foreground hover:text-accent transition-colors truncate max-w-50 uppercase block"
                        >
                          {product.name || "ITEM"}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id, user?.id)}
                          className="text-zinc-400 hover:text-accent transition-colors p-0.5 cursor-pointer"
                          aria-label={`Remove ${product.name || "item"} from cart`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {product.brand && (
                        <span className="text-[9px] tracking-wider text-accent uppercase font-sans font-semibold mt-0.5 block">
                          {product.brand}
                        </span>
                      )}

                      {variant.size && (
                        <div className="text-[9px] tracking-widest text-muted-text uppercase mt-1">
                          SIZE: <span className="text-foreground font-mono font-bold">{variant.size}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector & Pricing */}
                    <div className="flex justify-between items-center mt-3 pt-2">
                      <div className="flex items-center border border-card-border bg-background w-fit">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, user?.id)}
                          aria-label="Decrease quantity"
                          className="w-7 h-7 flex items-center justify-center text-muted-text hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-8 text-center text-[10px] font-mono font-bold text-foreground" aria-label={`Quantity: ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            const maxStock = variant.stock_quantity || 99;
                            updateQuantity(item.id, Math.min(maxStock, item.quantity + 1), user?.id);
                          }}
                          aria-label="Increase quantity"
                          className="w-7 h-7 flex items-center justify-center text-muted-text hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="text-xs font-bold font-mono text-foreground flex items-baseline gap-0.5">
                        <span className="text-[10px] font-sans font-normal text-muted-text">₹</span>
                        <span>{displayItemPrice}</span>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout Trigger */}
        {items.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-card-border bg-card-bg/95 backdrop-blur-md space-y-3 sm:space-y-4 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold tracking-[0.25em] text-muted-text uppercase">
                SUBTOTAL
              </span>
              <div className="text-base font-bold font-mono text-foreground flex items-baseline gap-0.5">
                <span className="text-xs font-sans font-normal text-muted-text">₹</span>
                <span>{displaySubtotal}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] tracking-wider uppercase">
              <span className="text-muted-text">Shipping</span>
              <span className={`font-semibold ${isFreeShippingUnlocked ? "text-emerald-600 font-bold" : "text-foreground font-mono"}`}>
                {isFreeShippingUnlocked ? "FREE" : "₹50"}
              </span>
            </div>

            <p className="text-[9px] text-muted-text tracking-wider font-light leading-relaxed border-t border-card-border/60 pt-2">
              Taxes calculated at checkout. Express courier dispatch and secure packaging included.
            </p>

            <div className="pt-1 sm:pt-2">
              <Link
                href="/checkout"
                onClick={handleClose}
                className="w-full py-3.5 border border-foreground bg-foreground text-background hover:bg-accent hover:text-white hover:border-accent text-xs font-semibold tracking-[0.25em] transition-all duration-500 uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                PROCEED TO CHECKOUT
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
