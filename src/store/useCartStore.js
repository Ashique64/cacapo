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
            if (!newCart) throw new Error("Failed to create cart record");
            cart = newCart;
          }

          if (!cart) throw new Error("Cart record is missing");

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
          let { data: cart, error: selectErr } = await supabase
            .from("carts")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (selectErr) throw selectErr;

          if (!cart) {
            const { data: newCart, error: createError } = await supabase
              .from("carts")
              .insert({ user_id: userId })
              .select("id")
              .single();
            if (createError) throw createError;
            if (!newCart) throw new Error("Failed to create cart record");
            cart = newCart;
          }

          if (!cart) throw new Error("Cart record is missing");

          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const localItemsToKeep = [];

          // Merge local items with database
          for (const item of localItems) {
            const isMockProduct = !uuidRegex.test(item.product_id) || (item.variant_id && !uuidRegex.test(item.variant_id));
            if (isMockProduct) {
              localItemsToKeep.push(item);
              continue;
            }

            const { data: existing } = await supabase
              .from("cart_items")
              .select("id, quantity")
              .eq("cart_id", cart.id)
              .eq("product_id", item.product_id)
              .eq("variant_id", item.variant_id || null)
              .maybeSingle();

            if (existing) {
              // Update quantity
              const { error: updateErr } = await supabase
                .from("cart_items")
                .update({ quantity: existing.quantity + item.quantity })
                .eq("id", existing.id);
              if (updateErr) throw updateErr;
            } else {
              // Insert new
              const { error: insertErr } = await supabase
                .from("cart_items")
                .insert({
                  cart_id: cart.id,
                  product_id: item.product_id,
                  variant_id: item.variant_id || null,
                  quantity: item.quantity
                });
              if (insertErr) throw insertErr;
            }
          }

          // Re-fetch final merged cart from database
          await get().fetchCart(userId);

          // Restore mock items in local state
          if (localItemsToKeep.length > 0) {
            set({ items: [...get().items, ...localItemsToKeep] });
          }
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

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isMockProduct = !uuidRegex.test(product.id) || (variantId && !uuidRegex.test(variantId));

        if (userId && !isMockProduct) {
          // Sync with database
          try {
            let { data: cart, error: selectErr } = await supabase
              .from("carts")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();

            if (selectErr) throw selectErr;

            if (!cart) {
              const { data: newCart, error: createError } = await supabase
                .from("carts")
                .insert({ user_id: userId })
                .select("id")
                .single();
              if (createError) throw createError;
              if (!newCart) throw new Error("Failed to create cart record");
              cart = newCart;
            }

            if (!cart) throw new Error("Cart record is missing");

            if (existingIndex > -1) {
              const item = currentItems[existingIndex];
              const newQty = item.quantity + quantity;
              
              const { error: updateErr } = await supabase
                .from("cart_items")
                .update({ quantity: newQty })
                .eq("id", item.id);
              if (updateErr) throw updateErr;
              console.log("Inserting cart item:", {
                cart_id: cart.id,
                product_id: product.id,
                variant_id: variantId,
                quantity
              });
              const { error: insertErr } = await supabase
                .from("cart_items")
                .insert({
                  cart_id: cart.id,
                  product_id: product.id,
                  variant_id: variantId,
                  quantity
                });
              if (insertErr) {
                console.error("Supabase insert error details:", insertErr.message, insertErr.details, insertErr.hint);
                throw insertErr;
              }
            }
            // Refresh state from DB
            await get().fetchCart(userId);
          } catch (err) {
            console.error("Failed to add item to DB:", err?.message || err, err);
          }
        } else {
          // Guest mode or Mock product fallback (localStorage only)
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
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isLocalItem = !uuidRegex.test(itemId) || itemId.toString().startsWith("temp-");

        if (userId && !isLocalItem) {
          try {
            const { error: deleteErr } = await supabase
              .from("cart_items")
              .delete()
              .eq("id", itemId);
            if (deleteErr) throw deleteErr;
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

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isLocalItem = !uuidRegex.test(itemId) || itemId.toString().startsWith("temp-");

        if (userId && !isLocalItem) {
          try {
            const { error: updateErr } = await supabase
              .from("cart_items")
              .update({ quantity })
              .eq("id", itemId);
            if (updateErr) throw updateErr;
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
