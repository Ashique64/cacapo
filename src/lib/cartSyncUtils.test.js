/**
 * Tests for src/lib/cartSyncUtils.js
 *
 * Covers diffCartItems():
 *  - All local items are new → all go to toInsert, toUpdate is empty
 *  - All local items already exist in DB → all go to toUpdate, toInsert is empty
 *  - Mixed: some new, some existing → correct split
 *  - Quantity merging: toUpdate.newQuantity = db.quantity + local.quantity
 *  - Variant handling: same product_id but different variant_id treated as separate items
 *  - Null variant_id: items without a variant match correctly
 *  - Empty local items → both arrays empty
 *  - Empty DB items → everything goes to toInsert
 *  - Insert payloads contain correct cart_id, product_id, variant_id, quantity
 */
import { describe, it, expect } from "vitest";
import { diffCartItems } from "@/lib/cartSyncUtils";

// ── Fixtures ──────────────────────────────────────────────────────────────

const CART_ID  = "cart-uuid-001";
const PROD_A   = "prod-uuid-aaa";
const PROD_B   = "prod-uuid-bbb";
const VAR_S    = "var-uuid-small";
const VAR_M    = "var-uuid-medium";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("diffCartItems", () => {
  it("all local items are brand-new → all in toInsert, toUpdate empty", () => {
    const local = [
      { product_id: PROD_A, variant_id: VAR_S, quantity: 1 },
      { product_id: PROD_B, variant_id: VAR_M, quantity: 2 },
    ];
    const db = [];

    const { toInsert, toUpdate } = diffCartItems(local, db, CART_ID);

    expect(toUpdate).toHaveLength(0);
    expect(toInsert).toHaveLength(2);
  });

  it("insert payloads have the correct shape (cart_id, product_id, variant_id, quantity)", () => {
    const local = [{ product_id: PROD_A, variant_id: VAR_S, quantity: 3 }];
    const { toInsert } = diffCartItems(local, [], CART_ID);

    expect(toInsert[0]).toEqual({
      cart_id: CART_ID,
      product_id: PROD_A,
      variant_id: VAR_S,
      quantity: 3,
    });
  });

  it("all local items already in DB → all in toUpdate, toInsert empty", () => {
    const local = [
      { product_id: PROD_A, variant_id: VAR_S, quantity: 1 },
    ];
    const db = [
      { id: "db-item-1", product_id: PROD_A, variant_id: VAR_S, quantity: 2 },
    ];

    const { toInsert, toUpdate } = diffCartItems(local, db, CART_ID);

    expect(toInsert).toHaveLength(0);
    expect(toUpdate).toHaveLength(1);
  });

  it("merges quantities correctly: newQuantity = db.quantity + local.quantity", () => {
    const local = [{ product_id: PROD_A, variant_id: VAR_S, quantity: 3 }];
    const db    = [{ id: "db-1", product_id: PROD_A, variant_id: VAR_S, quantity: 5 }];

    const { toUpdate } = diffCartItems(local, db, CART_ID);

    expect(toUpdate[0].newQuantity).toBe(8); // 5 + 3
    expect(toUpdate[0].id).toBe("db-1");
  });

  it("mixed: new items go to toInsert, existing items go to toUpdate", () => {
    const local = [
      { product_id: PROD_A, variant_id: VAR_S, quantity: 1 }, // exists in DB
      { product_id: PROD_B, variant_id: VAR_M, quantity: 2 }, // new
    ];
    const db = [
      { id: "db-1", product_id: PROD_A, variant_id: VAR_S, quantity: 4 },
    ];

    const { toInsert, toUpdate } = diffCartItems(local, db, CART_ID);

    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].product_id).toBe(PROD_B);

    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].id).toBe("db-1");
    expect(toUpdate[0].newQuantity).toBe(5); // 4 + 1
  });

  it("treats same product with different variant_id as separate items", () => {
    const local = [
      { product_id: PROD_A, variant_id: VAR_S,  quantity: 1 },
      { product_id: PROD_A, variant_id: VAR_M,  quantity: 1 },
    ];
    const db = [
      { id: "db-s", product_id: PROD_A, variant_id: VAR_S,  quantity: 2 },
      // VAR_M is NOT in DB yet
    ];

    const { toInsert, toUpdate } = diffCartItems(local, db, CART_ID);

    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].variant_id).toBe(VAR_M);

    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].id).toBe("db-s");
  });

  it("handles null variant_id: matches items without a variant correctly", () => {
    const local = [{ product_id: PROD_A, variant_id: null, quantity: 1 }];
    const db    = [{ id: "db-nv", product_id: PROD_A, variant_id: null, quantity: 3 }];

    const { toInsert, toUpdate } = diffCartItems(local, db, CART_ID);

    expect(toInsert).toHaveLength(0);
    expect(toUpdate).toHaveLength(1);
    expect(toUpdate[0].newQuantity).toBe(4); // 3 + 1
  });

  it("does NOT mix null-variant items with variant items of the same product", () => {
    const local = [{ product_id: PROD_A, variant_id: null, quantity: 1 }];
    const db    = [{ id: "db-v", product_id: PROD_A, variant_id: VAR_S, quantity: 5 }];

    const { toInsert, toUpdate } = diffCartItems(local, db, CART_ID);

    // null-variant local item doesn't match the VAR_S db item
    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].variant_id).toBeNull();
    expect(toUpdate).toHaveLength(0);
  });

  it("returns empty arrays when local items list is empty", () => {
    const db = [{ id: "db-1", product_id: PROD_A, variant_id: VAR_S, quantity: 2 }];
    const { toInsert, toUpdate } = diffCartItems([], db, CART_ID);

    expect(toInsert).toHaveLength(0);
    expect(toUpdate).toHaveLength(0);
  });

  it("all local items go to toInsert when DB cart is empty", () => {
    const local = [
      { product_id: PROD_A, variant_id: VAR_S, quantity: 2 },
      { product_id: PROD_B, variant_id: null,  quantity: 1 },
    ];

    const { toInsert, toUpdate } = diffCartItems(local, [], CART_ID);

    expect(toInsert).toHaveLength(2);
    expect(toUpdate).toHaveLength(0);
  });

  it("preserves null as variant_id in insert payload (not undefined or missing)", () => {
    const local = [{ product_id: PROD_A, variant_id: null, quantity: 1 }];
    const { toInsert } = diffCartItems(local, [], CART_ID);

    expect(toInsert[0]).toHaveProperty("variant_id", null);
  });
});
