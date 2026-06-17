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
  const [activeTab, setActiveTab] = useState("stock");
  const [stockItems, setStockItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Quick adjustment forms state (scoped by key)
  const [qtyChange, setQtyChange] = useState({});
  const [adjustReason, setAdjustReason] = useState({});
  const [actionLoading, setActionLoading] = useState({});

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
  }, [activeTab]);

  // Real-time subscription: updates stock live when variants or products change
  useEffect(() => {
    if (activeTab !== "stock") return;

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
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "stock") {
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
        
        // Initialize quick adjustment states
        const changes = {};
        const reasons = {};
        rows.forEach(item => {
          changes[item.key] = "";
          reasons[item.key] = "restock";
        });
        setQtyChange(changes);
        setAdjustReason(reasons);

      } else {
        // Fetch inventory logs
        const { data: logsData, error: logErr } = await supabase
          .from("inventory_logs")
          .select(`
            *,
            product:products (name, brand, product_images(image_url)),
            variant:product_variants (size, color)
          `)
          .order("created_at", { ascending: false });

        if (logErr) throw logErr;
        setLogs(logsData || []);
      }

    } catch (err) {
      console.error("Failed to load inventory data:", err);
      setError(err.message || "Could not retrieve inventory details.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdjust = async (e, item) => {
    e.preventDefault();
    const change = parseInt(qtyChange[item.key]);
    const reason = adjustReason[item.key];

    if (isNaN(change) || change === 0) {
      showToast("Please enter a non-zero adjustment quantity.", "error");
      return;
    }

    const nextStock = item.stock + change;
    if (nextStock < 0) {
      showToast(`Invalid adjustment. Stock level cannot fall below 0. Current: ${item.stock}`, "error");
      return;
    }

    setActionLoading(prev => ({ ...prev, [item.key]: true }));

    try {
      if (item.type === "variant") {
        // Update product_variants stock
        const { error: updateErr } = await supabase
          .from("product_variants")
          .update({ stock_quantity: nextStock })
          .eq("id", item.id);

        if (updateErr) throw updateErr;

        // Insert inventory log
        const { error: logErr } = await supabase
          .from("inventory_logs")
          .insert({
            product_id: item.productId,
            variant_id: item.id,
            quantity_change: change,
            reason: reason,
            created_at: new Date().toISOString()
          });

        if (logErr) console.warn("Could not insert inventory log:", logErr);

      } else {
        // Update products master stock
        const { error: updateErr } = await supabase
          .from("products")
          .update({ stock_quantity: nextStock })
          .eq("id", item.id);

        if (updateErr) throw updateErr;

        // Insert inventory log
        const { error: logErr } = await supabase
          .from("inventory_logs")
          .insert({
            product_id: item.id,
            variant_id: null,
            quantity_change: change,
            reason: reason,
            created_at: new Date().toISOString()
          });

        if (logErr) console.warn("Could not insert inventory log:", logErr);
      }

      // Clear quick inputs
      setQtyChange(prev => ({ ...prev, [item.key]: "" }));
      
      // Refresh current table
      await fetchData();
      showToast("Stock adjusted successfully.", "success");

    } catch (err) {
      showToast("Failed to adjust stock: " + err.message, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [item.key]: false }));
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

  const filteredLogs = logs.filter(log => 
    log.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {activeTab === "stock" && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 border text-[9px] font-bold tracking-widest uppercase ${
              isLive
                ? "border-green-500/30 bg-green-500/5 text-green-400"
                : "border-zinc-800 bg-zinc-950 text-zinc-600"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
              {isLive ? "Live" : "Connecting…"}
            </div>
          )}

          <button 
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync Logs
          </button>
        </div>
      </div>

      {/* Tab Switcher & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        
        {/* Switchers */}
        <div className="flex gap-2 text-[10px] font-bold tracking-widest uppercase">
          <button
            onClick={() => { setActiveTab("stock"); setSearchTerm(""); }}
            className={`px-5 py-2.5 transition-all duration-300 rounded-none border flex items-center gap-2 ${
              activeTab === "stock"
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Stock Tracking
          </button>
          <button
            onClick={() => { setActiveTab("logs"); setSearchTerm(""); }}
            className={`px-5 py-2.5 transition-all duration-300 rounded-none border flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Inventory Logs
          </button>
        </div>

        {/* Search & Low Stock Toggle */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {activeTab === "stock" && (
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
          )}

          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder={activeTab === "stock" ? "Search stock items..." : "Search logs..."}
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
      ) : activeTab === "stock" ? (
        
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
                  <th className="p-4 text-center w-80">Quick Stock Adjustment Action</th>
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

                      {/* Quick Adjust form */}
                      <td className="p-4">
                        <form 
                          onSubmit={(e) => handleQuickAdjust(e, item)}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="number"
                            placeholder="e.g. +10, -5"
                            value={qtyChange[item.key] || ""}
                            onChange={(e) => setQtyChange(prev => ({ ...prev, [item.key]: e.target.value }))}
                            className="w-20 bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 text-center text-white outline-none rounded-none font-mono"
                            required
                          />
                          <select
                            value={adjustReason[item.key] || "restock"}
                            onChange={(e) => setAdjustReason(prev => ({ ...prev, [item.key]: e.target.value }))}
                            className="bg-zinc-950 border border-zinc-800 text-[9px] font-bold tracking-widest px-2 py-1.5 text-zinc-400 outline-none rounded-none uppercase"
                          >
                            <option value="restock">Restock</option>
                            <option value="inventory correction">Correction</option>
                            <option value="damage return">Damage</option>
                            <option value="sale return">Return</option>
                          </select>
                          <button
                            type="submit"
                            disabled={actionLoading[item.key]}
                            className="px-3.5 py-2 bg-white text-black hover:bg-accent hover:text-white transition-all rounded-none cursor-pointer flex items-center justify-center border-none text-[10px] font-bold uppercase tracking-widest"
                          >
                            {actionLoading[item.key] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Apply"
                            )}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )

      ) : (

        /* INVENTORY LOGS HISTORY */
        filteredLogs.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
            No historical logs found.
          </div>
        ) : (
          <div className="border border-zinc-900 bg-black overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] text-xs tracking-wider">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-bold uppercase">
                  <th className="p-4 w-14">Image</th>
                  <th className="p-4">Item Name</th>
                  <th className="p-4 text-center">Variant</th>
                  <th className="p-4 text-center">Qty Change</th>
                  <th className="p-4">Reason / Campaign</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredLogs.map(log => {
                  const pName = log.product?.name || "Archived Item";
                  const pBrand = log.product?.brand || "CACAPO";
                  const thumb = log.product?.product_images?.[0]?.image_url || "/Images/clothing.jpg";
                  const isPositive = log.quantity_change > 0;
                  const formattedChange = isPositive ? `+${log.quantity_change}` : log.quantity_change;
                  const dateFormatted = new Date(log.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <tr key={log.id} className="hover:bg-zinc-950/20 transition-colors">
                      
                      {/* Image */}
                      <td className="p-4">
                        <div className="w-10 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                          <img src={thumb} alt={pName} className="w-full h-full object-cover" />
                        </div>
                      </td>

                      {/* Item Name */}
                      <td className="p-4">
                        <span className="font-bold text-white uppercase block">{pName}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mt-0.5">{pBrand}</span>
                      </td>

                      {/* Variant details */}
                      <td className="p-4 text-center text-zinc-300 font-semibold uppercase">
                        {log.variant ? `${log.variant.size} ${log.variant.color ? `• ${log.variant.color}` : ""}` : "OS (One Size)"}
                      </td>

                      {/* Qty Change */}
                      <td className={`p-4 text-center font-bold font-mono text-[13px] ${isPositive ? "text-green-500" : "text-red-400"}`}>
                        {formattedChange}
                      </td>

                      {/* Reason */}
                      <td className="p-4 font-bold uppercase text-zinc-400 text-[10px] tracking-wider">
                        {log.reason}
                      </td>

                      {/* Timestamp */}
                      <td className="p-4 font-mono font-semibold text-zinc-500">
                        {dateFormatted}
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
