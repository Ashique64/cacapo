import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [], // Array of product objects

      toggleWishlist: (product) => {
        const current = get().items;
        const exists = current.some((item) => item.id === product.id);
        
        if (exists) {
          set({
            items: current.filter((item) => item.id !== product.id)
          });
        } else {
          set({
            items: [...current, product]
          });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId)
        });
      },

      clearWishlist: () => {
        set({ items: [] });
      }
    }),
    {
      name: "cacapo-wishlist-storage"
    }
  )
);
