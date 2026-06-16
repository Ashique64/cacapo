import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase";
import Link from "next/link";
import { Shield, ShoppingBag, Database, ArrowLeft, User } from "lucide-react";

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
      <aside className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-900 shrink-0 flex flex-col justify-between">
        <div>
          {/* Logo Brand area */}
          <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <Link href="/admin/orders" className="text-lg font-extrabold tracking-[0.2em] text-white hover:text-accent transition-colors block">
                CACAPO
              </Link>
              <span className="text-[8px] font-bold uppercase tracking-[0.35em] text-accent mt-1 block">
                ADMIN CONSOLE
              </span>
            </div>
            <Shield className="w-4 h-4 text-accent animate-pulse" />
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2 text-xs font-semibold tracking-widest uppercase">
            <Link
              href="/admin/orders"
              className="flex items-center gap-3 px-4 py-3 rounded-none text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 transition-all duration-300"
            >
              <ShoppingBag className="w-4 h-4 text-accent" />
              <span>Orders Desk</span>
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center gap-3 px-4 py-3 rounded-none text-zinc-400 hover:text-white hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 transition-all duration-300"
            >
              <Database className="w-4 h-4 text-accent" />
              <span>Catalog CRUD</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer area */}
        <div className="p-4 border-t border-zinc-900 space-y-2 text-[10px] font-bold tracking-widest uppercase">
          <Link
            href="/account"
            className="flex items-center gap-3 px-4 py-2.5 rounded-none text-zinc-500 hover:text-white transition-all duration-300"
          >
            <User className="w-3.5 h-3.5" />
            <span>My Account</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-none text-zinc-500 hover:text-white transition-all duration-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shop</span>
          </Link>
        </div>
      </aside>

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
