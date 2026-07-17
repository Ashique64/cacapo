"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import AdminPagination from "@/components/ui/AdminPagination";
import { requestReturnPickup } from "@/lib/delivery";
import { 
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Package,
  Calendar,
  User,
  Phone,
  ShieldAlert,
  ExternalLink,
  FileText,
  Check,
  Eye,
  Play
} from "lucide-react";

export default function AdminReturnsDesk() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active drawer detail request
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [signedUrls, setSignedUrls] = useState([]);
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Dialog / Action inputs
  const [adminNotesText, setAdminNotesText] = useState("");
  const [fraudFlagStatus, setFraudFlagStatus] = useState(false);
  const [fraudNotesText, setFraudNotesText] = useState("");
  
  // Modal dialog states
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");



  // Search, Filter and Tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'pending', 'under_review', 'approved', 'rejected', 'completed', 'flagged'
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Toast notifications
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

  // Fetch signed evidence URLs on demand when a request is opened
  useEffect(() => {
    if (!selectedRequest) {
      queueMicrotask(() => {
        setSignedUrls([]);
        setAdminNotesText("");
        setFraudFlagStatus(false);
        setFraudNotesText("");
      });
      return;
    }

    const loadEvidenceSignedUrls = async () => {
      const paths = selectedRequest.evidence_urls || [];
      if (paths.length === 0) {
        setSignedUrls([]);
        return;
      }

      setLoadingUrls(true);
      try {
        const res = await fetch("/api/returns/signed-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load signed URLs");
        }

        const { signed_urls } = await res.json();
        setSignedUrls(signed_urls || []);
      } catch (err) {
        console.error("Failed to load signed evidence URLs:", err.message);
        showToast("Error retrieving evidence attachments: " + err.message, "error");
      } finally {
        setLoadingUrls(false);
      }
    };

    loadEvidenceSignedUrls();

    // Reset action state parameters with the request values using microtask to avoid cascading render lint errors
    queueMicrotask(() => {
      setAdminNotesText(selectedRequest.admin_notes || "");
      setFraudFlagStatus(!!selectedRequest.fraud_flag);
      setFraudNotesText(selectedRequest.fraud_notes || "");
    });
  }, [selectedRequest]);

  async function fetchReturnsData() {
    setLoading(true);
    setError(null);
    try {
      // 1. First attempt to load from return_requests table (Step 8.5)
      const { data: dbReqs, error: dbReqsErr } = await supabase
        .from("return_requests")
        .select(`
          *,
          order:orders (
            order_number,
            created_at,
            total_amount,
            payment_status,
            shipping_address,
            order_items (
              id,
              product_id,
              variant_id,
              quantity,
              price,
              product:products (id, name, slug, product_images(image_url)),
              variant:product_variants (id, size, color)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (!dbReqsErr && dbReqs) {
        // Adapt schema into unified state objects
        const requestsMapped = dbReqs.map(r => ({
          id: r.id,
          order_id: r.order_id,
          user_id: r.user_id,
          request_type: r.request_type,
          reason: r.reason,
          reason_notes: r.reason_notes,
          status: r.status,
          items: r.items,
          exchange_details: r.exchange_details,
          evidence_urls: r.evidence_urls || [],
          evidence_skipped: !!r.evidence_skipped,
          evidence_submitted_at: r.evidence_submitted_at,
          fraud_flag: !!r.fraud_flag,
          fraud_notes: r.fraud_notes,
          metadata_notes: r.metadata_notes,
          restocking_fee: r.restocking_fee || 0,
          refund_amount: r.refund_amount,
          tracking_number: r.tracking_number,
          return_shipment_id: r.return_shipment_id,
          admin_notes: r.admin_notes,
          created_at: r.created_at,
          updated_at: r.updated_at,
          order_number: r.order?.order_number || "N/A",
          order_total: r.order?.total_amount || 0,
          order_created_at: r.order?.created_at,
          order_payment_status: r.order?.payment_status,
          shipping_address: r.order?.shipping_address,
          order_items: r.order?.order_items || [],
          is_fallback: false
        }));
        setRequests(requestsMapped);
        return;
      }

      console.warn("Table return_requests query failed, falling back to orders.shipping_address metadata:", dbReqsErr?.message);

      // 2. Fallback: Parse return request JSONs from orders table
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_id,
            variant_id,
            quantity,
            price,
            product:products (id, name, slug, product_images(image_url)),
            variant:product_variants (id, size, color)
          )
        `)
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      const metadataRequests = (orders || [])
        .filter(o => o.shipping_address?.return_request)
        .map(o => {
          const rr = o.shipping_address.return_request;
          return {
            id: rr.id || `metadata_${o.id}`,
            order_id: o.id,
            user_id: o.user_id,
            request_type: rr.request_type || rr.type || "return",
            reason: rr.reason,
            reason_notes: rr.reason_notes,
            status: rr.status || "pending",
            items: rr.items || [],
            exchange_details: rr.exchange_details || null,
            evidence_urls: rr.evidence_urls || [],
            evidence_skipped: !!rr.evidence_skipped,
            evidence_submitted_at: rr.evidence_submitted_at,
            fraud_flag: !!rr.fraud_flag,
            fraud_notes: rr.fraud_notes,
            metadata_notes: rr.metadata_notes,
            restocking_fee: rr.restocking_fee || 0,
            refund_amount: rr.refund_amount,
            tracking_number: rr.tracking_number || rr.return_order_id,
            return_shipment_id: rr.return_shipment_id,
            admin_notes: rr.admin_notes,
            created_at: rr.created_at || o.updated_at,
            updated_at: rr.updated_at || o.updated_at,
            order_number: o.order_number,
            order_total: o.total_amount,
            order_created_at: o.created_at,
            order_payment_status: o.payment_status,
            shipping_address: o.shipping_address,
            order_items: o.order_items || [],
            is_fallback: true
          };
        });

      setRequests(metadataRequests);
    } catch (err) {
      console.error("Failed to load returns records:", err);
      setError("Unable to retrieve return & exchange records: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Restock inventory helper
  const adjustStock = async (itemId, productId, variantId, quantity, isRestock) => {
    try {
      let activeVariantId = variantId;
      let activeProductId = productId;

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
        const { data: variant, error: fetchErr } = await supabase
          .from("product_variants")
          .select("stock_quantity")
          .eq("id", activeVariantId)
          .single();

        if (fetchErr) throw fetchErr;

        const currentStock = variant?.stock_quantity || 0;
        const newStock = isRestock ? currentStock + quantity : Math.max(0, currentStock - quantity);

        const { error: updateErr } = await supabase
          .from("product_variants")
          .update({ stock_quantity: newStock })
          .eq("id", activeVariantId);

        if (updateErr) throw updateErr;
      } else if (activeProductId) {
        const { data: product, error: fetchErr } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", activeProductId)
          .single();

        if (fetchErr) throw fetchErr;

        const currentStock = product?.stock_quantity || 0;
        const newStock = isRestock ? currentStock + quantity : Math.max(0, currentStock - quantity);

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

  // Generic DB Sync updater for status and logs
  const syncRequestUpdate = async (reqId, updates, alertMessage, orderIdToUpdateStatus, newOrderStatus) => {
    setActionLoading(true);
    try {
      const requestObject = requests.find(r => r.id === reqId);
      if (!requestObject) throw new Error("Request not found locally");

      if (requestObject.is_fallback) {
        // Sync update in order shipping_address JSON
        const { data: orderData, error: orderFetchErr } = await supabase
          .from("orders")
          .select("shipping_address")
          .eq("id", requestObject.order_id)
          .single();

        if (orderFetchErr) throw orderFetchErr;

        const originalRequest = orderData.shipping_address?.return_request || {};
        const updatedAddress = {
          ...orderData.shipping_address,
          return_request: {
            ...originalRequest,
            ...updates,
            updated_at: new Date().toISOString()
          }
        };

        const updatePayload = { shipping_address: updatedAddress };
        if (newOrderStatus) {
          updatePayload.order_status = newOrderStatus;
        }

        const { error: syncErr } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", requestObject.order_id);

        if (syncErr) throw syncErr;
      } else {
        // Sync update in return_requests table
        const { error: syncErr } = await supabase
          .from("return_requests")
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq("id", reqId);

        if (syncErr) throw syncErr;

        if (orderIdToUpdateStatus && newOrderStatus) {
          const { error: orderStatusErr } = await supabase
            .from("orders")
            .update({ order_status: newOrderStatus })
            .eq("id", orderIdToUpdateStatus);
          if (orderStatusErr) throw orderStatusErr;
        }
      }

      showToast(alertMessage, "success");
      
      // Update selected drawer state locally
      setSelectedRequest(prev => prev && prev.id === reqId ? { ...prev, ...updates } : prev);
      await fetchReturnsData();
    } catch (err) {
      console.error("Action sync failed:", err);
      showToast("Operation failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ADMIN ACTION: Mark Under Review
  const handleMarkUnderReview = async (req) => {
    await syncRequestUpdate(
      req.id, 
      { status: "under_review" }, 
      "Request marked as under active review."
    );
  };

  // ADMIN ACTION: Approve Request
  const handleApproveRequest = async (req) => {
    setActionLoading(true);
    try {
      // 1. Process Stock adjustments based on return type
      if (req.request_type === "return") {
        // Restock returned items
        for (const item of req.items || []) {
          await adjustStock(item.order_item_id, item.product_id, item.variant_id, item.quantity, true);
        }
      } else if (req.request_type === "exchange") {
        // Step A: Restock returned items
        for (const item of req.items || []) {
          await adjustStock(item.order_item_id, item.product_id, item.variant_id, item.quantity, true);
        }

        // Step B: Deduct exchange replacement variant from stock
        for (const item of req.items || []) {
          const matchDetails = req.exchange_details?.[item.order_item_id];
          if (matchDetails && matchDetails.target_variant_id) {
            await adjustStock(null, null, matchDetails.target_variant_id, item.quantity, false);
          }
        }
      }

      // 2. Sync approval update
      await syncRequestUpdate(
        req.id,
        { status: "approved" },
        "Request approved. Stocks have been auto-adjusted.",
        req.order_id,
        req.request_type === "exchange" ? "exchanged" : "returned"
      );
    } catch (err) {
      showToast("Approval stock adjustment failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ADMIN ACTION: Decline Request
  const handleDeclineRequestSubmit = async () => {
    if (!declineReason.trim()) {
      showToast("Please enter a reason for rejecting the request.", "error");
      return;
    }

    setShowDeclineDialog(false);
    await syncRequestUpdate(
      selectedRequest.id,
      { 
        status: "rejected", 
        admin_notes: `Declined Reason: ${declineReason}` 
      },
      "Return request has been declined.",
      selectedRequest.order_id,
      "delivered" // Revert order status back to delivered
    );
    setDeclineReason("");
  };



  // ADMIN ACTION: Mark Completed
  const handleMarkCompleted = async (req) => {
    setActionLoading(true);
    try {
      if (req.request_type === "return") {
        // Clear payment to refunded in order
        const { error: orderUpdateErr } = await supabase
          .from("orders")
          .update({ payment_status: "refunded" })
          .eq("id", req.order_id);

        if (orderUpdateErr) throw orderUpdateErr;
      }

      await syncRequestUpdate(
        req.id,
        { 
          status: "completed", 
          completed_at: new Date().toISOString() 
        },
        "Return request marked completed successfully."
      );
    } catch (err) {
      showToast("Failed to complete request: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Save admin notes & fraud logs
  const handleSaveMetadataNotes = async () => {
    await syncRequestUpdate(
      selectedRequest.id,
      {
        admin_notes: adminNotesText,
        fraud_flag: fraudFlagStatus,
        fraud_notes: fraudNotesText
      },
      "Admin notes and fraud evaluation parameters saved."
    );
  };

  // Filters, search & Priority Queue sorting
  const processedRequests = useMemo(() => {
    return requests
      .filter(r => {
        // Search filter
        const matchesSearch = 
          r.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.shipping_address?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.reason?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        // Tabs filter
        if (activeTab === "all") return true;
        if (activeTab === "flagged") return r.fraud_flag;
        return r.status === activeTab;
      })
      .sort((a, b) => {
        // Priority Queue logic: requests with evidence (evidence_skipped = false) come first
        if (a.evidence_skipped !== b.evidence_skipped) {
          return a.evidence_skipped ? 1 : -1;
        }
        // Then sort by submission date descending
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [requests, searchTerm, activeTab]);

  const totalPages = Math.ceil(processedRequests.length / itemsPerPage);
  const paginatedRequests = processedRequests.slice(
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
            Restock & Swaps Desk
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1">
            Returns & Exchanges Desk
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Upgraded return verification panel. Priority unboxing queues are tag-highlighted first.
          </p>
        </div>

        <button 
          onClick={fetchReturnsData}
          disabled={loading}
          className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync Log
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border border-zinc-900 bg-zinc-950/50">
        <div className="flex-1 relative flex items-center border border-zinc-850 bg-zinc-950 focus-within:border-accent transition-all">
          <input
            type="text"
            placeholder="Search order #, customer, reason..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-transparent text-white px-4 py-2 text-xs tracking-wider outline-none rounded-none placeholder-zinc-650"
          />
          <Search className="absolute right-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-900 pb-1.5 text-[10px] font-bold tracking-widest uppercase">
        {[
          { key: "all", label: "All Claims" },
          { key: "pending", label: "Pending" },
          { key: "under_review", label: "Review" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Declined" },
          { key: "completed", label: "Completed" },
          { key: "flagged", label: "🚩 Flagged" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={`px-4 py-2 border transition-all rounded-none cursor-pointer ${
              activeTab === tab.key 
                ? "border-accent bg-accent/5 text-accent" 
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-900 bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Syncing returns desk...</span>
        </div>
      ) : paginatedRequests.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
          No return or exchange requests found matching active criteria.
        </div>
      ) : (
        <div className="overflow-x-auto border border-zinc-900">
          <table className="w-full text-left border-collapse text-[11px] tracking-wider uppercase font-semibold">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/45 text-zinc-500 text-[9px]">
                <th className="p-4">Priority / Queue</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4">Attachments</th>
                <th className="p-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950">
              {paginatedRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                const hasEvidence = !req.evidence_skipped;
                
                return (
                  <tr 
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`hover:bg-zinc-900/40 cursor-pointer transition-colors ${
                      isSelected ? "bg-zinc-900" : ""
                    } ${
                      req.fraud_flag ? "bg-amber-950/10 text-amber-300" : ""
                    }`}
                  >
                    <td className="p-4 flex items-center gap-1.5">
                      {hasEvidence ? (
                        <span className="bg-accent/15 border border-accent/25 text-accent text-[7.5px] font-extrabold px-1.5 py-0.5 font-mono">
                          ⚡ PRIORITY
                        </span>
                      ) : (
                        <span className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[7.5px] px-1.5 py-0.5">
                          STANDARD
                        </span>
                      )}
                      {req.fraud_flag && (
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[7.5px] font-extrabold px-1.5 py-0.5">
                          ⚠ REVIEW
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-white">{req.order_number}</td>
                    <td className="p-4 text-zinc-300 normal-case">{req.shipping_address?.full_name}</td>
                    <td className="p-4">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 ${
                        req.request_type === "exchange" ? "text-blue-400 border border-blue-500/25 bg-blue-500/5" : "text-orange-400 border border-orange-500/25 bg-orange-500/5"
                      }`}>
                        {req.request_type}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400">{req.reason.replace("_", " ")}</td>
                    <td className="p-4">
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 ${
                        req.status === "approved"
                          ? "bg-green-500/10 border border-green-500/20 text-green-500"
                          : req.status === "rejected"
                          ? "bg-red-500/10 border border-red-500/20 text-red-500"
                          : req.status === "completed"
                          ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          : req.status === "under_review"
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
                      }`}>
                        {req.status === "pickup_confirmed" ? "PICKUP BOOKED" : req.status === "received" ? "ITEMS IN HAND" : req.status}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 font-mono">
                      {req.evidence_urls?.length || 0} Files
                    </td>
                    <td className="p-4 text-right text-zinc-500 text-[10px] font-mono">
                      {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* SLIDE-OUT DETAIL DRAWER PANEL */}
      {selectedRequest && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-zinc-950 border-l border-zinc-900 z-50 shadow-2xl flex flex-col animate-slideLeft text-xs tracking-wider uppercase font-semibold">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-zinc-900 bg-black flex justify-between items-center">
            <div>
              <span className="text-[8px] font-bold text-accent tracking-[0.25em]">Claim Details Drawer</span>
              <h3 className="text-sm font-extrabold text-white font-mono uppercase mt-0.5">Order {selectedRequest.order_number}</h3>
            </div>
            <button 
              onClick={() => setSelectedRequest(null)}
              className="p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Customer snapshot */}
            <div className="space-y-2">
              <span className="text-zinc-500 font-bold text-[9px] tracking-widest block">Customer Details</span>
              <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2 text-[10.5px]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-bold normal-case">{selectedRequest.shipping_address?.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400 font-mono">{selectedRequest.shipping_address?.phone}</span>
                </div>
                <div className="pt-2 border-t border-zinc-850 flex justify-between text-[9px] font-bold">
                  <span className="text-zinc-500">Transaction ID</span>
                  <span className="text-white font-mono normal-case">{selectedRequest.order_id}</span>
                </div>
              </div>
            </div>

            {/* Requested Items */}
            <div className="space-y-3">
              <span className="text-zinc-500 font-bold text-[9px] tracking-widest block">Items Included in Claim</span>
              <div className="divide-y divide-zinc-900 border border-zinc-900 bg-zinc-950/40 p-4 space-y-3">
                {selectedRequest.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start py-2 first:pt-0 last:pb-0">
                    <div>
                      <span className="text-white font-bold uppercase text-[10.5px] block">{item.name}</span>
                      <span className="text-[9px] text-zinc-500 block uppercase mt-0.5">Original: Size {item.size} / {item.color || "Default"}</span>
                      {selectedRequest.request_type === "exchange" && (
                        <span className="text-[9.5px] text-accent font-bold uppercase mt-1 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-accent" /> Exchange Size: {selectedRequest.exchange_details?.[item.order_item_id]?.target_size || selectedRequest.exchange_size}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-zinc-400">
                      <span>{item.quantity} Units</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reasons / notes */}
            <div className="space-y-2">
              <span className="text-zinc-500 font-bold text-[9px] tracking-widest block">Stated Reason</span>
              <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-2 leading-relaxed">
                <span className="text-white font-extrabold block">{selectedRequest.reason.replace("_", " ")}</span>
                {selectedRequest.reason_notes && (
                  <p className="text-zinc-400 font-sans italic normal-case pt-1.5 border-t border-zinc-850">
                    &ldquo;{selectedRequest.reason_notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Evidence files viewer */}
            <div className="space-y-3">
              <span className="text-zinc-500 font-bold text-[9px] tracking-widest block">Unboxing Evidence Attachments</span>
              {selectedRequest.evidence_purged_at ? (
                <div className="p-4 border border-zinc-900 bg-zinc-950/20 text-zinc-400 text-[10px] text-center italic font-bold">
                  ✓ Evidence files were automatically removed on {new Date(selectedRequest.evidence_purged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} for privacy.
                </div>
              ) : selectedRequest.evidence_skipped ? (
                <div className="p-4 border border-dashed border-zinc-800 text-zinc-500 text-[10px] text-center uppercase font-bold italic">
                  ⚠ Customer skipped unboxing evidence upload.
                </div>
              ) : loadingUrls ? (
                <div className="flex justify-center items-center py-8 gap-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" /> Signed links loading...
                </div>
              ) : signedUrls.length === 0 ? (
                <div className="p-4 border border-dashed border-zinc-800 text-zinc-500 text-[10px] text-center uppercase">
                  No attachments linked to request.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {signedUrls.map((urlObj, index) => {
                    const isVideo = urlObj.path?.endsWith(".mp4") || urlObj.path?.endsWith(".mov") || urlObj.path?.endsWith(".webm");
                    return (
                      <div key={index} className="border border-zinc-900 bg-black aspect-square overflow-hidden relative group">
                        {isVideo ? (
                          <video 
                            src={urlObj.signedUrl} 
                            controls 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <a 
                            href={urlObj.signedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full h-full block"
                          >
                            <img 
                              src={urlObj.signedUrl} 
                              alt={`Evidence ${index + 1}`} 
                              className="w-full h-full object-cover hover:scale-105 transition-transform" 
                            />
                            <div className="absolute bottom-2 right-2 p-1 bg-black/80 border border-zinc-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Nudge if completed but not yet purged */}
              {selectedRequest.status === "completed" && selectedRequest.completed_at && !selectedRequest.evidence_purged_at && !selectedRequest.evidence_skipped && (
                <div className="p-3 bg-zinc-950 border border-zinc-900 text-zinc-500 text-[10px] text-center italic rounded-none tracking-normal normal-case">
                  ⓘ Evidence files will be automatically removed on {new Date(new Date(selectedRequest.completed_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} for client privacy.
                </div>
              )}
            </div>

            {/* EXIF Warning Display */}
            {selectedRequest.metadata_notes && (
              <div className="p-4 border border-amber-900 bg-amber-950/20 text-amber-400 space-y-2 text-[10.5px]">
                <span className="font-extrabold uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" /> SYSTEM FRAUD CHECK ALARM
                </span>
                <p className="font-sans leading-relaxed normal-case">
                  {selectedRequest.metadata_notes}
                </p>
                {selectedRequest.fraud_notes && (
                  <p className="font-mono text-[9.5px] border-t border-amber-900/30 pt-1.5">
                    EXIF Log: {selectedRequest.fraud_notes}
                  </p>
                )}
              </div>
            )}

            {/* Admin Audit notes and Fraud controls */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 space-y-4">
              <span className="text-zinc-400 font-bold text-[9px] tracking-widest block border-b border-zinc-800 pb-1.5">
                Audit Workspace
              </span>

              {/* Admin Notes Textbox */}
              <div className="space-y-1">
                <label className="block text-[8px] font-bold text-zinc-500 uppercase">Internal Auditor Notes</label>
                <textarea
                  value={adminNotesText}
                  onChange={(e) => setAdminNotesText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 text-[10px] font-sans h-20 outline-none focus:border-accent resize-none rounded-none"
                  placeholder="Audit logs, restocking notes, or verification details..."
                />
              </div>

              {/* Fraud Flag Toggle */}
              <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3">
                <div>
                  <span className="text-[10px] text-white block">Audit Fraud Alert Toggle</span>
                  <span className="text-[8.5px] text-zinc-500 block uppercase">Manual override reviews</span>
                </div>
                <input
                  type="checkbox"
                  checked={fraudFlagStatus}
                  onChange={(e) => setFraudFlagStatus(e.target.checked)}
                  className="w-4 h-4 accent-accent cursor-pointer"
                />
              </div>

              {/* Fraud notes */}
              {fraudFlagStatus && (
                <div className="space-y-1">
                  <label className="block text-[8px] font-bold text-accent uppercase">Auditor Fraud Reason *</label>
                  <input
                    type="text"
                    value={fraudNotesText}
                    onChange={(e) => setFraudNotesText(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-2.5 py-1.5 text-[10px] outline-none focus:border-accent rounded-none"
                    placeholder="Description of validation warning..."
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveMetadataNotes}
                disabled={actionLoading}
                className="w-full py-2 bg-zinc-800 border border-zinc-700 text-white text-[10px] font-bold uppercase hover:bg-white hover:text-black transition-colors rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Audit Evaluation"}
              </button>
            </div>

          </div>

          {/* Drawer Actions Footer */}
          <div className="p-5 border-t border-zinc-900 bg-black flex flex-wrap gap-2 justify-end">
            
            {/* Mark Under Review */}
            {selectedRequest.status === "pending" && (
              <button
                type="button"
                onClick={() => handleMarkUnderReview(selectedRequest)}
                disabled={actionLoading}
                className="px-4 py-2 border border-zinc-800 text-zinc-300 text-[9.5px] font-bold hover:border-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent"
              >
                Mark Reviewing
              </button>
            )}



            {/* Decline Request */}
            {["pending", "under_review", "pickup_confirmed", "received"].includes(selectedRequest.status) && (
              <button
                type="button"
                onClick={() => setShowDeclineDialog(true)}
                disabled={actionLoading}
                className="px-4 py-2 border border-accent bg-accent/10 text-accent text-[9.5px] font-bold hover:bg-accent hover:text-white transition-colors cursor-pointer"
              >
                Decline Claim
              </button>
            )}

            {/* Confirm Pickup */}
            {["pending", "under_review"].includes(selectedRequest.status) && (
              <button
                type="button"
                onClick={() => {
                  setActionLoading(true);
                  // Call pickup conformation triggers Delhivery/Shiprocket
                  requestReturnPickup(selectedRequest, selectedRequest)
                    .then(res => {
                      if (!res.status) throw new Error(res.error || "Shiprocket confirmation failed.");
                      
                      const expectedPickup = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
                      return syncRequestUpdate(
                        selectedRequest.id,
                        {
                          status: "pickup_confirmed",
                          expected_pickup_date: expectedPickup,
                          tracking_number: res.return_order_id,
                          return_shipment_id: res.return_shipment_id
                        },
                        "Pickup scheduled successfully via logistics provider.",
                        selectedRequest.order_id,
                        selectedRequest.request_type === "exchange" ? "exchange_requested" : "return_requested"
                      );
                    })
                    .catch(err => {
                      showToast("Booking failed: " + err.message, "error");
                    })
                    .finally(() => setActionLoading(false));
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-white text-black text-[9.5px] font-bold hover:bg-accent hover:text-white transition-colors cursor-pointer border-none"
              >
                Confirm Pickup
              </button>
            )}

            {/* Confirm Items Received */}
            {selectedRequest.status === "pickup_confirmed" && (
              <button
                type="button"
                onClick={() => syncRequestUpdate(
                  selectedRequest.id,
                  { status: "received" },
                  "Claim status updated to items in-hand."
                )}
                disabled={actionLoading}
                className="px-4 py-2 bg-white text-black text-[9.5px] font-bold hover:bg-accent hover:text-white transition-colors cursor-pointer border-none"
              >
                Confirm Items Received
              </button>
            )}

            {/* Approve & Restock */}
            {selectedRequest.status === "received" && (
              <button
                type="button"
                onClick={() => handleApproveRequest(selectedRequest)}
                disabled={actionLoading}
                className="px-5 py-2 bg-white text-black text-[9.5px] font-bold hover:bg-green-500 hover:text-white transition-colors cursor-pointer border-none"
              >
                Approve & Adjust Stock
              </button>
            )}

            {/* Mark Completed */}
            {selectedRequest.status === "approved" && (
              <button
                type="button"
                onClick={() => handleMarkCompleted(selectedRequest)}
                disabled={actionLoading}
                className="px-5 py-2 bg-white text-black text-[9.5px] font-bold hover:bg-green-500 hover:text-white transition-colors cursor-pointer border-none"
              >
                Mark Completed
              </button>
            )}

            {selectedRequest.status === "completed" && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed
              </span>
            )}

            {selectedRequest.status === "rejected" && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                <XCircle className="w-4 h-4 text-red-500" /> Rejected
              </span>
            )}

          </div>
        </div>
      )}

      {/* DECLINE DIALOG MODAL */}
      {showDeclineDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-99999 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm p-6 space-y-6 shadow-2xl relative text-xs tracking-wider uppercase font-semibold">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-accent">Decline Claim Request</h3>
              <p className="text-[10px] text-zinc-500 leading-normal normal-case">
                Provide a reason for declining this request. The customer will view this notes in their account dashboard.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-zinc-905 border border-zinc-800 text-white p-2.5 text-[10px] font-sans h-20 outline-none focus:border-accent resize-none rounded-none mt-2"
                placeholder="Reason for declining..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeclineDialog(false); setDeclineReason(""); }}
                className="w-1/2 py-2 border border-zinc-800 text-white text-[9.5px] font-bold uppercase hover:border-zinc-650 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineRequestSubmit}
                className="w-1/2 py-2 bg-white text-black text-[9.5px] font-bold uppercase hover:bg-accent hover:text-white transition-colors cursor-pointer border-none"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
