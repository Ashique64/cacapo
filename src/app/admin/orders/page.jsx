"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrderStatusBadgeClass, getPaymentStatusBadgeClass } from "@/lib/badgeUtils";
import { createShipment, generateLabel } from "@/lib/delivery";
import { generateTaxInvoice, generatePackagingSlip } from "@/lib/invoiceGenerator";
import AdminPagination from "@/components/ui/AdminPagination";
import { 
  Search, 
  Filter, 
  Check, 
  Truck, 
  MapPin, 
  Phone, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  RefreshCw,
  FileText,
  X
} from "lucide-react";

export default function AdminOrdersDesk() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Store setting states
  const [gstNumber, setGstNumber] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  // Toast State
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info' }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }

  useEffect(() => {
    fetchOrders();
    fetchGst();
  }, []);

  const fetchGst = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "gst_number")
        .maybeSingle();
      if (error) throw error;
      if (data && data.value) {
        setGstNumber(data.value);
      }
    } catch (err) {
      console.error("Failed to load GST number for admin invoice:", err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            product:products (id, name, slug, price, product_images(image_url)),
            variant:product_variants (id, size, color)
          ),
          payments (
            id,
            payment_gateway,
            transaction_id,
            amount,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      setOrders(data || []);

    } catch (err) {
      console.error("Failed to load orders for admin desk:", err);
      setError(err.message || "Could not retrieve orders from the database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTaxInvoice = async (order) => {
    try {
      await generateTaxInvoice(order, gstNumber);
      showToast("Tax Invoice downloaded successfully");
    } catch (err) {
      console.error("Failed to generate PDF invoice:", err);
      showToast("Failed to generate PDF invoice", "error");
    }
  };

  const handleDownloadPackagingSlip = async (order) => {
    try {
      await generatePackagingSlip(order);
      showToast("Packaging Slip downloaded successfully");
    } catch (err) {
      console.error("Failed to generate Packaging Slip:", err);
      showToast("Failed to generate Packaging Slip", "error");
    }
  };

  const handleVerifyPayment = (orderId) => {
    const targetOrder = orders.find(o => o.id === orderId);
    const currentStatus = targetOrder?.order_status || "pending";
    const isCOD = targetOrder?.payment_method === "cod";

    const confirmationMsg = isCOD
      ? "Confirm payment collection for this COD order? This will mark the order as PAID."
      : "Confirm payment verification? This updates payment status to PAID and order to PROCESSING.";

    setConfirmModal({
      title: "Verify Payment",
      message: confirmationMsg,
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        try {
          const nextOrderStatus = (currentStatus === "pending" || currentStatus === "pending_payment")
            ? "processing"
            : currentStatus;

          // 1. Update orders table
          const { error: orderError } = await supabase
            .from("orders")
            .update({ 
              payment_status: "paid", 
              order_status: nextOrderStatus 
            })
            .eq("id", orderId);

          if (orderError) throw orderError;

          // 2. Update payments table if it exists
          const { error: paymentError } = await supabase
            .from("payments")
            .update({ status: "approved" })
            .eq("order_id", orderId);

          if (paymentError) {
            console.warn("Could not update corresponding payments row:", paymentError);
          }

          // Refresh orders desk
          await fetchOrders();
          showToast("Order payment successfully approved.", "success");

        } catch (err) {
          showToast("Failed to verify payment: " + err.message, "error");
        } finally {
          setActionLoading(prev => ({ ...prev, [orderId]: false }));
        }
      }
    });
  };

  const handleMarkDelivered = (order) => {
    const orderId = typeof order === "object" ? order.id : order;
    const orderNo = typeof order === "object" ? order.order_number : orderId;

    setConfirmModal({
      title: "Confirm Order Delivery",
      message: `Are you sure you want to mark Order #${orderNo} as DELIVERED? This will update customer status and enable Tax Invoice download and return eligibility.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        try {
          const { error: shipError } = await supabase
            .from("orders")
            .update({
              order_status: "delivered"
            })
            .eq("id", orderId);

          if (shipError) throw shipError;
          
          showToast(`Order #${orderNo} successfully marked as DELIVERED`, "success");
          await fetchOrders();
        } catch (err) {
          showToast("Failed to update shipment status: " + err.message, "error");
        } finally {
          setActionLoading(prev => ({ ...prev, [orderId]: false }));
        }
      }
    });
  };

  const handleRevertOrderStatus = (order, targetStatus) => {
    const statusLabels = {
      shipped: "Shipped (In Transit)",
      processing: "Processing (Awaiting Dispatch)",
      pending: "Pending"
    };
    const targetLabel = statusLabels[targetStatus] || targetStatus;

    setConfirmModal({
      title: "Revert Order Status",
      message: `Are you sure you want to revert Order #${order.order_number} status back to "${targetLabel}"?`,
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading(prev => ({ ...prev, [order.id]: true }));
        try {
          const { error: dbErr } = await supabase
            .from("orders")
            .update({ order_status: targetStatus })
            .eq("id", order.id);

          if (dbErr) throw dbErr;
          showToast(`Order #${order.order_number} status reverted to ${targetLabel}`, "success");
          await fetchOrders();
        } catch (err) {
          showToast("Failed to revert order status: " + err.message, "error");
        } finally {
          setActionLoading(prev => ({ ...prev, [order.id]: false }));
        }
      }
    });
  };

  const handleCancelOrder = (order) => {
    setConfirmModal({
      title: "Cancel Order",
      message: `Are you sure you want to cancel Order #${order.order_number}? This will return stock items back to inventory, cancel any holds, and log the action.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setActionLoading(prev => ({ ...prev, [order.id]: true }));
        try {
          const res = await fetch("/api/orders/cancel", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ orderId: order.id })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to cancel order");
          }

          showToast(`Order #${order.order_number} has been cancelled successfully. Stocks restored and logged.`, "success");
          await fetchOrders();
        } catch (err) {
          showToast("Failed to cancel order: " + err.message, "error");
        } finally {
          setActionLoading(prev => ({ ...prev, [order.id]: false }));
        }
      }
    });
  };

  const handleCreateShipment = (order) => {
    setConfirmModal({
      title: "Create Courier Shipment",
      message: `Are you sure you want to generate courier shipment & AWB tracking for Order #${order.order_number}?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const orderId = order.id;
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        try {
          // 1. Create shipment on Shiprocket
          const shipResult = await createShipment(order);
          if (!shipResult.status) {
            throw new Error(shipResult.error || "Failed to create shipment on Shiprocket");
          }

          const { shipment_id, awb_code, courier_name } = shipResult;
          const trackingNo = awb_code || "TRK" + Math.floor(Math.random() * 1000000);
          const courier = courier_name || "Shiprocket Express";
          const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;

          // 2. Fetch Label URL
          let labelUrl = "";
          const labelResult = await generateLabel(shipment_id);
          if (labelResult.status) {
            labelUrl = labelResult.label_url;
          }

          // 3. Update Order details in Supabase
          const updatedAddress = {
            ...order.shipping_address,
            shipment_id,
            tracking_url: trackingUrl,
            label_url: labelUrl,
            courier_name: courier
          };

          try {
            const { error: dbErr } = await supabase
              .from("orders")
              .update({
                order_status: "shipped",
                shipping_carrier: courier,
                tracking_number: trackingNo,
                shipment_id,
                tracking_url: trackingUrl,
                shipping_address: updatedAddress
              })
              .eq("id", orderId);

            if (dbErr) {
              const { error: fbErr } = await supabase
                .from("orders")
                .update({
                  order_status: "shipped",
                  shipping_carrier: courier,
                  tracking_number: trackingNo,
                  shipping_address: updatedAddress
                })
                .eq("id", orderId);
              if (fbErr) throw fbErr;
            }
          } catch (err) {
            const { error: fbErr } = await supabase
              .from("orders")
              .update({
                order_status: "shipped",
                shipping_carrier: courier,
                tracking_number: trackingNo,
                shipping_address: updatedAddress
              })
              .eq("id", orderId);
            if (fbErr) throw fbErr;
          }

          showToast(`Shipment created on Shiprocket! AWB: ${trackingNo}`, "success");
          await fetchOrders();
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setActionLoading(prev => ({ ...prev, [order.id]: false }));
        }
      }
    });
  };

  const toggleOrderExpand = (id) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format((cents || 0) / 100);
  };

  // Filter & Search computations
  const filteredOrders = orders.filter(order => {
    // Exclude return/exchange requested orders from standard order desk listing
    if (order.shipping_address?.return_request) {
      return false;
    }

    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address?.phone?.includes(searchTerm);

    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "pending" && (order.order_status === "pending" || order.order_status === "pending_payment")) ||
      order.order_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 select-none font-sans text-white animate-fadeIn duration-300">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-6 border-b border-zinc-900">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            Operational Hub
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1">
            Orders Desk
          </h1>
        </div>

        <button 
          onClick={fetchOrders}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Table
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Order ID, Client Name, or Contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2 text-[10px] font-bold tracking-widest uppercase">
          {[
            { id: "all", name: "All Work" },
            { id: "pending", name: "Awaiting Action" },
            { id: "processing", name: "In Progress" },
            { id: "shipped", name: "Dispatched" },
            { id: "delivered", name: "Completed" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2.5 transition-all duration-300 rounded-none border ${
                statusFilter === tab.id
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Syncing incoming files...</span>
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 text-red-500 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-xs tracking-wider font-semibold uppercase">{error}</p>
          <p className="text-[11px] text-zinc-500">Ensure the Supabase tables exist and RLS permits admin query access.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
          No records matching the operational search criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const dateFormatted = new Date(order.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            // Get payment gateway status / UTR code
            const paymentDetails = order.payments?.[0];
            const utrCode = paymentDetails?.transaction_id;

            return (
              <div 
                key={order.id} 
                className="border border-zinc-900 bg-zinc-950/20 overflow-hidden transition-all duration-300 hover:border-zinc-800"
              >
                {/* Summary Header Row */}
                <div 
                  onClick={() => toggleOrderExpand(order.id)}
                  className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 cursor-pointer hover:bg-zinc-950/40 transition-colors"
                >
                  <div className="space-y-1.5 tracking-wider text-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-bold text-white text-[13px]">{order.order_number}</span>
                      
                      {/* Payment Method Badge */}
                      <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                        {order.payment_method?.toUpperCase()}
                      </span>

                      {/* Payment Status Badge */}
                      <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${getPaymentStatusBadgeClass(order.payment_status)}`}>
                        {order.payment_status?.toUpperCase()}
                      </span>

                      {/* Order Status Badge */}
                      <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${getOrderStatusBadgeClass(order.order_status)}`}>
                        {order.order_status?.toUpperCase()?.replace("_", " ")}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-zinc-500">
                      Customer: <span className="text-zinc-300 font-semibold">{order.shipping_address?.full_name}</span> • {dateFormatted}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="text-right tracking-wider text-xs">
                      <span className="text-zinc-500 font-bold block text-[9px] uppercase">Transaction Value</span>
                      <span className="text-white font-extrabold text-[13.5px]">{formatPrice(order.total_amount)}</span>
                    </div>
                    <div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-zinc-900 p-6 bg-zinc-950/40 space-y-8 animate-fadeIn">
                    
                    {/* Grid: Order Items & Client Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left: Product Line Items (L: 7) */}
                      <div className="lg:col-span-7 space-y-4">
                        <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-900 pb-2">
                          Ordered Items
                        </h4>

                        <div className="space-y-3 divide-y divide-zinc-900/60">
                          {order.order_items?.map((item, idx) => {
                            const pName = item.product?.name || "Archived Piece";
                            const pImg = item.product?.product_images?.[0]?.image_url || "/Images/clothing.jpg";
                            
                            return (
                              <div key={item.id || idx} className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center text-xs tracking-wider">
                                <div className="w-12 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                                  <img
                                    src={pImg}
                                    alt={pName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-white uppercase truncate text-[11px]">{pName}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">
                                    {item.variant?.size && `Size: ${item.variant.size}`}
                                    {item.variant?.color && ` • Color: ${item.variant.color}`}
                                  </p>
                                  <p className="text-zinc-400 text-[10px] mt-1">
                                    {item.quantity} x {formatPrice(item.price)}
                                  </p>
                                </div>
                                <div className="font-extrabold text-white">
                                  {formatPrice(item.price * item.quantity)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Invoice calculations */}
                        <div className="border-t border-zinc-900 pt-4 space-y-1 text-zinc-400 text-[11px] leading-relaxed tracking-wider">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-green-500">
                              <span>Discount Code Applied</span>
                              <span>-{formatPrice(order.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Shipping Charge</span>
                            <span>{formatPrice(order.shipping_charge)}</span>
                          </div>
                          <div className="flex justify-between text-white font-extrabold border-t border-zinc-900 pt-2 text-[12px] items-start">
                            <div className="flex flex-col">
                              <span>Final Total Amount</span>
                              <span className="text-[9px] text-zinc-500 tracking-wider font-normal mt-0.5 font-sans normal-case">
                                (Inclusive of GST)
                              </span>
                              {gstNumber && (
                                <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase mt-1">
                                  GSTIN: {gstNumber}
                                </span>
                              )}
                            </div>
                            <span className="text-accent">{formatPrice(order.total_amount)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Client Details & Shipping Info (L: 5) */}
                      <div className="lg:col-span-5 space-y-6">
                        
                        {/* Shipping Address card */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-900 pb-2">
                            Shipping Details
                          </h4>
                          <div className="space-y-1.5 tracking-wider text-xs leading-relaxed text-zinc-300">
                            <p className="font-bold text-white uppercase text-[11px]">
                              {order.shipping_address?.full_name}
                            </p>
                            <p className="text-zinc-400">
                              {order.shipping_address?.address_line1}
                              {order.shipping_address?.address_line2 && `, ${order.shipping_address?.address_line2}`}
                              <br />
                              {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}
                              <br />
                              {order.shipping_address?.country}
                            </p>
                            <p className="text-zinc-500 font-bold text-[10px] flex items-center gap-1.5 mt-2">
                              <Phone className="w-3.5 h-3.5 text-accent" /> {order.shipping_address?.phone}
                            </p>
                          </div>
                        </div>

                        {/* UTR Verification Panel (Only shown if payment_method === 'upi' and payment_status !== 'paid') */}
                        {order.payment_method === "upi" && (
                          <div className="border border-zinc-900 bg-zinc-950 p-4 space-y-4">
                            <h5 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-accent animate-pulse" /> UPI Verification
                            </h5>
                            
                            <div className="space-y-2 text-xs tracking-wider">
                              <div className="bg-zinc-900/50 p-3 border border-zinc-800">
                                <span className="text-zinc-500 block text-[9px] font-bold uppercase">Submitted UTR / Transaction ID</span>
                                <span className="text-white font-mono font-bold block text-[13px] mt-1 break-all select-all">
                                  {utrCode || "No transaction reference uploaded"}
                                </span>
                              </div>

                              {order.payment_status !== "paid" ? (
                                <button
                                  onClick={() => handleVerifyPayment(order.id)}
                                  disabled={actionLoading[order.id]}
                                  className="w-full py-2.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-extrabold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 rounded-none disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer border-none"
                                >
                                  {actionLoading[order.id] ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" /> Approve UPI Payment
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="text-[10px] text-green-500 font-bold tracking-widest uppercase flex items-center gap-1.5 py-1">
                                  <CheckCircle2 className="w-4 h-4" /> UPI Payment Approved
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* COD Verification Status */}
                        {order.payment_method === "cod" && (
                          <div className="border border-zinc-900 bg-zinc-950 p-4 space-y-2.5">
                            <h5 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-green-500" /> COD Status
                            </h5>
                            <p className="text-[10px] text-zinc-500 tracking-wider">
                              This order is Cash on Delivery. Confirm payment upon product delivery.
                            </p>
                            {order.payment_status !== "paid" && (
                              <button
                                onClick={() => handleVerifyPayment(order.id)}
                                disabled={actionLoading[order.id]}
                                className="w-full py-2 border border-zinc-800 hover:border-accent text-white text-[9px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer bg-transparent"
                              >
                                {actionLoading[order.id] ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  "Mark COD as Paid"
                                )}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Dispatch Control Form */}
                        {(order.payment_status === "paid" || order.payment_method === "cod") && (
                          <div className="border border-zinc-900 bg-zinc-950 p-4 space-y-4">
                            <h5 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                              <Truck className="w-4 h-4 text-accent" /> Shipment Control
                            </h5>

                            {order.order_status !== "shipped" && order.order_status !== "delivered" && (
                              <button
                                type="button"
                                onClick={() => handleCreateShipment(order)}
                                disabled={actionLoading[order.id]}
                                className="w-full py-2.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-extrabold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer border-none flex items-center justify-center gap-1.5"
                              >
                                {actionLoading[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Shipment on Shiprocket"}
                              </button>
                            )}

                            {order.shipping_address?.label_url && (
                              <div className="pb-1">
                                <a
                                  href={order.shipping_address.label_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 border border-green-500/30 text-green-500 hover:border-green-500 text-[9px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer flex items-center justify-center gap-1.5 bg-green-950/10 text-center no-underline"
                                >
                                  Download Shipping Label
                                </a>
                              </div>
                            )}

                            {(order.order_status === "shipped" || order.order_status === "delivered") && (
                              <div className="bg-zinc-900 border border-zinc-800 p-3 text-[10px] text-zinc-400 font-bold tracking-widest uppercase flex flex-col gap-1">
                                <span>Carrier: {order.shipping_carrier}</span>
                                <span>Tracking AWB: {order.tracking_number}</span>
                                {order.shipping_address?.tracking_url && (
                                  <a
                                    href={order.shipping_address.tracking_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline flex items-center gap-1 mt-1 text-[9px] normal-case tracking-normal"
                                  >
                                    Track Shipment
                                  </a>
                                )}
                              </div>
                            )}

                            {order.order_status === "shipped" && (
                              <button
                                type="button"
                                onClick={() => handleMarkDelivered(order)}
                                disabled={actionLoading[order.id]}
                                className="w-full py-2 bg-green-500 text-white hover:bg-green-600 text-[9px] font-extrabold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer border-none flex items-center justify-center"
                              >
                                {actionLoading[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark Delivered"}
                              </button>
                            )}

                            {order.order_status === "delivered" && (
                              <div className="space-y-2">
                                <div className="bg-green-500/5 border border-green-500/20 p-2 text-center text-[9px] text-green-500 font-bold tracking-widest uppercase flex items-center justify-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRevertOrderStatus(order, "shipped")}
                                  disabled={actionLoading[order.id]}
                                  className="w-full py-1.5 border border-zinc-800 hover:border-amber-500/40 text-zinc-400 hover:text-amber-400 text-[9px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer bg-transparent"
                                >
                                  Revert Status to Shipped
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Documents & Invoices Card */}
                        <div className="border border-zinc-900 bg-zinc-950 p-4 space-y-4">
                          <h5 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                            <FileText className="w-4 h-4 text-accent" /> Documents & Invoices
                          </h5>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleDownloadPackagingSlip(order)}
                              className="py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[9px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer bg-zinc-900/40 flex items-center justify-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" /> Pack Slip
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadTaxInvoice(order)}
                              className="py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[9px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer bg-zinc-900/40 flex items-center justify-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" /> Tax Invoice
                            </button>
                          </div>
                        </div>

                        {/* Cancellation Control (Admin cancellation desk) */}
                        {["pending", "processing", "pending_payment"].includes(order.order_status) && (
                          <div className="border border-red-950/20 bg-red-950/5 p-4 space-y-2.5">
                            <h5 className="text-[10px] font-bold tracking-widest text-red-400 uppercase flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-500" /> Cancellation Desk
                            </h5>
                            <p className="text-[10px] text-zinc-500 tracking-wider">
                              Cancel this order and automatically release all stock holds back to the inventory logs.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              disabled={actionLoading[order.id]}
                              className="w-full py-2 bg-red-950/20 border border-red-900/40 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {actionLoading[order.id] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                "Cancel Order & Restock"
                              )}
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}

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
      )}

      {/* Custom Confirm Modal Overlay */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-9999 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm p-6 space-y-6 shadow-2xl relative animate-fadeIn duration-300">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                {confirmModal.title || "Confirm Action"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed tracking-wider font-sans">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-1/2 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all rounded-none bg-transparent cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="w-1/2 py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all rounded-none cursor-pointer border-none"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
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
