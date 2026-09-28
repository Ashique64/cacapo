/**
 * Tests for src/lib/rateLimit.js
 *
 * Covers:
 *  - Allowing requests under the limit
 *  - Blocking once the limit is hit
 *  - Sliding window expiry (old requests falling out)
 *  - Correct Retry-After / X-RateLimit headers on 429
 *  - Namespace isolation (different namespaces don't share counters)
 *  - IP isolation (different IPs don't share counters)
 *  - getClientIp: x-forwarded-for (single and comma-separated), x-real-ip, unknown fallback
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Fires `count` requests through rateLimit and returns the last response.
 * Uses a unique key prefix to keep tests isolated from each other.
 */
function fireRequests(ip, namespace, options, count) {
  let result = null;
  for (let i = 0; i < count; i++) {
    result = rateLimit(ip, namespace, options);
  }
  return result;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("rateLimit — sliding window", () => {
  // Use a unique namespace per test to avoid state bleed between tests
  let ns;
  beforeEach(() => {
    // Generate a unique namespace so the in-memory Map starts fresh per test
    ns = `test:${Date.now()}:${Math.random()}`;
  });

  it("allows requests under the limit", () => {
    const opts = { limit: 3, windowMs: 10_000 };
    const r1 = rateLimit("1.2.3.4", ns, opts);
    const r2 = rateLimit("1.2.3.4", ns, opts);
    const r3 = rateLimit("1.2.3.4", ns, opts);

    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(r3).toBeNull();
  });

  it("blocks the request that exceeds the limit", () => {
    const opts = { limit: 3, windowMs: 10_000 };
    fireRequests("1.2.3.4", ns, opts, 3); // use up the limit
    const blocked = rateLimit("1.2.3.4", ns, opts);

    expect(blocked).not.toBeNull();
    expect(blocked.status).toBe(429);
  });

  it("returns a Response with status 429 and JSON body", async () => {
    const opts = { limit: 1, windowMs: 10_000 };
    rateLimit("1.2.3.4", ns, opts); // consume limit
    const blocked = rateLimit("1.2.3.4", ns, opts);

    const body = await blocked.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("retryAfter");
    expect(typeof body.retryAfter).toBe("number");
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it("sets Retry-After and X-RateLimit-Limit headers on 429", () => {
    const opts = { limit: 2, windowMs: 60_000 };
    fireRequests("1.2.3.4", ns, opts, 2);
    const blocked = rateLimit("1.2.3.4", ns, opts);

    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("allows requests again after the window expires", () => {
    // Use a tiny 10ms window
    const opts = { limit: 1, windowMs: 10 };

    rateLimit("1.2.3.4", ns, opts); // use up the 1-request limit

    // Advance real time past the window
    return new Promise((resolve) => {
      setTimeout(() => {
        // After 15ms the window has expired; this should be allowed again
        const r = rateLimit("1.2.3.4", ns, opts);
        expect(r).toBeNull();
        resolve();
      }, 15);
    });
  });

  it("isolates different namespaces (separate counters)", () => {
    const opts = { limit: 1, windowMs: 10_000 };
    const nsA = `${ns}:A`;
    const nsB = `${ns}:B`;

    rateLimit("1.2.3.4", nsA, opts); // consume nsA

    // nsB should still have its full quota
    const r = rateLimit("1.2.3.4", nsB, opts);
    expect(r).toBeNull();
  });

  it("isolates different IPs (separate counters)", () => {
    const opts = { limit: 1, windowMs: 10_000 };

    rateLimit("1.1.1.1", ns, opts); // consume limit for IP A

    // IP B should still have its full quota
    const r = rateLimit("2.2.2.2", ns, opts);
    expect(r).toBeNull();
  });
});

describe("getClientIp", () => {
  /**
   * Creates a minimal mock Request with the given headers.
   */
  function mockRequest(headers = {}) {
    return {
      headers: {
        get: (name) => headers[name.toLowerCase()] ?? null,
      },
    };
  }

  it("returns the first IP from x-forwarded-for (single)", () => {
    const req = mockRequest({ "x-forwarded-for": "203.0.113.5" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("returns the client IP (first) from a comma-separated x-forwarded-for chain", () => {
    // x-forwarded-for: client, proxy1, proxy2
    const req = mockRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 172.16.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = mockRequest({ "x-real-ip": "198.51.100.9" });
    expect(getClientIp(req)).toBe("198.51.100.9");
  });

  it("returns 'unknown' when no IP header is present", () => {
    const req = mockRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("strips whitespace from x-forwarded-for entries", () => {
    const req = mockRequest({ "x-forwarded-for": "  203.0.113.5  , 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });
});
