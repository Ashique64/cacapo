import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  ArrowRight, 
  DollarSign,
  AlertCircle
} from "lucide-react";

export const revalidate = 0; // Fetch dynamic data on every request

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  const supabase = createServerSupabase(token);

  let stats = {
    revenue: 0,
    ordersCount: 0,
    pendingOrders: 0,
    productsCount: 0,
  };
  let recentOrders = [];
  let errorMsg = null;

  try {
    // 1. Fetch Orders data
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("total_amount, order_status, order_number, created_at, shipping_address");

    if (ordersError) throw ordersError;

    if (orders) {
      stats.ordersCount = orders.length;
      stats.revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      stats.pendingOrders = orders.filter(o => o.order_status === "pending" || o.order_status === "pending_payment").length;
      
      // Sort and take latest 5
      recentOrders = [...orders]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    }

    // 2. Fetch Products count
    const { count, error: productsError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (productsError) throw productsError;
    stats.productsCount = count || 0;

  } catch (err) {
    console.error("Error loading admin stats dashboard:", err);
    errorMsg = "Unable to fetch live database analytics. Using sandbox mode.";
    
    // Sandbox fallback values
    stats = {
      revenue: 54200000, // ₹5,42,000
      ordersCount: 12,
      pendingOrders: 3,
      productsCount: 6,
    };
    recentOrders = [
      { order_number: "CACAPO-9824", total_amount: 18500000, order_status: "pending", created_at: new Date().toISOString(), shipping_address: { full_name: "Muhammed Ashique" } },
      { order_number: "CACAPO-9823", total_amount: 24000000, order_status: "processing", created_at: new Date(Date.now() - 3600000).toISOString(), shipping_address: { full_name: "Jane Doe" } },
      { order_number: "CACAPO-9822", total_amount: 9800000, order_status: "delivered", created_at: new Date(Date.now() - 86400000).toISOString(), shipping_address: { full_name: "John Smith" } },
    ];
  }

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  return (
    <div className="space-y-10 pb-12 font-sans select-none animate-fadeIn duration-500">
      
      {/* Alert Warning for fallback state */}
      {errorMsg && (
        <div className="p-4 border border-zinc-800 bg-zinc-950 text-zinc-400 text-xs tracking-wider flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-accent shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hero Welcome */}
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-accent">
          Cacapo Executive Suite
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1.5">
          Workspace Overview
        </h1>
        <p className="text-xs text-zinc-500 tracking-wide mt-1">
          Monitor your store metrics, catalog size, and dispatch orders desk seamlessly.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue */}
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Gross Revenue</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
              {formatPrice(stats.revenue)}
            </h2>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block mt-1">
              Sales transactions value
            </span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
              {stats.ordersCount}
            </h2>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block mt-1">
              Checkout transactions
            </span>
          </div>
        </div>

        {/* Action Required */}
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Awaiting Action</span>
            <span className="text-[9px] font-extrabold tracking-widest px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent font-mono">
              PENDING
            </span>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
              {stats.pendingOrders}
            </h2>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block mt-1">
              Orders requiring verification
            </span>
          </div>
        </div>

        {/* Total Products */}
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[10px] font-extrabold tracking-widest uppercase">Catalog Size</span>
            <Package className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
              {stats.productsCount}
            </h2>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block mt-1">
              Active items in store
            </span>
          </div>
        </div>

      </div>

      {/* Grid: Navigation Desk & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Desk */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="text-xs font-bold tracking-[0.25em] uppercase text-zinc-400">
            Operations Desks
          </h3>

          <div className="space-y-4">
            
            {/* Link to Orders Desk */}
            <Link 
              href="/admin/orders" 
              className="group block p-6 border border-zinc-900 bg-zinc-950/10 hover:border-zinc-800 hover:bg-zinc-950/60 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent font-mono block w-fit">
                    ACTIVE DESK
                  </span>
                  <h4 className="text-sm font-bold tracking-widest uppercase text-white group-hover:text-accent transition-colors">
                    Orders Desk
                  </h4>
                  <p className="text-[11px] text-zinc-500 tracking-wide leading-relaxed max-w-[280px]">
                    Verify incoming UPI transactions, coordinate dispatches, and update shipping parameters.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            {/* Link to Catalog Desk */}
            <Link 
              href="/admin/products" 
              className="group block p-6 border border-zinc-900 bg-zinc-950/10 hover:border-zinc-800 hover:bg-zinc-950/60 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono block w-fit">
                    CATALOG CRUD
                  </span>
                  <h4 className="text-sm font-bold tracking-widest uppercase text-white group-hover:text-accent transition-colors">
                    Catalog Management
                  </h4>
                  <p className="text-[11px] text-zinc-500 tracking-wide leading-relaxed max-w-[280px]">
                    Create new collections, customize inventory variations, and edit pricing thresholds.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

          </div>
        </div>

        {/* Recent Orders List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold tracking-[0.25em] uppercase text-zinc-400">
              Recent Activity
            </h3>
            <Link 
              href="/admin/orders" 
              className="text-[10px] font-bold tracking-widest uppercase text-accent hover:text-white transition-colors"
            >
              View All Orders
            </Link>
          </div>

          <div className="border border-zinc-900 bg-zinc-950/20 overflow-hidden">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs tracking-wider">
                No orders registered in the system yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {recentOrders.map((order, index) => {
                  const dateFormatted = new Date(order.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div key={order.order_number || index} className="p-5 flex items-center justify-between gap-4 hover:bg-zinc-950/30 transition-colors">
                      <div className="space-y-1 tracking-wider text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-[13px]">{order.order_number}</span>
                          <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                            order.order_status === "pending" || order.order_status === "pending_payment"
                              ? "bg-accent/10 border border-accent/20 text-accent"
                              : "bg-green-500/10 border border-green-500/20 text-green-500"
                          }`}>
                            {order.order_status?.toUpperCase() || "PENDING"}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Customer: <span className="text-zinc-400 font-semibold">{order.shipping_address?.full_name || "Guest Client"}</span> • {dateFormatted}
                        </p>
                      </div>

                      <div className="text-right tracking-wider text-xs shrink-0">
                        <span className="text-white font-extrabold text-[13px]">{formatPrice(order.total_amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
