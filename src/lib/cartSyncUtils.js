/**
 * CACAPO — Cart Sync Diffing Utilities
 *
 * Pure, side-effect-free functions extracted from useCartStore.syncCart.
 * These contain the core merging logic and can be unit-tested independently
 * of Zustand, Supabase, and localStorage.
 */

/**
 * Determines which local cart items need to be INSERT-ed vs which need
 * their quantity UPDATE-d in the database.
 *
 * This is the core of the N+1 fix: instead of looping N times and making
 * 2 DB calls per item, we do one bulk SELECT, call this function in-memory,
 * and then do 1 bulk INSERT + parallel UPDATEs.
 *
 * @param {Array<{product_id: string, variant_id: string|null, quantity: number}>} localItems
 *   - Items from the local (guest) cart to be merged.
 *   - Only REAL items (valid UUIDs) should be passed here; mock items are filtered upstream.
 *
 * @param {Array<{id: string, product_id: string, variant_id: string|null, quantity: number}>} dbItems
 *   - Items already in the database cart (fetched in one SELECT).
 *
 * @param {string} cartId
 *   - The database cart record id (used to build insert payloads).
 *
 * @returns {{ toInsert: Array, toUpdate: Array }}
 *   - toInsert: new cart_items rows ready to be batch-inserted
 *   - toUpdate: { id, newQuantity } pairs for parallel updates
 */
export function diffCartItems(localItems, dbItems, cartId) {
  // Build a lookup map keyed by "product_id::variant_id" for O(1) lookups
  const dbItemMap = new Map();
  for (const dbItem of dbItems) {
    const key = `${dbItem.product_id}::${dbItem.variant_id ?? "null"}`;
    dbItemMap.set(key, dbItem);
  }

  const toInsert = [];
  const toUpdate = [];

  for (const item of localItems) {
    const key = `${item.product_id}::${item.variant_id ?? "null"}`;
    const dbItem = dbItemMap.get(key);

    if (dbItem) {
      // Item already exists in DB — calculate new quantity after merge
      toUpdate.push({
        id: dbItem.id,
        newQuantity: dbItem.quantity + item.quantity,
      });
    } else {
      // Brand-new item — build insert payload
      toInsert.push({
        cart_id: cartId,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
      });
    }
  }

  return { toInsert, toUpdate };
}
