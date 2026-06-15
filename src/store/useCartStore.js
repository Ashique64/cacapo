import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { id, product_id, variant_id, quantity, product: {...}, variant: {...} }
      loading: false,
      isCartOpen: false,
      setCartOpen: (open) => set({ isCartOpen: open }),

      // Initialize/fetch cart from Supabase when user is logged in
      fetchCart: async (userId) => {
        if (!userId) return;
        set({ loading: true });
        
        try {
          // Get or create cart
          let { data: cart, error } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (error) throw error;

          if (!cart) {
            const { data: newCart, error: createError } = await supabase
              .from("carts")
              .insert({ user_id: userId })
              .select("id")
              .single();

            if (createError) throw createError;
            cart = newCart;
          }

          // Fetch cart items
          const { data: dbItems, error: itemsError } = await supabase
            .from("cart_items")
            .select(`
              id,
              product_id,
              variant_id,
              quantity,
              product:products(*),
              variant:product_variants(*)
            `)
            .eq("cart_id", cart.id);

          if (itemsError) throw itemsError;

          set({ items: dbItems || [], loading: false });
        } catch (err) {
          console.error("Failed to fetch cart:", err);
          set({ loading: false });
        }
      },

      // Sync local cart items to database upon login
      syncCart: async (userId) => {
        if (!userId) return;
        const localItems = get().items;
        if (localItems.length === 0) {
          // Just fetch what's in the DB if local is empty
          await get().fetchCart(userId);
          return;
        }

        try {
          // Get or create cart
          let { data: cart } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!cart) {
            const { data: newCart } = await supabase
              .from("carts")
              .insert({ user_id: userId })
              .select("id")
              .single();
            cart = newCart;
          }

          // Merge local items with database
          for (const item of localItems) {
            const { data: existing } = await supabase
              .from("cart_items")
              .select("id, quantity")
              .eq("cart_id", cart.id)
              .eq("product_id", item.product_id)
              .eq("variant_id", item.variant_id || null)
              .maybeSingle();

            if (existing) {
              // Update quantity
              await supabase
                .from("cart_items")
                .update({ quantity: existing.quantity + item.quantity })
                .eq("id", existing.id);
            } else {
              // Insert new
              await supabase
                .from("cart_items")
                .insert({
                  cart_id: cart.id,
                  product_id: item.product_id,
                  variant_id: item.variant_id || null,
                  quantity: item.quantity
                });
            }
          }

          // Re-fetch final merged cart from database
          await get().fetchCart(userId);
        } catch (err) {
          console.error("Failed to sync cart:", err);
        }
      },

      addItem: async (product, variant = null, quantity = 1, userId = null) => {
        const currentItems = get().items;
        const variantId = variant?.id || null;
        
        // Check if item already in cart
        const existingIndex = currentItems.findIndex(
          (item) => item.product_id === product.id && item.variant_id === variantId
        );

        if (userId) {
          // Sync with database
          try {
            let { data: cart } = await supabase
              .from("carts")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();

            if (!cart) {
              const { data: newCart } = await supabase
                .from("carts")
                .insert({ user_id: userId })
                .select("id")
                .single();
              cart = newCart;
            }

            if (existingIndex > -1) {
              const item = currentItems[existingIndex];
              const newQty = item.quantity + quantity;
              
              await supabase
                .from("cart_items")
                .update({ quantity: newQty })
                .eq("id", item.id);
            } else {
              await supabase
                .from("cart_items")
                .insert({
                  cart_id: cart.id,
                  product_id: product.id,
                  variant_id: variantId,
                  quantity
                });
            }
            // Refresh state from DB
            await get().fetchCart(userId);
          } catch (err) {
            console.error("Failed to add item to DB:", err);
          }
        } else {
          // Guest mode (localStorage only)
          const newItems = [...currentItems];
          if (existingIndex > -1) {
            newItems[existingIndex].quantity += quantity;
          } else {
            newItems.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              product_id: product.id,
              variant_id: variantId,
              quantity,
              product,
              variant
            });
          }
          set({ items: newItems });
        }
      },

      removeItem: async (itemId, userId = null) => {
        if (userId) {
          try {
            await supabase.from("cart_items").delete().eq("id", itemId);
            await get().fetchCart(userId);
          } catch (err) {
            console.error("Failed to remove item from DB:", err);
          }
        } else {
          set({
            items: get().items.filter((item) => item.id !== itemId)
          });
        }
      },

      updateQuantity: async (itemId, quantity, userId = null) => {
        if (quantity <= 0) {
          await get().removeItem(itemId, userId);
          return;
        }

        if (userId) {
          try {
            await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
            await get().fetchCart(userId);
          } catch (err) {
            console.error("Failed to update quantity in DB:", err);
          }
        } else {
          set({
            items: get().items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            )
          });
        }
      },

      clearCart: async (userId = null) => {
        if (userId) {
          try {
            const { data: cart } = await supabase
              .from("carts")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();

            if (cart) {
              await supabase.from("cart_items").delete().eq("cart_id", cart.id);
            }
            set({ items: [] });
          } catch (err) {
            console.error("Failed to clear cart in DB:", err);
          }
        } else {
          set({ items: [] });
        }
      }
    }),
    {
      name: "cacapo-cart-storage",
      partialize: (state) => ({ items: state.items })
    }
  )
);
