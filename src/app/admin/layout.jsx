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
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    redirect("/login?redirect=/admin/orders");
  }

  // Verify if user is listed in admin_users table
  const { data: adminUser, error: dbError } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (dbError) {
    console.error("Database error verifying admin status:", dbError);
  }

  if (dbError || !adminUser) {
    redirect("/account?error=unauthorized_admin");
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row antialiased">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/20 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              System Active
            </span>
          </div>

          <div className="text-[10px] font-bold tracking-wider text-zinc-400">
            Authenticated: <span className="text-white font-semibold">{user.email}</span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 md:p-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
