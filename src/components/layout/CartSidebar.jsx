"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";

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

  const cartCount = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
  [items]);

  const handleClose = useCallback(() => setCartOpen(false), [setCartOpen]);

  // Disable body scroll when cart sidebar is open
  useEffect(() => {
    if (mounted && isOpen) {
      document.body.style.overflow = "hidden";
      if (typeof window !== "undefined" && window.lenis) {
        window.lenis.stop();
      }
    } else if (mounted) {
      document.body.style.overflow = "auto";
      if (typeof window !== "undefined" && window.lenis) {
        window.lenis.start();
      }
    }
    return () => {
      if (mounted) {
        document.body.style.overflow = "auto";
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
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-500 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sliding Sidebar Panel */}
      <div
        data-lenis-prevent
        className={`fixed top-0 right-0 h-screen w-full sm:w-[440px] bg-card-bg border-l border-card-border z-50 flex flex-col justify-between shadow-2xl transition-transform duration-500 ease-in-out select-none ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-card-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold tracking-[0.2em] text-foreground uppercase">
              YOUR BAG <span className="font-mono text-muted-text font-normal">({cartCount})</span>
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-text hover:text-accent transition-colors p-1.5 hover:bg-zinc-100 rounded-full"
            aria-label="Close Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Cart Items List */}
        <div className="grow overflow-y-auto no-scrollbar p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center py-20">
              <div className="p-4 bg-background border border-card-border rounded-none text-zinc-400 mb-6">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-sm font-bold tracking-widest text-foreground uppercase mb-2">
                YOUR BAG IS EMPTY
              </h3>
              <p className="text-xs text-muted-text tracking-wide font-light max-w-[240px] mb-8 leading-relaxed">
                Add statement pieces from our collections to customize your look.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 border border-foreground bg-foreground text-background text-[10px] font-bold tracking-[0.2em] transition-all hover:bg-accent hover:text-white hover:border-accent uppercase"
              >
                Continue Shopping
              </button>
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

              return (
                <div key={item.id} className="flex gap-4 pb-6 border-b border-card-border items-start">
                  
                  {/* Thumbnail frame with aspect ratio 15/16 */}
                  <div className="w-20 overflow-hidden border border-card-border shrink-0 relative bg-background" style={{ aspectRatio: "15/16" }}>
                    <Image
                      src={images[0]}
                      alt={product.name || "Product"}
                      fill
                      sizes="80px"
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Item Specifications & Quantities */}
                  <div className="flex-1 flex flex-col justify-between min-h-[85px]">
                    <div>
                      <div className="flex justify-between gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-foreground truncate max-w-[200px] uppercase">
                          {product.name || "ITEM"}
                        </h4>
                        <button
                          onClick={() => removeItem(item.id, user?.id)}
                          className="text-zinc-400 hover:text-accent transition-colors p-0.5"
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
          <div className="p-6 border-t border-card-border bg-card-bg/85 backdrop-blur-md space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold tracking-[0.25em] text-muted-text uppercase">
                ESTIMATED TOTAL
              </span>
              <div className="text-lg font-bold font-mono text-foreground flex items-baseline gap-0.5">
                <span className="text-xs font-sans font-normal text-muted-text">₹</span>
                <span>{displaySubtotal}</span>
              </div>
            </div>

            <p className="text-[9px] text-muted-text tracking-wider font-light leading-relaxed">
              Shipping & taxes calculated at checkout. Curated packaging and express courier dispatch are complimentary.
            </p>

            <div className="pt-2">
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
