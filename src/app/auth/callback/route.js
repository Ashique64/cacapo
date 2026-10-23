import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /auth/callback
 *
 * Handles the Supabase PKCE auth callback for:
 *  - Password reset (type=recovery)
 *  - Email verification / sign-up confirmation
 *
 * When a user clicks a magic link or reset link in their email, Supabase
 * redirects them here with a `code` query parameter. This route exchanges
 * that code for a session using the Supabase Auth API, then redirects the
 * user to the appropriate page.
 *
 * Without this route, the PKCE code is never exchanged, and the user sees
 * "Missing auth code. The link may have expired."
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  // Determine the correct origin for redirects
  // In production, use the configured site URL to avoid mismatches
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (!code) {
    // No code present — redirect to login with an error
    const errorMessage = encodeURIComponent(
      "Missing auth code. The link may have expired."
    );
    return NextResponse.redirect(
      `${siteUrl}/login?error=${errorMessage}&tab=forgot`
    );
  }

  try {
    // Create a Supabase client to exchange the code
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Code exchange error:", error.message);

      // Determine a user-friendly error message
      let message = "This password reset link has expired. Please request a new one.";
      if (error.message?.includes("expired")) {
        message = "This password reset link has expired. Please request a new one.";
      } else if (error.message?.includes("invalid")) {
        message = "This link is invalid. Please request a new one.";
      }

      return NextResponse.redirect(
        `${siteUrl}/login?error=${encodeURIComponent(message)}&tab=forgot`
      );
    }

    // Successfully exchanged the code for a session.
    // For recovery (password reset), we need to pass the session tokens
    // to the client so the Supabase JS SDK can pick them up.
    if (type === "recovery") {
      // Redirect to the login page with recovery type.
      // Include the access_token and refresh_token in the URL hash
      // so the client-side Supabase SDK can establish the session.
      const accessToken = data.session?.access_token;
      const refreshToken = data.session?.refresh_token;

      if (accessToken && refreshToken) {
        // Pass tokens via hash fragment so the client SDK picks them up
        return NextResponse.redirect(
          `${siteUrl}/login?type=recovery#access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`
        );
      }

      return NextResponse.redirect(`${siteUrl}/login?type=recovery`);
    }

    // For email verification / sign-up confirmation, redirect to login
    // The user will now be confirmed and can sign in
    return NextResponse.redirect(
      `${siteUrl}/login?message=${encodeURIComponent("Email verified successfully! You can now sign in.")}`
    );
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}&tab=forgot`
    );
  }
}
