import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ exists: false, error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check auth.users via admin API
    let page = 1;
    let exists = false;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error) {
        throw error;
      }

      if (!data?.users || data.users.length === 0) {
        break;
      }

      if (data.users.some((u) => u.email?.toLowerCase() === cleanEmail)) {
        exists = true;
        break;
      }

      if (data.users.length < 100) {
        break;
      }
      page++;
    }

    return NextResponse.json({ exists });
  } catch (err) {
    console.error("Check email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
