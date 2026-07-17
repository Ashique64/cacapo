"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shield, ShoppingBag, Database, LayoutDashboard, Ticket, Box, Menu, X, Users, LogOut, Settings, TrendingUp, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";

export default function AdminSidebar({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [returnsCount, setReturnsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const signOut = useAuthStore((state) => state.signOut);

  // Fetch Returns Desk count badge dynamically
  useEffect(() => {
    const fetchReturnsCount = async () => {
      try {
        // A. Try loading pending/under_review returns from return_requests table
        const { count, error } = await supabase
          .from("return_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "under_review"]);

        if (!error) {
          setReturnsCount(count || 0);
          return;
        }

        // B. Fallback to order address return metadata if table is not created yet
        const { data: orders } = await supabase
          .from("orders")
          .select("shipping_address");

        const pendingReturns = (orders || []).filter(order => {
          const rr = order.shipping_address?.return_request;
          return rr && ["pending", "under_review"].includes(rr.status);
        }).length;

        setReturnsCount(pendingReturns);
      } catch (e) {
        console.error("[AdminSidebar] Error loading return counts:", e);
      }
    };

    fetchReturnsCount();

    const interval = setInterval(fetchReturnsCount, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Orders Desk count badge dynamically (pending + processing)
  useEffect(() => {
    const fetchOrdersCount = async () => {
      try {
        const { count, error } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("order_status", ["pending", "processing"]);

        if (!error) {
          setOrdersCount(count || 0);
        }
      } catch (e) {
        console.error("[AdminSidebar] Error loading order counts:", e);
      }
    };

    fetchOrdersCount();

    const interval = setInterval(fetchOrdersCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setIsOpen(false);
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }, [signOut, router]);

  const navItems = useMemo(() => [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Orders Desk", path: "/admin/orders", icon: ShoppingBag },
    { name: "Returns Desk", path: "/admin/returns", icon: RotateCcw },
    { name: "Catalog CRUD", path: "/admin/products", icon: Database },
    { name: "Coupons Desk", path: "/admin/coupons", icon: Ticket },
    { name: "Inventory Desk", path: "/admin/inventory", icon: Box },
    ...(role === "super_admin" ? [
      { name: "Sales Report", path: "/admin/sales", icon: TrendingUp },
      { name: "Users Desk", path: "/admin/users", icon: Users },
      { name: "Store Settings", path: "/admin/settings", icon: Settings },
    ] : []),
  ], [role]);

  return (
    <aside className="relative w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-900 shrink-0 flex flex-col md:h-screen md:sticky md:top-0 z-30">
      {/* Brand Header / Mobile Top Bar */}
      <div className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0">
        <div>
          <Link 
            href="/admin" 
            onClick={() => setIsOpen(false)}
            className="text-lg font-extrabold tracking-[0.2em] text-white hover:text-accent transition-colors block"
          >
            CACAPO
          </Link>
          <span className="text-[8px] font-bold uppercase tracking-[0.35em] text-accent mt-0.5 block">
            ADMIN CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-accent animate-pulse" />
          
          {/* Mobile Menu Button with rotation animation */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 text-zinc-400 hover:text-white transition-all duration-300 focus:outline-none relative w-9 h-9 flex items-center justify-center rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 cursor-pointer"
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <Menu className={`absolute w-4 h-4 transition-all duration-300 ${isOpen ? "opacity-0 scale-75 rotate-90" : "opacity-100 scale-100 rotate-0"}`} />
              <X className={`absolute w-4 h-4 transition-all duration-300 ${isOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90"}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Navigation and Footer Container */}
      <div className={`${
        isOpen
          ? "flex flex-col justify-between absolute top-16 left-0 w-full h-[calc(100vh-64px)] bg-zinc-950/98 z-40 p-4 border-b border-zinc-900 overflow-y-auto"
          : "hidden md:flex md:flex-col md:justify-between md:flex-1"
      }`}>
        <div>
          {/* Navigation Links */}
          <nav className="p-2 md:p-4 space-y-2 text-xs font-semibold tracking-widest uppercase">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 border transition-all duration-300 group hover:translate-x-1 ${
                    isActive
                      ? "border-accent bg-accent/5 text-accent font-bold"
                      : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/30"
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-accent" : "text-zinc-500 group-hover:text-accent"}`} />
                  <span>{item.name}</span>
                  {item.name === "Orders Desk" && ordersCount > 0 && (
                    <span className="ml-auto bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-none font-mono">
                      {ordersCount}
                    </span>
                  )}
                  {item.name === "Returns Desk" && returnsCount > 0 && (
                    <span className="ml-auto bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-none font-mono">
                      {returnsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer area */}
        <div className="p-4 border-t border-zinc-900 md:border-t-0 md:border-t-zinc-900 space-y-2 text-[10px] font-bold tracking-widest uppercase">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 hover:text-white transition-all duration-300 group hover:translate-x-1 font-medium bg-transparent border-0 cursor-pointer text-left outline-none"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-600 transition-colors group-hover:text-white" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
