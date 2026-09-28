/**
 * CACAPO — Razorpay Signature Utilities
 *
 * Extracted pure functions from the verify-payment route so they can be
 * unit-tested independently of the HTTP/Supabase layer.
 */
import crypto from "crypto";

/**
 * Builds the exact string Razorpay signs: "<order_id>|<payment_id>"
 *
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @returns {string}
 */
export function buildSignaturePayload(razorpayOrderId, razorpayPaymentId) {
  return `${razorpayOrderId}|${razorpayPaymentId}`;
}

/**
 * Computes the expected HMAC-SHA256 signature for a Razorpay payment.
 *
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} keySecret  - RAZORPAY_KEY_SECRET environment variable
 * @returns {string}          - Hex-encoded signature
 */
export function computeRazorpaySignature(razorpayOrderId, razorpayPaymentId, keySecret) {
  const payload = buildSignaturePayload(razorpayOrderId, razorpayPaymentId);
  return crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
}

/**
 * Verifies whether a Razorpay callback signature is authentic.
 *
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature  - Signature received from Razorpay callback
 * @param {string} keySecret          - RAZORPAY_KEY_SECRET environment variable
 * @returns {boolean}                 - true if authentic, false if tampered/invalid
 */
export function verifyRazorpaySignature(
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  keySecret
) {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !keySecret) {
    return false;
  }
  const expected = computeRazorpaySignature(razorpayOrderId, razorpayPaymentId, keySecret);
  // Use timingSafeEqual to prevent timing-attack side-channel leaks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(razorpaySignature, "hex")
    );
  } catch {
    // If lengths differ, timingSafeEqual throws — treat as invalid
    return false;
  }
}
