"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ShoppingBag, Database, ArrowLeft, User, LayoutDashboard } from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Orders Desk", path: "/admin/orders", icon: ShoppingBag },
    { name: "Catalog CRUD", path: "/admin/products", icon: Database },
  ];

  return (
    <aside className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-900 shrink-0 flex flex-col justify-between">
      <div>
        {/* Logo Brand area */}
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-lg font-extrabold tracking-[0.2em] text-white hover:text-accent transition-colors block">
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 border transition-all duration-300 ${
                  isActive
                    ? "border-accent bg-accent/5 text-accent font-bold"
                    : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-accent" : "text-zinc-500 group-hover:text-accent"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer area */}
      <div className="p-4 border-t border-zinc-900 space-y-2 text-[10px] font-bold tracking-widest uppercase">
        <Link
          href="/account"
          className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 hover:text-white transition-all duration-300 font-medium"
        >
          <User className="w-3.5 h-3.5 text-zinc-600" />
          <span>My Account</span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 hover:text-white transition-all duration-300 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-600" />
          <span>Back to Shop</span>
        </Link>
      </div>
    </aside>
  );
}
