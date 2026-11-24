/**
 * Meta Conversions API (CAPI) — Server-Side Event Tracking
 * Sends events directly from the server to Meta to supplement browser Pixel.
 * Deduplication is done via event_id matching between browser pixel and CAPI.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "4888838111402362";
const API_VERSION = "v19.0";
const CAPI_URL = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

/**
 * Hash a plain string with SHA-256 (required by Meta for PII data).
 * Returns lowercase hex string.
 */
async function sha256(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for older Node versions
  const { createHash } = await import("crypto");
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Send one or more events to the Meta Conversions API.
 *
 * @param {Object[]} events - Array of event objects
 * @param {string} events[].event_name  - e.g. "Purchase", "InitiateCheckout"
 * @param {string} events[].event_id    - Unique ID for dedup (use order number)
 * @param {string} [events[].event_source_url] - Page URL where the event occurred
 * @param {Object} [events[].user_data] - { email, phone, first_name, last_name, city, state, zip, country }
 * @param {Object} [events[].custom_data] - { value, currency, order_id, num_items, content_ids, contents }
 * @param {string} [events[].action_source] - "website" (default)
 */
export async function sendCAPIEvents(events) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[CAPI] FACEBOOK_ACCESS_TOKEN not set — skipping CAPI call");
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);

  const enrichedEvents = await Promise.all(
    events.map(async (evt) => {
      const { user_data = {}, custom_data = {}, event_name, event_id, event_source_url, action_source = "website" } = evt;

      // Hash all PII fields
      const hashedUserData = {
        em: user_data.email ? [await sha256(user_data.email)] : undefined,
        ph: user_data.phone ? [await sha256(user_data.phone.replace(/\D/g, ""))] : undefined,
        fn: user_data.first_name ? [await sha256(user_data.first_name)] : undefined,
        ln: user_data.last_name ? [await sha256(user_data.last_name)] : undefined,
        ct: user_data.city ? [await sha256(user_data.city)] : undefined,
        st: user_data.state ? [await sha256(user_data.state)] : undefined,
        zp: user_data.zip ? [await sha256(user_data.zip)] : undefined,
        country: user_data.country ? [await sha256(user_data.country || "in")] : ["5a86fe70e7c4c000e18fc11d1b8bea1f"], // "in" hashed
        client_ip_address: user_data.client_ip || undefined,
        client_user_agent: user_data.user_agent || undefined,
        fbc: user_data.fbc || undefined,  // fb click id from cookie _fbc
        fbp: user_data.fbp || undefined,  // fb browser id from cookie _fbp
      };

      // Remove undefined keys
      Object.keys(hashedUserData).forEach(
        (k) => hashedUserData[k] === undefined && delete hashedUserData[k]
      );

      return {
        event_name,
        event_time: eventTime,
        event_id: String(event_id),
        event_source_url: event_source_url || "https://cacapoclothing.com",
        action_source,
        user_data: hashedUserData,
        custom_data,
      };
    })
  );

  const body = {
    data: enrichedEvents,
    // test_event_code: "TEST12345", // Uncomment to test in Meta Events Manager Test Events tab
  };

  try {
    const res = await fetch(`${CAPI_URL}?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[CAPI] Meta API error:", res.status, errText);
    } else {
      const json = await res.json();
      console.log("[CAPI] Events sent successfully:", json.events_received, "event(s)");
    }
  } catch (err) {
    // CAPI errors should NEVER crash the checkout — just log
    console.error("[CAPI] Network error sending events:", err.message);
  }
}

/**
 * Convenience: Send a Purchase event from server-side (e.g. after COD or Razorpay verify)
 */
export async function sendPurchaseEvent({ orderNumber, totalAmount, currency = "INR", items = [], userInfo = {} }) {
  const value = totalAmount / 100; // convert paise → rupees

  await sendCAPIEvents([
    {
      event_name: "Purchase",
      event_id: orderNumber, // matches browser pixel event_id for dedup
      event_source_url: "https://cacapoclothing.com/checkout",
      user_data: userInfo,
      custom_data: {
        value,
        currency,
        order_id: orderNumber,
        num_items: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
        content_type: "product",
        content_ids: items.map((i) => String(i.product_id || i.id)).filter(Boolean),
        contents: items.map((i) => ({
          id: String(i.product_id || i.id),
          quantity: i.quantity || 1,
          item_price: ((i.variant?.sale_price || i.variant?.price || i.price || 0) / 100).toFixed(2),
        })),
      },
    },
  ]);
}

/**
 * Convenience: Send an InitiateCheckout event from server-side
 */
export async function sendInitiateCheckoutEvent({ totalAmount, currency = "INR", items = [], userInfo = {} }) {
  const value = totalAmount / 100;

  await sendCAPIEvents([
    {
      event_name: "InitiateCheckout",
      event_id: `ic_${Date.now()}`,
      event_source_url: "https://cacapoclothing.com/checkout",
      user_data: userInfo,
      custom_data: {
        value,
        currency,
        num_items: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
        content_type: "product",
        content_ids: items.map((i) => String(i.product_id || i.id)).filter(Boolean),
      },
    },
  ]);
}
