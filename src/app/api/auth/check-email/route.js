import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/check-email
 *
 * Checks whether an email address belongs to a registered Supabase user.
 * Uses the service-role key (server-side only — never exposed to the client).
 *
 * Body: { email: string }
 * Response: { exists: boolean }
 *
 * Supabase's resetPasswordForEmail always returns success to prevent
 * email enumeration attacks. This server route lets us do a safe
 * pre-check so we can show a meaningful error to the user.
 */
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      // If the service role key isn't configured, fail open so the
      // password reset email still sends (no check performed).
      console.warn("[check-email] SUPABASE_SERVICE_ROLE_KEY not set — skipping user check");
      return NextResponse.json({ exists: true });
    }

    // Admin client — never expose this key to the browser
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Use the admin API to look up the user by email
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      console.error("[check-email] Admin listUsers error:", error.message);
      // Fail open — don't block the reset flow if we can't check
      return NextResponse.json({ exists: true });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const exists = data.users.some(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    return NextResponse.json({ exists });
  } catch (err) {
    console.error("[check-email] Unexpected error:", err);
    return NextResponse.json({ exists: true }); // Fail open
  }
}
