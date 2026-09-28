/**
 * CACAPO — In-Memory Sliding Window Rate Limiter
 * ─────────────────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS:
 *   Keeps a Map of { key → [timestamp, timestamp, ...] } where each entry
 *   is an array of request timestamps within the current window.
 *   On each request: prune timestamps older than `windowMs`, count
 *   remaining, reject if over `limit`.
 *
 * TRADEOFFS:
 *   ✅ No external dependencies (no Redis, no Upstash)
 *   ✅ Zero setup — works immediately
 *   ✅ Catches burst abuse effectively on a single instance
 *   ⚠️  Resets on cold starts (Vercel serverless)
 *   ⚠️  Does not coordinate across multiple instances
 *
 *   For a luxury boutique with low traffic volumes, this is the right
 *   choice. If you later scale to high traffic, swap `requestLog` for
 *   an Upstash Redis client — no route changes needed.
 *
 * USAGE:
 *   import { rateLimit } from "@/lib/rateLimit";
 *
 *   // At the top of your POST handler:
 *   const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
 *              ?? request.headers.get("x-real-ip")
 *              ?? "unknown";
 *
 *   const limited = rateLimit(ip, "orders:cancel", { limit: 5, windowMs: 10 * 60 * 1000 });
 *   if (limited) return limited; // returns a NextResponse 429 directly
 */

import { NextResponse } from "next/server";

// Global log: Map<key, number[]>
// key   = `${namespace}:${clientIp}`
// value = array of request timestamps (ms) within the current window
const requestLog = new Map();

// Periodic cleanup: remove entries that have been idle for more than 30 minutes
// so the Map doesn't grow unbounded on long-running instances.
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - CLEANUP_INTERVAL_MS;
    for (const [key, timestamps] of requestLog.entries()) {
      // If the last request for this key was more than 30 min ago, evict it
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
        requestLog.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Check whether the given client has exceeded the rate limit.
 *
 * @param {string} ip        - Client IP address (from x-forwarded-for)
 * @param {string} namespace - Route identifier e.g. "orders:cancel"
 * @param {object} options
 * @param {number} options.limit     - Max allowed requests in the window
 * @param {number} options.windowMs  - Window duration in milliseconds
 *
 * @returns {null | NextResponse}
 *   Returns null if the request is allowed.
 *   Returns a NextResponse with status 429 if the limit is exceeded.
 */
export function rateLimit(ip, namespace, { limit, windowMs }) {
  const key = `${namespace}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or initialise the timestamp log for this key
  const timestamps = requestLog.get(key) ?? [];

  // Prune timestamps outside the current window (sliding window)
  const inWindow = timestamps.filter((t) => t > windowStart);

  if (inWindow.length >= limit) {
    // Calculate seconds until the oldest request falls out of the window
    const oldestInWindow = inWindow[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSecs = Math.ceil(retryAfterMs / 1000);

    return NextResponse.json(
      {
        error: "Too many requests. Please wait before trying again.",
        retryAfter: retryAfterSecs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSecs),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((oldestInWindow + windowMs) / 1000)),
        },
      }
    );
  }

  // Request is allowed — record this timestamp
  inWindow.push(now);
  requestLog.set(key, inWindow);

  return null; // allowed
}

/**
 * Extracts the best available client IP from a Next.js Request object.
 * Handles Vercel's x-forwarded-for header (may contain a comma-separated list).
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
