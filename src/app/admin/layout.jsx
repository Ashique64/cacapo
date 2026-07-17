import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import AdminSidebar from "@/components/layout/AdminSidebar";

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
    <div className="h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden antialiased">
      {/* Admin Sidebar */}
      <AdminSidebar role={adminUser?.role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/20 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              System Active
            </span>
          </div>

          <div className="text-[10px] font-bold tracking-wider text-zinc-400 truncate max-w-[200px] sm:max-w-none">
            Authenticated: <span className="text-white font-semibold">{user.email}</span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
