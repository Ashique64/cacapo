import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/admin/users
 *
 * Secure administrative API to retrieve user profiles, admin roles,
 * and calculate lifetime order counts and lifetime value (LTV).
 * Bypasses client RLS constraints using the service role key.
 */
export async function GET(request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    // 2. Fetch all admin users
    const { data: admins, error: adminsError } = await supabase
      .from("admin_users")
      .select("*");

    if (adminsError) throw adminsError;

    // 3. Fetch all orders for LTV
    const { data: orderStats, error: ordersError } = await supabase
      .from("orders")
      .select("user_id, total_amount");

    if (ordersError) throw ordersError;

    // Aggregate counts & LTV per user
    const statsMap = {};
    (orderStats || []).forEach(o => {
      if (!o.user_id) return;
      if (!statsMap[o.user_id]) statsMap[o.user_id] = { count: 0, ltv: 0 };
      statsMap[o.user_id].count += 1;
      statsMap[o.user_id].ltv += (o.total_amount || 0);
    });

    // 4. Combine into final users list
    const combined = (profiles || []).map((p) => {
      const admin = (admins || []).find((a) => a.id === p.id);
      const stats = statsMap[p.id] || { count: 0, ltv: 0 };
      return {
        id: p.id,
        full_name: p.full_name || "Guest User",
        phone: p.phone || "N/A",
        created_at: p.created_at,
        role: admin ? admin.role : "customer",
        email: admin ? admin.email : p.email,
        orderCount: stats.count,
        ltv: stats.ltv
      };
    });

    // Include admins who might not have a profile row
    const profileIds = new Set((profiles || []).map((p) => p.id));
    (admins || []).forEach((a) => {
      if (!profileIds.has(a.id)) {
        const stats = statsMap[a.id] || { count: 0, ltv: 0 };
        combined.push({
          id: a.id,
          full_name: "Admin Workspace User",
          phone: "N/A",
          created_at: a.created_at,
          role: a.role,
          email: a.email,
          orderCount: stats.count,
          ltv: stats.ltv
        });
      }
    });

    // Sort by creation date
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ users: combined });
  } catch (error) {
    console.error("[admin-users-api] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load users directory" },
      { status: 500 }
    );
  }
}
