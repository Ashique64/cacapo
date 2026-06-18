"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminPagination from "@/components/ui/AdminPagination";
import { 
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Trash2,
  Package,
  Calendar
} from "lucide-react";

export default function AdminReturnsDesk() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'pending', 'approved', 'rejected'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    fetchReturnsData();
  }, []);

  const fetchReturnsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_id,
            variant_id,
            quantity,
            price,
            product:products (id, name, slug, price, product_images(image_url)),
            variant:product_variants (id, size, color)
          )
        `)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      
      // Filter only orders that have a return/exchange request
      const returns = (data || []).filter(order => order.shipping_address?.return_request);
      setOrders(returns);
    } catch (err) {
      console.error("Failed to load returns:", err);
      setError("Unable to retrieve return & exchange records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stock Management helper: Restock/Deduct items
  const adjustStock = async (itemId, productId, variantId, quantity, isRestock) => {
    try {
      let activeVariantId = variantId;
      let activeProductId = productId;

      // Self-healing check if variant/product ID is missing (legacy return requests)
      if (!activeVariantId && !activeProductId && itemId) {
        const { data: dbItem } = await supabase
          .from("order_items")
          .select("product_id, variant_id")
          .eq("id", itemId)
          .maybeSingle();
        if (dbItem) {
          activeVariantId = dbItem.variant_id;
          activeProductId = dbItem.product_id;
        }
      }

      if (activeVariantId) {
        // Fetch current stock
        const { data: variant, error: fetchErr } = await supabase
          .from("product_variants")
          .select("stock_quantity")
          .eq("id", activeVariantId)
          .single();

        if (fetchErr) throw fetchErr;

        const currentStock = variant?.stock_quantity || 0;
        const newStock = isRestock ? currentStock + quantity : Math.max(0, currentStock - quantity);

        // Update stock
        const { error: updateErr } = await supabase
          .from("product_variants")
          .update({ stock_quantity: newStock })
          .eq("id", activeVariantId);

        if (updateErr) throw updateErr;
      } else if (activeProductId) {
        // Fetch simple product stock
        const { data: product, error: fetchErr } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", activeProductId)
          .single();

        if (fetchErr) throw fetchErr;

        const currentStock = product?.stock_quantity || 0;
        const newStock = isRestock ? currentStock + quantity : Math.max(0, currentStock - quantity);

        // Update stock
        const { error: updateErr } = await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", activeProductId);

        if (updateErr) throw updateErr;
      }
    } catch (err) {
      console.error(`Failed to adjust stock for product ${productId} variant ${variantId}:`, err);
      throw new Error(`Inventory adjust error: ${err.message}`);
    }
  };

  const handleReceivePickup = async (order) => {
    const orderId = order.id;
    const request = order.shipping_address?.return_request;
    if (!request) return;

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const updatedRequest = { ...request, status: "received" };
      const updatedAddress = { ...order.shipping_address, return_request: updatedRequest };

      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          shipping_address: updatedAddress
        })
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      showToast(`Pickup confirmed. Request status updated to received.`, "success");
      await fetchReturnsData();
    } catch (err) {
      showToast(`Pickup confirmation failed: ${err.message}`, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleApproveRequest = async (order) => {
    const orderId = order.id;
    const request = order.shipping_address?.return_request;
    if (!request) return;

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      // 1. Process Stock adjustments based on return type
      if (request.type === "return") {
        // Restock returned items
        for (const item of request.items || []) {
          await adjustStock(item.order_item_id, item.product_id, item.variant_id, item.quantity, true);
        }
      } else if (request.type === "exchange") {
        // Step A: Restock returned items
        for (const item of request.items || []) {
          await adjustStock(item.order_item_id, item.product_id, item.variant_id, item.quantity, true);
        }

        // Step B: Deduct exchange size variant from stock
        for (const item of request.items || []) {
          if (request.exchange_size) {
            // Find variant of this product matching desired size
            const { data: matchingVariant } = await supabase
              .from("product_variants")
              .select("id")
              .eq("product_id", item.product_id || item.product?.id)
              .eq("size", request.exchange_size)
              .maybeSingle();

            if (matchingVariant) {
              await adjustStock(null, null, matchingVariant.id, item.quantity, false);
            }
          }
        }
      }

      // 2. Update DB Request status to approved
      const updatedRequest = { ...request, status: "approved" };
      const updatedAddress = { ...order.shipping_address, return_request: updatedRequest };

      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          shipping_address: updatedAddress
        })
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      showToast(`Request approved successfully. Stocks have been auto-adjusted.`, "success");
      await fetchReturnsData();
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRejectRequest = async (order) => {
    const orderId = order.id;
    const request = order.shipping_address?.return_request;
    if (!request) return;

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const updatedRequest = { ...request, status: "rejected" };
      const updatedAddress = { ...order.shipping_address, return_request: updatedRequest };

      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          shipping_address: updatedAddress
        })
        .eq("id", orderId);

      if (updateErr) throw updateErr;

      showToast(`Request rejected. Status updated to declined.`, "info");
      await fetchReturnsData();
    } catch (err) {
      showToast(`Rejection failed: ${err.message}`, "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Filter computations
  const filteredReturns = orders.filter(order => {
    const request = order.shipping_address?.return_request;
    if (!request) return false;

    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" ||
      request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const paginatedReturns = filteredReturns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format((cents || 0) / 100);
  };

  return (
    <div className="space-y-8 select-none font-sans text-white animate-fadeIn duration-500 pb-12">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-9999 px-5 py-3 border text-xs font-bold tracking-wider uppercase flex items-center gap-3 animate-slideIn ${
          toast.type === "success" 
            ? "border-green-500 bg-green-950/90 text-green-400" 
            : toast.type === "error" 
            ? "border-accent bg-accent/10 text-accent" 
            : "border-blue-500 bg-blue-950/90 text-blue-400"
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-zinc-900">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            Restock & Swaps
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1">
            Returns & Exchanges Desk
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Review product return requests, approve refunds, configure swaps, and automatically adjust store inventory.
          </p>
        </div>

        <button 
          onClick={fetchReturnsData}
          disabled={loading}
          className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync Requests
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border border-zinc-900 bg-zinc-950/50">
        <div className="flex-1 relative flex items-center border border-zinc-850 bg-zinc-950 focus-within:border-accent transition-all">
          <input
            type="text"
            placeholder="Search by order ID, customer, or reason..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-transparent text-white px-4 py-2 text-xs tracking-wider outline-none rounded-none placeholder-zinc-650"
          />
          <Search className="absolute right-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>

        <div className="relative md:w-56">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-zinc-950 border border-zinc-850 focus:border-accent text-white px-4 py-2 pl-10 text-xs tracking-wider outline-none transition-all rounded-none appearance-none cursor-pointer"
          >
            <option value="all">All Request Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Returns Content list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-900 bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Syncing returns log...</span>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
          No return or exchange requests logged.
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedReturns.map(order => {
            const req = order.shipping_address.return_request;
            const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric"
            });
            const reqDate = new Date(req.created_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
            });

            return (
              <div key={order.id} className="border border-zinc-900 bg-black overflow-hidden relative">
                
                {/* Request Header Summary */}
                <div className="p-5 border-b border-zinc-900 bg-zinc-950/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 tracking-wider text-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-bold text-white text-[13.5px]">{order.order_number}</span>
                      
                      <span className={`text-[8.5px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-none font-mono ${
                        req.type === "exchange"
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                          : "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                      }`}>
                        {req.type === "exchange" ? "EXCHANGE REQUEST" : "RETURN REQUEST"}
                      </span>

                      <span className={`text-[8.5px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-none font-mono ${
                        req.status === "approved"
                          ? "bg-green-500/10 border border-green-500/20 text-green-500"
                          : req.status === "rejected"
                          ? "bg-red-500/10 border border-red-500/20 text-red-500"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
                      }`}>
                        {req.status?.toUpperCase() || "PENDING"}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-zinc-500">
                      Customer: <span className="text-zinc-400 font-semibold">{order.shipping_address?.full_name}</span> • Requested: {reqDate}
                    </p>
                  </div>

                  <div className="text-left md:text-right tracking-wider text-xs flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-zinc-500 font-bold block text-[9px] uppercase">Transaction Value</span>
                      <span className="text-white font-extrabold text-[13px]">{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Request Details Grid */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs tracking-wider">
                  
                  {/* Items to Swap/Return */}
                  <div className="lg:col-span-5 space-y-3">
                    <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Items in Request
                    </h4>
                    <div className="space-y-3.5 divide-y divide-zinc-900 bg-zinc-950/40 p-4 border border-zinc-900/60">
                      {req.items?.map((item, idx) => (
                        <div key={idx} className="flex gap-3 pt-3 first:pt-0">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-white uppercase text-[10.5px] block truncate">{item.name}</span>
                            <span className="text-[9.5px] text-zinc-500 font-bold uppercase mt-1 block">
                              Original: {item.size || "Standard"} / {item.color || "Default"}
                            </span>
                            {req.type === "exchange" && req.exchange_size && (
                              <span className="text-[9.5px] text-accent font-bold uppercase mt-0.5 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Exchange for size: {req.exchange_size}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-zinc-400 font-semibold">{item.quantity} units</span>
                            <span className="text-zinc-500 font-mono block text-[10px] mt-0.5">{formatPrice(item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Reason and Information */}
                  <div className="lg:col-span-4 space-y-4">
                    <div>
                      <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest mb-1.5">Customer's Stated Reason</h4>
                      <p className="p-4 bg-zinc-950/40 border border-zinc-900/60 text-zinc-400 leading-relaxed rounded-none font-sans italic">
                        "{req.reason}"
                      </p>
                    </div>
                    {req.bank_details && (
                      <div className="p-4 bg-zinc-950/60 border border-zinc-900/60 rounded-none space-y-1">
                        <h4 className="text-accent text-[8.5px] font-bold uppercase tracking-widest mb-1.5">Bank Refund Details</h4>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Holder: <span className="text-white normal-case">{req.bank_details.account_holder}</span></p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Bank: <span className="text-white normal-case">{req.bank_details.bank_name}</span></p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">A/C Number: <span className="text-white font-mono">{req.bank_details.account_number}</span></p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">IFSC Code: <span className="text-white font-mono">{req.bank_details.ifsc_code}</span></p>
                      </div>
                    )}
                    <div>
                      <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest mb-1">Original Order Date</h4>
                      <p className="text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-550" />
                        {orderDate}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons Panel */}
                  <div className="lg:col-span-3 space-y-3.5 h-full flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-zinc-900/60 pt-4 lg:pt-0 lg:pl-6">
                    <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest">Verification Desk</h4>
                    
                    {req.status === "pending" && (
                      <div className="space-y-2.5 w-full">
                        <button
                          onClick={() => handleReceivePickup(order)}
                          disabled={actionLoading[order.id]}
                          className="w-full py-2.5 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-none flex items-center justify-center gap-1.5 cursor-pointer border-none"
                        >
                          {actionLoading[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Pickup & Receive"}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(order)}
                          disabled={actionLoading[order.id]}
                          className="w-full py-2.5 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white hover:border-accent transition-all duration-300 rounded-none flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                        >
                          {actionLoading[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Decline Request"}
                        </button>
                      </div>
                    )}

                    {req.status === "received" && (
                      <div className="space-y-2.5 w-full">
                        <span className="block text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold tracking-widest text-center px-2 py-1 rounded-none font-mono mb-2 uppercase">
                          Items Received (Ready for stock adjustment)
                        </span>
                        <button
                          onClick={() => handleApproveRequest(order)}
                          disabled={actionLoading[order.id]}
                          className="w-full py-2.5 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-green-500 hover:text-white transition-all duration-300 rounded-none flex items-center justify-center gap-1.5 cursor-pointer border-none"
                        >
                          {actionLoading[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Approve & Restock"}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(order)}
                          disabled={actionLoading[order.id]}
                          className="w-full py-2.5 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white hover:border-accent transition-all duration-300 rounded-none flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                        >
                          {actionLoading[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Decline Request"}
                        </button>
                      </div>
                    )}

                    {req.status !== "pending" && req.status !== "received" && (
                      <div className="flex items-center gap-2 text-zinc-500 font-semibold uppercase text-[10px] pt-2">
                        {req.status === "approved" ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            <span>Request Approved</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span>Request Declined</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

    </div>
  );
}
