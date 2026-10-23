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
    if (!serviceRoleKey) {
      console.error("[admin-users-api] SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.");
      return NextResponse.json(
        { 
          error: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel Environment Variables. Please add it in Vercel Project Settings > Environment Variables.",
          code: "MISSING_SERVICE_ROLE_KEY"
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch all auth users from Supabase Auth Admin
    let authUsers = [];
    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (!authErr && authData?.users) {
        authUsers = authData.users;
      }
    } catch (e) {
      console.warn("[admin-users-api] Could not list auth users via admin:", e.message);
    }

    // 2. Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.warn("[admin-users-api] Profiles query warning:", profilesError.message);
    }

    // 3. Fetch all admin users
    const { data: admins, error: adminsError } = await supabase
      .from("admin_users")
      .select("*");

    if (adminsError) {
      console.warn("[admin-users-api] Admin users query warning:", adminsError.message);
    }

    // 4. Fetch all orders for LTV
    const { data: orderStats } = await supabase
      .from("orders")
      .select("user_id, total_amount");

    // Aggregate counts & LTV per user
    const statsMap = {};
    (orderStats || []).forEach(o => {
      if (!o.user_id) return;
      if (!statsMap[o.user_id]) statsMap[o.user_id] = { count: 0, ltv: 0 };
      statsMap[o.user_id].count += 1;
      statsMap[o.user_id].ltv += (o.total_amount || 0);
    });

    // 5. Merge all sources into unified user map
    const userMap = new Map();

    // Add Auth Users
    authUsers.forEach(u => {
      userMap.set(u.id, {
        id: u.id,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split("@")[0] : "Client User"),
        phone: u.user_metadata?.phone || u.phone || "N/A",
        email: u.email || "N/A",
        created_at: u.created_at,
        role: "customer",
        orderCount: 0,
        ltv: 0,
      });
    });

    // Merge/Overlay Profiles
    (profiles || []).forEach(p => {
      const existing = userMap.get(p.id) || {};
      userMap.set(p.id, {
        id: p.id,
        full_name: p.full_name || existing.full_name || "Client User",
        phone: p.phone && p.phone !== "N/A" ? p.phone : (existing.phone || "N/A"),
        email: p.email || existing.email || "N/A",
        created_at: p.created_at || existing.created_at || new Date().toISOString(),
        role: existing.role || "customer",
        orderCount: 0,
        ltv: 0,
      });
    });

    // Merge/Overlay Admins & Order Stats
    userMap.forEach((user, id) => {
      const admin = (admins || []).find(a => a.id === id);
      if (admin) {
        user.role = admin.role || "admin";
        if (admin.email && user.email === "N/A") user.email = admin.email;
      }
      const stats = statsMap[id] || { count: 0, ltv: 0 };
      user.orderCount = stats.count;
      user.ltv = stats.ltv;
    });

    // Add Admins that might not have been in authUsers or profiles
    (admins || []).forEach(a => {
      if (!userMap.has(a.id)) {
        const stats = statsMap[a.id] || { count: 0, ltv: 0 };
        userMap.set(a.id, {
          id: a.id,
          full_name: "Admin User",
          phone: "N/A",
          email: a.email || "N/A",
          created_at: a.created_at || new Date().toISOString(),
          role: a.role,
          orderCount: stats.count,
          ltv: stats.ltv,
        });
      }
    });

    const combined = Array.from(userMap.values());
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

export async function PATCH(request) {
  try {
    const { userId, role, email } = await request.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "Missing required fields: userId and role" }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (role === "customer") {
      const { error: deleteErr } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", userId);
      if (deleteErr) throw deleteErr;
    } else {
      const { error: upsertErr } = await supabase
        .from("admin_users")
        .upsert({
          id: userId,
          email: email || null,
          role: role
        });
      if (upsertErr) throw upsertErr;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin-users-patch-api] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user role" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing required field: userId" }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.from("admin_users").delete().eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin-users-delete-api] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user account" },
      { status: 500 }
    );
  }
}
