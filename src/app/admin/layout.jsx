import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminLayoutClient from "@/components/layout/AdminLayoutClient";

export const metadata = {
  title: "CACAPO Admin Desk",
  description: "Premium e-commerce administrative suite",
};

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  if (!token) {
    redirect("/login?redirect=/admin/orders");
  }

  const supabase = createServerSupabase(token);
  let user = null;
  let adminUser = null;

  try {
    const { data, error: authError } = await supabase.auth.getUser(token);
    if (!authError && data) {
      user = data.user;
    }
  } catch (err) {
    console.error("Network timeout or connection error during admin auth verification:", err);
  }

  if (!user) {
    redirect("/login?redirect=/admin/orders");
  }

  try {
    // Verify if user is listed in admin_users table
    const { data, error: dbError } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error("Database error verifying admin status:", dbError);
    } else {
      adminUser = data;
    }
  } catch (err) {
    console.error("Network or connection error verifying admin role in database:", err);
  }

  if (!adminUser) {
    redirect("/account?error=unauthorized_admin");
  }

  return (
    <AdminLayoutClient user={user} adminUser={adminUser}>
      {children}
    </AdminLayoutClient>
  );
}
