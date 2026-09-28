/**
 * Tests for src/lib/razorpayUtils.js
 *
 * Covers:
 *  - buildSignaturePayload: correct format "order_id|payment_id"
 *  - computeRazorpaySignature: produces a valid hex HMAC-SHA256 string
 *  - verifyRazorpaySignature:
 *      - returns true for a correctly computed signature
 *      - returns false for a tampered signature
 *      - returns false for a wrong key secret
 *      - returns false for mismatched order / payment IDs
 *      - returns false when any argument is missing / null / empty
 *      - returns false for non-hex (length-mismatched) garbage input
 */
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  buildSignaturePayload,
  computeRazorpaySignature,
  verifyRazorpaySignature,
} from "@/lib/razorpayUtils";

// ── Fixtures ──────────────────────────────────────────────────────────────

const ORDER_ID   = "order_Abc123XyzTest";
const PAYMENT_ID = "pay_Def456UvwTest";
const SECRET     = "test_secret_key_for_unit_tests";

/** Helper: compute signature the same way Razorpay does, for cross-checking */
function razorpayRef(orderId, paymentId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

// ── buildSignaturePayload ─────────────────────────────────────────────────

describe("buildSignaturePayload", () => {
  it("formats the payload as 'order_id|payment_id'", () => {
    expect(buildSignaturePayload(ORDER_ID, PAYMENT_ID)).toBe(
      `${ORDER_ID}|${PAYMENT_ID}`
    );
  });

  it("works with minimal string values", () => {
    expect(buildSignaturePayload("a", "b")).toBe("a|b");
  });
});

// ── computeRazorpaySignature ──────────────────────────────────────────────

describe("computeRazorpaySignature", () => {
  it("returns a 64-character hex string", () => {
    const sig = computeRazorpaySignature(ORDER_ID, PAYMENT_ID, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the reference HMAC-SHA256 calculation", () => {
    const sig = computeRazorpaySignature(ORDER_ID, PAYMENT_ID, SECRET);
    expect(sig).toBe(razorpayRef(ORDER_ID, PAYMENT_ID, SECRET));
  });

  it("produces different signatures for different secrets", () => {
    const sig1 = computeRazorpaySignature(ORDER_ID, PAYMENT_ID, "secret_one");
    const sig2 = computeRazorpaySignature(ORDER_ID, PAYMENT_ID, "secret_two");
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different order IDs", () => {
    const sig1 = computeRazorpaySignature("order_AAA", PAYMENT_ID, SECRET);
    const sig2 = computeRazorpaySignature("order_BBB", PAYMENT_ID, SECRET);
    expect(sig1).not.toBe(sig2);
  });
});

// ── verifyRazorpaySignature ───────────────────────────────────────────────

describe("verifyRazorpaySignature", () => {
  it("returns true for a correctly computed signature", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, validSig, SECRET)).toBe(true);
  });

  it("returns false for a tampered signature (one char changed)", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    // Flip the last hex character
    const tampered = validSig.slice(0, -1) + (validSig.endsWith("f") ? "0" : "f");
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, tampered, SECRET)).toBe(false);
  });

  it("returns false when the key secret is wrong", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, validSig, "wrong_secret")).toBe(false);
  });

  it("returns false when the order ID is different from what was signed", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature("order_DIFFERENT", PAYMENT_ID, validSig, SECRET)).toBe(false);
  });

  it("returns false when the payment ID is different from what was signed", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature(ORDER_ID, "pay_DIFFERENT", validSig, SECRET)).toBe(false);
  });

  it("returns false when razorpayOrderId is missing", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature(null, PAYMENT_ID, validSig, SECRET)).toBe(false);
    expect(verifyRazorpaySignature("", PAYMENT_ID, validSig, SECRET)).toBe(false);
  });

  it("returns false when razorpayPaymentId is missing", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature(ORDER_ID, null, validSig, SECRET)).toBe(false);
    expect(verifyRazorpaySignature(ORDER_ID, "", validSig, SECRET)).toBe(false);
  });

  it("returns false when the signature is missing", () => {
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, null, SECRET)).toBe(false);
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, "", SECRET)).toBe(false);
  });

  it("returns false when the key secret is missing", () => {
    const validSig = razorpayRef(ORDER_ID, PAYMENT_ID, SECRET);
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, validSig, null)).toBe(false);
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, validSig, "")).toBe(false);
  });

  it("returns false for a non-hex / wrong-length signature (timingSafeEqual length mismatch)", () => {
    // timingSafeEqual throws if buffers have different lengths — verifyRazorpaySignature must return false
    expect(verifyRazorpaySignature(ORDER_ID, PAYMENT_ID, "not-hex-garbage", SECRET)).toBe(false);
  });
});
