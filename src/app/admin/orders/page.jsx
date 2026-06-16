"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  RefreshCw
} from "lucide-react";

export default function AdminOrdersDesk() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Shipment form states (scoped by order ID)
  const [shippingCarrier, setShippingCarrier] = useState({});
  const [trackingNumber, setTrackingNumber] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

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

      // Initialize shipping inputs from order data
      const carriers = {};
      const trackings = {};
      data?.forEach(order => {
        carriers[order.id] = order.shipping_carrier || "";
        trackings[order.id] = order.tracking_number || "";
      });
      setShippingCarrier(carriers);
      setTrackingNumber(trackings);

    } catch (err) {
      console.error("Failed to load orders for admin desk:", err);
      setError(err.message || "Could not retrieve orders from the database.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (orderId) => {
    if (!confirm("Confirm payment verification? This updates payment status to PAID and order to PROCESSING.")) return;
    
    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      // 1. Update orders table
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          payment_status: "paid", 
          order_status: "processing" 
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

    } catch (err) {
      alert("Failed to verify payment: " + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUpdateShipment = async (e, orderId, nextStatus) => {
    e.preventDefault();
    const carrier = shippingCarrier[orderId]?.trim();
    const tracking = trackingNumber[orderId]?.trim();

    if (!carrier || !tracking) {
      alert("Please enter both Carrier name and Tracking reference.");
      return;
    }

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const { error: shipError } = await supabase
        .from("orders")
        .update({
          order_status: nextStatus,
          shipping_carrier: carrier,
          tracking_number: tracking
        })
        .eq("id", orderId);

      if (shipError) throw shipError;
      
      alert(`Order successfully marked as ${nextStatus.toUpperCase()}`);
      await fetchOrders();

    } catch (err) {
      alert("Failed to update shipment details: " + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
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
          {filteredOrders.map(order => {
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
                      <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                        order.payment_status === "paid" 
                          ? "bg-green-500/10 border border-green-500/20 text-green-500" 
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      }`}>
                        {order.payment_status?.toUpperCase()}
                      </span>

                      {/* Order Status Badge */}
                      <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                        order.order_status === "pending" || order.order_status === "pending_payment"
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                          : order.order_status === "processing"
                            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                            : order.order_status === "shipped"
                              ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                              : "bg-green-500/10 border border-green-500/20 text-green-500"
                      }`}>
                        {order.order_status?.toUpperCase()}
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
                          <div className="flex justify-between">
                            <span>GST / Taxes</span>
                            <span>{formatPrice(order.tax)}</span>
                          </div>
                          <div className="flex justify-between text-white font-extrabold border-t border-zinc-900 pt-2 text-[12px]">
                            <span>Final Total Amount</span>
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
                        {order.payment_status === "paid" && (
                          <form 
                            onSubmit={(e) => handleUpdateShipment(e, order.id, "shipped")}
                            className="border border-zinc-900 bg-zinc-950 p-4 space-y-4"
                          >
                            <h5 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                              <Truck className="w-4 h-4 text-accent" /> Shipment Control
                            </h5>

                            <div className="space-y-3">
                              {/* Shipping Carrier */}
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Shipping Carrier</label>
                                <input
                                  type="text"
                                  placeholder="e.g. DHL, BlueDart, Delhivery"
                                  value={shippingCarrier[order.id] || ""}
                                  onChange={(e) => setShippingCarrier(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-xs px-3 py-2 text-white outline-none rounded-none transition-all"
                                  required
                                />
                              </div>

                              {/* Tracking Number */}
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Tracking Reference ID</label>
                                <input
                                  type="text"
                                  placeholder="e.g. AWBC100234123"
                                  value={trackingNumber[order.id] || ""}
                                  onChange={(e) => setTrackingNumber(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-xs px-3 py-2 text-white outline-none rounded-none transition-all"
                                  required
                                />
                              </div>

                              {/* Status Action CTAs */}
                              <div className="flex gap-2.5 pt-2">
                                {order.order_status !== "shipped" && order.order_status !== "delivered" && (
                                  <button
                                    type="submit"
                                    disabled={actionLoading[order.id]}
                                    className="w-full py-2 bg-white text-black text-[9px] font-extrabold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-none cursor-pointer border-none flex items-center justify-center"
                                  >
                                    Mark Dispatched
                                  </button>
                                )}
                                
                                {order.order_status !== "delivered" && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleUpdateShipment(e, order.id, "delivered")}
                                    disabled={actionLoading[order.id]}
                                    className={`py-2 text-[9px] font-extrabold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer flex items-center justify-center ${
                                      order.order_status === "shipped"
                                        ? "w-full bg-green-500 text-white hover:bg-green-600 border-none"
                                        : "w-1/2 border border-zinc-800 hover:border-green-500 hover:text-green-500 bg-transparent text-zinc-400"
                                    }`}
                                  >
                                    Mark Delivered
                                  </button>
                                )}
                              </div>

                              {/* Display active shipping values */}
                              {order.order_status === "delivered" && (
                                <div className="bg-green-500/5 border border-green-500/20 p-3 text-[10px] text-green-500 font-bold tracking-widest uppercase flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" /> Shipment Delivered ({order.shipping_carrier} - {order.tracking_number})
                                </div>
                              )}
                            </div>
                          </form>
                        )}

                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
