import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type"); // e.g. "recovery" for password reset

  if (code) {
    // Exchange the auth code for a session using a server-side Supabase client.
    // We use the service role key here ONLY for the code exchange —
    // the resulting session is scoped to the individual user.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the appropriate page based on the auth type
      if (type === "recovery") {
        // Password reset flow → go to login page in recovery mode
        return NextResponse.redirect(`${origin}/login?type=recovery`);
      }
      // Email confirmation or other flows → go to the `next` param or home
      return NextResponse.redirect(`${origin}${next}`);
    }

    // If code exchange fails, redirect with a descriptive error
    console.error("[auth/callback] Code exchange error:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // No code present — redirect to login with an error
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Missing auth code. The link may have expired.")}`
  );
}
