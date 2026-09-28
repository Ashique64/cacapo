import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { diffCartItems } from "@/lib/cartSyncUtils";

// ─── Private helper ────────────────────────────────────────────────────────
// Gets the existing cart record for a user, or creates one if it doesn't exist.
// Extracted to eliminate the identical 3-copy pattern across fetchCart, syncCart, addItem.
async function getOrCreateCart(userId) {
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
  return cart;
}

// UUID validation — used to distinguish real DB ids from guest/mock temp ids
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRealUuid(value) {
  return typeof value === "string" && uuidRegex.test(value);
}

// ─── Store ─────────────────────────────────────────────────────────────────
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
          const cart = await getOrCreateCart(userId);

          // Single query: fetch all cart items with nested product + images + variant
          const { data: dbItems, error: itemsError } = await supabase
            .from("cart_items")
            .select(`
              id,
              product_id,
              variant_id,
              quantity,
              product:products(*, product_images(image_url, sort_order)),
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

      // Sync local (guest) cart items into the database upon login.
      //
      // PREVIOUS BEHAVIOUR (N+1):
      //   For each of N local items → SELECT + UPDATE/INSERT = up to 2N round-trips.
      //
      // NEW BEHAVIOUR (batch):
      //   1. One SELECT to fetch all existing cart_items for this cart.
      //   2. In-memory diff: find which local items already exist in DB vs which are new.
      //   3. One batch INSERT (upsert) for genuinely new items.
      //   4. Parallel Promise.all updates for items that need quantity increments.
      //   5. One final fetchCart to refresh state.
      //   Total DB calls: 3 fixed + 1 parallel batch (regardless of cart size).
      syncCart: async (userId) => {
        if (!userId) return;

        const localItems = get().items;
        if (localItems.length === 0) {
          // Nothing local — just load whatever is already in the DB
          await get().fetchCart(userId);
          return;
        }

        try {
          const cart = await getOrCreateCart(userId);

          // Separate real product items from mock/guest placeholder items
          const realItems = localItems.filter(
            (item) =>
              isRealUuid(item.product_id) &&
              (item.variant_id == null || isRealUuid(item.variant_id))
          );
          const mockItems = localItems.filter(
            (item) =>
              !isRealUuid(item.product_id) ||
              (item.variant_id != null && !isRealUuid(item.variant_id))
          );

          if (realItems.length > 0) {
            // ── Step 1: Single query — fetch ALL existing cart_items for this cart ──
            const { data: existingDbItems, error: fetchErr } = await supabase
              .from("cart_items")
              .select("id, product_id, variant_id, quantity")
              .eq("cart_id", cart.id);

            if (fetchErr) throw fetchErr;

          // ── Step 2–3: In-memory diff → batch insert + parallel updates ─────
            const { toInsert, toUpdate } = diffCartItems(
              realItems,
              existingDbItems || [],
              cart.id
            );

            // ── Step 4: Batch insert new items (single round-trip) ────────────
            if (toInsert.length > 0) {
              const { error: insertErr } = await supabase
                .from("cart_items")
                .insert(toInsert);

              if (insertErr) throw insertErr;
            }

            // ── Step 5: Parallel quantity updates ─────────────────────────────
            if (toUpdate.length > 0) {
              await Promise.all(
                toUpdate.map(({ id, newQuantity }) =>
                  supabase
                    .from("cart_items")
                    .update({ quantity: newQuantity })
                    .eq("id", id)
                )
              );
            }
          }

          // ── Step 5: Re-fetch merged cart from DB ──────────────────────────────
          await get().fetchCart(userId);

          // Restore mock/placeholder items alongside real DB items
          if (mockItems.length > 0) {
            set({ items: [...get().items, ...mockItems] });
          }
        } catch (err) {
          console.error("Failed to sync cart:", err);
        }
      },

      addItem: async (product, variant = null, quantity = 1, userId = null) => {
        const currentItems = get().items;
        const variantId = variant?.id ?? null;

        // Check if item already in cart (for guest mode local update)
        const existingIndex = currentItems.findIndex(
          (item) => item.product_id === product.id && item.variant_id === variantId
        );

        const isMockProduct =
          !isRealUuid(product.id) || (variantId != null && !isRealUuid(variantId));

        if (userId && !isMockProduct) {
          // ── Logged-in user: sync with database ──────────────────────────────
          try {
            const cart = await getOrCreateCart(userId);

            // Single lookup for existing row
            let query = supabase
              .from("cart_items")
              .select("id, quantity")
              .eq("cart_id", cart.id)
              .eq("product_id", product.id);

            query = variantId
              ? query.eq("variant_id", variantId)
              : query.is("variant_id", null);

            const { data: dbItem, error: dbItemErr } = await query.maybeSingle();
            if (dbItemErr) throw dbItemErr;

            if (dbItem) {
              // Item exists — increment quantity
              const { error: updateErr } = await supabase
                .from("cart_items")
                .update({ quantity: dbItem.quantity + quantity })
                .eq("id", dbItem.id);
              if (updateErr) throw updateErr;
            } else {
              // New item — insert
              const { error: insertErr } = await supabase
                .from("cart_items")
                .insert({
                  cart_id: cart.id,
                  product_id: product.id,
                  variant_id: variantId,
                  quantity,
                });
              if (insertErr) {
                console.error(
                  "Supabase insert error details:",
                  insertErr.message,
                  insertErr.details,
                  insertErr.hint
                );
                throw insertErr;
              }
            }

            // Refresh state from DB
            await get().fetchCart(userId);
          } catch (err) {
            console.error("Failed to add item to DB:", err?.message || err, err);
          }
        } else {
          // ── Guest mode or mock product: localStorage only ──────────────────
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
              variant,
            });
          }
          set({ items: newItems });
        }
      },

      removeItem: async (itemId, userId = null) => {
        const isLocalItem = !isRealUuid(itemId) || itemId.toString().startsWith("temp-");

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
            items: get().items.filter((item) => item.id !== itemId),
          });
        }
      },

      updateQuantity: async (itemId, quantity, userId = null) => {
        if (quantity <= 0) {
          await get().removeItem(itemId, userId);
          return;
        }

        const isLocalItem = !isRealUuid(itemId) || itemId.toString().startsWith("temp-");

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
            ),
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
      },
    }),
    {
      name: "cacapo-cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
