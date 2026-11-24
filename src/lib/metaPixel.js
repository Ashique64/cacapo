/**
 * Meta (Facebook) Pixel Tracking Utility for CACAPO E-Commerce
 * Pixel ID: 4888838111402362
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
 * Generic event tracker
 * @param {string} name - Event name (e.g., 'ViewContent', 'AddToCart', 'Purchase')
 * @param {Object} options - Event parameters
 */
export const event = (name, options = {}) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", name, options);
  }
};

/**
 * 1. ViewContent — Fires when a customer views a product details page
 */
export const trackViewContent = (product) => {
  if (!product) return;
  const rawPrice = product.sale_price || product.price || 0;
  const priceInRupees = typeof rawPrice === "number" ? rawPrice / 100 : 0;

  event("ViewContent", {
    content_name: product.name || "Product",
    content_category: product.category?.name || product.category_name || "Apparel",
    content_ids: [String(product.id || product.slug || "")],
    content_type: "product",
    value: priceInRupees,
    currency: "INR",
  });
};

/**
 * 2. AddToCart — Fires when a customer adds an item to cart
 */
export const trackAddToCart = ({ id, name, price, quantity = 1, currency = "INR" }) => {
  event("AddToCart", {
    content_name: name || "Product",
    content_ids: [String(id || "")],
    content_type: "product",
    value: Number(price) * Number(quantity),
    currency,
  });
};

/**
 * 3. InitiateCheckout — Fires when a customer navigates to checkout
 */
export const trackInitiateCheckout = ({ items = [], total = 0, currency = "INR" }) => {
  const contentIds = items.map((i) => String(i.id || i.product_id || "")).filter(Boolean);

  event("InitiateCheckout", {
    content_ids: contentIds,
    content_type: "product",
    num_items: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
    value: Number(total),
    currency,
  });
};

/**
 * 4. Purchase — Fires upon successful order placement (COD or Prepaid)
 */
export const trackPurchase = ({ orderId, value = 0, currency = "INR", items = [] }) => {
  const contentIds = items.map((i) => String(i.id || i.product_id || "")).filter(Boolean);

  event("Purchase", {
    content_type: "product",
    content_ids: contentIds,
    order_id: String(orderId || ""),
    num_items: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
    value: Number(value),
    currency,
  });
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
