"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

/**
 * /auth/callback — Client-side auth callback page.
 *
 * Supabase uses the implicit flow by default (tokens/errors in URL hash).
 * This page handles two scenarios:
 *
 * 1. **Implicit flow** (hash fragment): Supabase redirects here with
 *    #access_token=...&type=recovery or #error=access_denied&error_code=otp_expired
 *    The global AuthHashRedirect component (in root layout) picks up hash
 *    fragments and redirects accordingly. This page just needs to RENDER
 *    so that AuthHashRedirect can fire.
 *
 * 2. **PKCE flow** (query param): Supabase redirects here with ?code=XXX.
 *    This page exchanges the code for a session client-side.
 *
 * A server-side Route Handler (route.js) CANNOT be used here because
 * hash fragments are never sent to the server.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing your request...");

  useEffect(() => {
    const code = searchParams.get("code");
    const type = searchParams.get("type");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // If there's an error in query params, redirect to login with the error
    if (errorParam) {
      const message = errorDescription
        ? decodeURIComponent(errorDescription)
        : "An authentication error occurred. Please try again.";
      router.replace(`/login?error=${encodeURIComponent(message)}&tab=forgot`);
      return;
    }

    // PKCE flow: exchange the code for a session
    if (code) {
      setStatus("Verifying your link...");

      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("[auth/callback] Code exchange error:", error.message);
          let message = "This link has expired. Please request a new one.";
          if (error.message?.includes("expired") || error.message?.includes("invalid")) {
            message = "This password reset link has expired. Please request a new one.";
          }
          router.replace(`/login?error=${encodeURIComponent(message)}&tab=forgot`);
          return;
        }

        // Success — redirect based on the type
        if (type === "recovery") {
          router.replace("/login?type=recovery");
        } else {
          router.replace(
            `/login?message=${encodeURIComponent("Email verified successfully! You can now sign in.")}`
          );
        }
      });
      return;
    }

    // Implicit flow: hash fragments are handled by AuthHashRedirect
    // (mounted globally in root layout). If we get here with no code
    // and no hash, the AuthHashRedirect should pick up the hash.
    // Give it a moment to process, then fallback-redirect if nothing happens.
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      // Hash is present — AuthHashRedirect will handle it.
      // Just wait; it runs on mount via useEffect in the root layout.
      setStatus("Redirecting...");
      return;
    }

    // No code and no hash — something went wrong
    const fallbackTimer = setTimeout(() => {
      router.replace(
        `/login?error=${encodeURIComponent("Missing auth code. The link may have expired. Please request a new one.")}&tab=forgot`
      );
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [searchParams, router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#000",
        color: "#fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(255,255,255,0.2)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ fontSize: 14, opacity: 0.7 }}>{status}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#000",
            color: "#fff",
          }}
        >
          <p>Loading...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
