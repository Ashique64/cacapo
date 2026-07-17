import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/returns/signed-urls
 *
 * Accepts an array of evidence file paths and returns signed URLs
 * using the service role key (bypasses RLS on private storage buckets).
 *
 * Body: { paths: string[] }
 * Returns: { signed_urls: Array<{ path, signedUrl, error }> }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { paths } = body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty paths array" },
        { status: 400 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.storage
      .from("return-evidence")
      .createSignedUrls(paths, 3600); // 60 minutes expiry

    if (error) {
      console.error("[signed-urls] Storage error:", error.message);
      return NextResponse.json(
        { error: "Failed to generate signed URLs: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ signed_urls: data || [] });
  } catch (error) {
    console.error("[signed-urls] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate signed URLs" },
      { status: 500 }
    );
  }
}
