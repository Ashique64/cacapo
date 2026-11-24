/**
 * UTM Capture Utility — Client Side
 *
 * Reads UTM params + fbclid from the URL on first visit and stores them
 * in sessionStorage so they survive page navigations within the same session.
 *
 * Usage:
 *   captureUTMParams()   — call on mount in layout or root component
 *   getUTMAttribution()  — call at checkout to read & attach to the order
 */

const UTM_SESSION_KEY = "cacapo_utm";
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

/** Capture UTM params from the current URL and persist in sessionStorage */
export function captureUTMParams() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const hasUTM = UTM_PARAMS.some((p) => params.get(p));
    if (!hasUTM) return; // Nothing to capture this page load

    const existing = getUTMAttribution(); // Don't overwrite if already set this session

    const attribution = {
      utm_source: params.get("utm_source") || existing.utm_source || null,
      utm_medium: params.get("utm_medium") || existing.utm_medium || null,
      utm_campaign: params.get("utm_campaign") || existing.utm_campaign || null,
      utm_content: params.get("utm_content") || existing.utm_content || null,
      utm_term: params.get("utm_term") || existing.utm_term || null,
      fbclid: params.get("fbclid") || existing.fbclid || null,
      gclid: params.get("gclid") || existing.gclid || null,
      landing_page: window.location.pathname,
      captured_at: new Date().toISOString(),
    };

    // Remove nulls
    Object.keys(attribution).forEach((k) => attribution[k] === null && delete attribution[k]);

    sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(attribution));
  } catch (_) {}
}

/** Read UTM attribution stored this session. Returns {} if nothing captured. */
export function getUTMAttribution() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(UTM_SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/** Returns a human-readable source label for display in admin.
 *  e.g. "Meta Ads" / "Google Ads" / "Instagram" / "Direct" */
export function getAttributionLabel(attribution) {
  if (!attribution || Object.keys(attribution).length === 0) return null;

  const src = (attribution.utm_source || "").toLowerCase();
  const med = (attribution.utm_medium || "").toLowerCase();

  if (attribution.fbclid || src.includes("facebook") || src.includes("instagram") || med === "paid_social") {
    return "Meta Ads";
  }
  if (attribution.gclid || src.includes("google") || med === "cpc") {
    return "Google Ads";
  }
  if (src.includes("instagram")) return "Instagram";
  if (src.includes("whatsapp")) return "WhatsApp";
  if (src === "email" || med === "email") return "Email";
  if (med === "organic" || src === "organic") return "Organic Search";
  if (src) return src.charAt(0).toUpperCase() + src.slice(1);
  return "Referral";
}
