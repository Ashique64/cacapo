/**
 * Meta (Facebook) Pixel Tracking Utility for CACAPO E-Commerce
 * Pixel ID: 4888838111402362
 *
 * Implements:
 * - Browser + CAPI Deduplication via eventID
 * - Enhanced Advanced Matching (EMQ boost for faster algorithmic learning)
 * - Rich E-Commerce Events (ViewContent, AddToCart, InitiateCheckout, Purchase, Search)
 */

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "4888838111402362";

/**
 * Fires a PageView event on route changes
 */
export const pageview = () => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
};

/**
 * Enhanced Advanced Matching
 * Allows Meta to pair website browsing with the user's Instagram/Facebook account.
 * Meta's fbevents.js automatically hashes raw values via SHA-256 client-side.
 *
 * @param {Object} userData - { email, phone, firstName, lastName, city, state, zip }
 */
export const setAdvancedMatching = (userData = {}) => {
  if (typeof window === "undefined" || !window.fbq || !userData) return;
  try {
    const clean = {};
    if (userData.email) clean.em = userData.email.trim().toLowerCase();
    if (userData.phone) clean.ph = userData.phone.replace(/\D/g, "");
    if (userData.firstName || userData.fullName || userData.full_name) {
      const name = userData.firstName || userData.fullName || userData.full_name || "";
      clean.fn = name.split(" ")[0].trim().toLowerCase();
      const parts = name.trim().split(" ");
      if (parts.length > 1) {
        clean.ln = parts.slice(1).join(" ").toLowerCase();
      }
    }
    if (userData.lastName) clean.ln = userData.lastName.trim().toLowerCase();
    if (userData.city) clean.ct = userData.city.trim().toLowerCase();
    if (userData.state) clean.st = userData.state.trim().toLowerCase();
    if (userData.zip || userData.pincode) clean.zp = String(userData.zip || userData.pincode).trim();
    clean.country = "in";

    if (Object.keys(clean).length > 0) {
      window.fbq("init", FB_PIXEL_ID, clean);
    }
  } catch (_) {}
};

/**
 * Generic event tracker with deduplication support
 * @param {string} name - Event name (e.g., 'ViewContent', 'AddToCart', 'Purchase')
 * @param {Object} options - Event parameters
 * @param {Object} [extra] - Extra Meta params, e.g. { eventID: 'order_123' }
 */
export const event = (name, options = {}, extra = null) => {
  if (typeof window !== "undefined" && window.fbq) {
    if (extra && extra.eventID) {
      // 3rd argument is parameters, 4th argument is { eventID } for deduplication with CAPI
      window.fbq("track", name, options, { eventID: String(extra.eventID) });
    } else {
      window.fbq("track", name, options);
    }
  }
};

/**
 * 1. ViewContent — Fires when a customer views a product details page
 */
export const trackViewContent = (product) => {
  if (!product) return;
  const rawPrice = product.sale_price || product.price || 0;
  const priceInRupees = typeof rawPrice === "number" ? rawPrice / 100 : 0;
  const categoryName = product.category?.name || product.categories?.name || product.category_name || "Women's Clothing";

  event("ViewContent", {
    content_name: product.name || "Product",
    content_category: categoryName,
    content_ids: [String(product.id || product.slug || "")],
    content_type: "product",
    value: priceInRupees,
    currency: "INR",
  });
};

/**
 * 2. AddToCart — Fires when a customer adds an item to cart
 */
export const trackAddToCart = ({ id, name, price, quantity = 1, category = "Women's Clothing", currency = "INR" }) => {
  event("AddToCart", {
    content_name: name || "Product",
    content_category: category,
    content_ids: [String(id || "")],
    content_type: "product",
    value: Number(price) * Number(quantity),
    currency,
  });
};

/**
 * 3. InitiateCheckout — Fires when a customer navigates to checkout
 */
export const trackInitiateCheckout = ({ items = [], total = 0, currency = "INR", eventId = null }) => {
  const contentIds = items.map((i) => String(i.id || i.product_id || "")).filter(Boolean);

  event(
    "InitiateCheckout",
    {
      content_ids: contentIds,
      content_type: "product",
      num_items: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
      value: Number(total),
      currency,
    },
    eventId ? { eventID: eventId } : null
  );
};

/**
 * 4. Purchase — Fires upon successful order placement (COD or Prepaid)
 * Passes eventID: orderId to match Meta Conversions API (CAPI) server event
 */
export const trackPurchase = ({ orderId, value = 0, currency = "INR", items = [] }) => {
  const contentIds = items.map((i) => String(i.id || i.product_id || "")).filter(Boolean);

  event(
    "Purchase",
    {
      content_type: "product",
      content_ids: contentIds,
      order_id: String(orderId || ""),
      num_items: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
      value: Number(value),
      currency,
    },
    orderId ? { eventID: String(orderId) } : null
  );
};

/**
 * 5. Search — Fires when a customer searches the collection
 */
export const trackSearch = (searchQuery) => {
  if (!searchQuery) return;
  event("Search", {
    search_string: String(searchQuery).trim(),
  });
};
