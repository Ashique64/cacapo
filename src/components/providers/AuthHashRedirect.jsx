"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * AuthHashRedirect — mounted globally in the root layout.
 *
 * Supabase's PKCE flow (used for password reset and email confirmation)
 * appends auth tokens or errors to the URL hash fragment, e.g.:
 *   /#error=access_denied&error_code=otp_expired&...
 *   /#access_token=...&type=recovery&...
 *
 * Because hash fragments are only visible to the browser (never sent to
 * the server), Next.js server components cannot intercept them.
 * This client component reads the hash on mount and:
 *  - Redirects error hashes to /login with a readable error message.
 *  - Redirects recovery (password reset) access_token hashes to
 *    /login?type=recovery (the /auth/callback route handles the PKCE
 *    code exchange; this handles the older implicit token style as a fallback).
 */
export default function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;

    // Parse the hash fragment (strip the leading #)
    const params = new URLSearchParams(hash.slice(1));

    const error = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");
    const type = params.get("type");
    const accessToken = params.get("access_token");

    if (error) {
      // Supabase returned an auth error — clean the URL and redirect to login
      // with a user-friendly message
      let message = errorDescription
        ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
        : "An authentication error occurred.";

      if (errorCode === "otp_expired") {
        message =
          "This password reset link has expired. Please request a new one.";
      }

      // Remove the hash from the current URL silently
      window.history.replaceState(null, "", window.location.pathname);

      router.replace(`/login?error=${encodeURIComponent(message)}&tab=forgot`);
      return;
    }

    if (type === "recovery" && accessToken) {
      // Implicit flow fallback: access token in hash for password reset
      // (older Supabase versions or certain configurations).
      // Supabase JS SDK automatically picks this up from the hash via
      // onAuthStateChange, so we just need to navigate to the recovery tab.
      window.history.replaceState(null, "", window.location.pathname);
      router.replace("/login?type=recovery");
    }
  }, [router]);

  return null;
}
