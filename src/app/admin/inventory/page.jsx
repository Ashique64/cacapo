"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Box,
  History,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Sliders,
  ArrowRight
} from "lucide-react";

export default function AdminInventoryDesk() {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time subscription: updates stock live when variants or products change
  useEffect(() => {

    const channel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "product_variants" },
        (payload) => {
          const updated = payload.new;
          setStockItems(prev =>
            prev.map(item =>
              item.type === "variant" && item.id === updated.id
                ? { ...item, stock: updated.stock_quantity }
                : item
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const updated = payload.new;
          setStockItems(prev =>
            prev.map(item =>
              item.type === "product" && item.id === updated.id
                ? { ...item, stock: updated.stock_quantity }
                : item
            )
          );
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch products and variants
        const { data: products, error: prodErr } = await supabase
          .from("products")
          .select(`
            id, name, sku, stock_quantity, status, brand,
            product_images (image_url),
            product_variants (id, size, color, stock_quantity, sku)
          `)
          .order("name", { ascending: true });

        if (prodErr) throw prodErr;

        // Flatten products and variants into inventory rows
        const rows = [];
        products?.forEach(prod => {
          const thumb = prod.product_images?.[0]?.image_url || "/Images/clothing.jpg";
          
          if (prod.product_variants && prod.product_variants.length > 0) {
            prod.product_variants.forEach(v => {
              rows.push({
                key: `v-${v.id}`,
                type: "variant",
                id: v.id,
                productId: prod.id,
                productName: prod.name,
                brand: prod.brand,
                thumb,
                sku: v.sku || prod.sku || "N/A",
                size: v.size || "-",
                color: v.color || "-",
                stock: v.stock_quantity,
                status: prod.status
              });
            });
          } else {
            // Base product only
            rows.push({
              key: `p-${prod.id}`,
              type: "product",
              id: prod.id,
              productId: prod.id,
              productName: prod.name,
              brand: prod.brand,
              thumb,
              sku: prod.sku || "N/A",
              size: "OS (One Size)",
              color: "-",
              stock: prod.stock_quantity,
              status: prod.status
            });
          }
        });

        setStockItems(rows);
      } catch (err) {
      console.error("Failed to load inventory data:", err);
      setError(err.message || "Could not retrieve inventory details.");
    } finally {
      setLoading(false);
    }
  };

  // Filter computations
  const filteredStock = stockItems.filter(item => {
    const matchesSearch = 
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLowStock = !showLowStockOnly || item.stock < 5;

    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="space-y-8 select-none font-sans text-white animate-fadeIn duration-300">
      
      {/* Header Desk */}
      <div className="flex justify-between items-end pb-6 border-b border-zinc-900">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            Operational Hub
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1">
            Inventory Desk
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time live indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 border text-[9px] font-bold tracking-widest uppercase ${
            isLive
              ? "border-green-500/30 bg-green-500/5 text-green-400"
              : "border-zinc-800 bg-zinc-950 text-zinc-600"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
            {isLive ? "Live" : "Connecting…"}
          </div>

          <button 
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        
        {/* Search & Low Stock Toggle */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center w-full justify-between">
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all rounded-none border flex items-center gap-2 cursor-pointer ${
              showLowStockOnly
                ? "border-red-500/30 bg-red-500/5 text-red-400"
                : "border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Low Stock Alerts
          </button>

          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search stock items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          </div>
        </div>

      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Aligning inventory logs...</span>
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 text-red-500 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-xs tracking-wider font-semibold uppercase">{error}</p>
        </div>
      ) : (
        
        /* STOCK TRACKING WORKSPACE */
        filteredStock.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
            No stock listings matching the parameters.
          </div>
        ) : (
          <div className="border border-zinc-900 bg-black overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px] text-xs tracking-wider">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-bold uppercase">
                  <th className="p-4 w-14">Image</th>
                  <th className="p-4">Master SKU</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4 text-center">Variant Details</th>
                  <th className="p-4 text-center w-24">Current Stock</th>
                  <th className="p-4 text-center w-36">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredStock.map(item => {
                  const isLow = item.stock < 5;
                  const isOut = item.stock === 0;

                  return (
                    <tr key={item.key} className="hover:bg-zinc-950/20 transition-colors">
                      {/* Image */}
                      <td className="p-4">
                        <div className="w-10 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                          <img src={item.thumb} alt={item.productName} className="w-full h-full object-cover" />
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="p-4 font-mono font-bold text-zinc-500">{item.sku}</td>

                      {/* Name */}
                      <td className="p-4">
                        <span className="font-bold text-white uppercase block">{item.productName}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mt-0.5">{item.brand}</span>
                      </td>

                      {/* Variant */}
                      <td className="p-4 text-center text-zinc-300 font-semibold uppercase">
                        {item.size} {item.color !== "-" && `• ${item.color}`}
                      </td>

                      {/* Current Stock */}
                      <td className="p-4 text-center font-bold text-white text-[13px] font-mono">
                        {item.stock}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {isOut ? (
                          <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-none font-sans block w-fit mx-auto">
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-none font-sans block w-fit mx-auto animate-pulse">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-none font-sans block w-fit mx-auto">
                            IN STOCK
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Premium Luxury Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-9999 flex items-center gap-3 px-5 py-4 bg-zinc-950/90 backdrop-blur-md border animate-slideInRight duration-300 rounded-none shadow-2xl ${
          toast.type === "success" 
            ? "border-green-500/30 text-green-400" 
            : "border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-[10px] font-bold tracking-widest uppercase font-mono">{toast.message}</span>
          <button 
            type="button"
            onClick={() => setToast(null)} 
            className="ml-3 text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
