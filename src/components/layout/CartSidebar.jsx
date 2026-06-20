"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  // Calculate Subtotal
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.variant && item.variant.price ? item.variant.price : item.product?.price || 0;
    return sum + itemPrice * item.quantity;
  }, 0);

  const displaySubtotal = (subtotal / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

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
        onClick={() => setCartOpen(false)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-500 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sliding Sidebar Panel */}
      <div
        data-lenis-prevent
        className={`fixed top-0 right-0 h-screen w-full sm:w-[440px] bg-zinc-950 border-l border-zinc-900 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-500 ease-in-out select-none ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold tracking-[0.2em] text-white uppercase">
              YOUR BAG <span className="font-mono text-zinc-500 font-normal">({cartCount})</span>
            </h2>
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="text-zinc-400 hover:text-accent transition-colors p-1.5 hover:bg-zinc-900/40 rounded-full"
            aria-label="Close Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Cart Items List */}
        <div className="grow overflow-y-auto no-scrollbar p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center py-20">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-none text-zinc-600 mb-6">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase mb-2">
                YOUR BAG IS EMPTY
              </h3>
              <p className="text-xs text-muted-text tracking-wide font-light max-w-[240px] mb-8 leading-relaxed">
                Add statement pieces from our collections to customize your look.
              </p>
              <button
                onClick={() => setCartOpen(false)}
                className="px-6 py-2.5 border border-zinc-800 bg-white text-black text-[10px] font-bold tracking-[0.2em] transition-all hover:bg-black hover:text-white hover:border-white uppercase"
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
              const activePrice = variant.price ? variant.price : product.price || 0;
              const displayItemPrice = (activePrice / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              });

              return (
                <div key={item.id} className="flex gap-4 pb-6 border-b border-zinc-900/60 items-start">
                  
                  {/* Thumbnail frame with aspect ratio 15/16 */}
                  <div className="w-20 overflow-hidden border border-zinc-900 shrink-0 relative bg-zinc-950" style={{ aspectRatio: "15/16" }}>
                    <img
                      src={images[0]}
                      alt={product.name || "Product"}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Specifications & Quantities */}
                  <div className="flex-1 flex flex-col justify-between min-h-[85px]">
                    <div>
                      <div className="flex justify-between gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-zinc-200 truncate max-w-[200px] uppercase">
                          {product.name || "ITEM"}
                        </h4>
                        <button
                          onClick={() => removeItem(item.id, user?.id)}
                          className="text-zinc-600 hover:text-accent transition-colors p-0.5"
                          title="Remove Item"
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
                        <div className="text-[9px] tracking-widest text-zinc-500 uppercase mt-1">
                          SIZE: <span className="text-zinc-300 font-mono font-bold">{variant.size}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector & Pricing */}
                    <div className="flex justify-between items-center mt-3 pt-2">
                      <div className="flex items-center border border-zinc-900 bg-zinc-950/20 w-fit">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, user?.id)}
                          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-8 text-center text-[10px] font-mono font-bold text-zinc-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            const maxStock = variant.stock_quantity || 99;
                            updateQuantity(item.id, Math.min(maxStock, item.quantity + 1), user?.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div className="text-xs font-bold font-mono text-zinc-300 flex items-baseline gap-0.5">
                        <span className="text-[10px] font-sans font-normal text-zinc-500">₹</span>
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
          <div className="p-6 border-t border-zinc-900 bg-zinc-950/80 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">
                ESTIMATED TOTAL
              </span>
              <div className="text-lg font-bold font-mono text-white flex items-baseline gap-0.5">
                <span className="text-xs font-sans font-normal text-zinc-400">₹</span>
                <span>{displaySubtotal}</span>
              </div>
            </div>

            <p className="text-[9px] text-zinc-500 tracking-wider font-light leading-relaxed">
              Shipping & taxes calculated at checkout. Curated packaging and express courier dispatch are complimentary.
            </p>

            <div className="pt-2">
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="w-full py-3.5 border border-zinc-800 bg-white text-black hover:bg-black hover:text-white hover:border-white text-xs font-semibold tracking-[0.25em] transition-all duration-500 uppercase flex items-center justify-center gap-2 cursor-pointer"
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
