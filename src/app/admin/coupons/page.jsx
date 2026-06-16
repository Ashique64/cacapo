"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Ticket,
  Calendar,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export default function AdminCouponsDesk() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);

  // Form state
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "", // If percentage (e.g. 10), if fixed (Rupees, e.g. 500)
    minimum_amount: "", // In Rupees
    max_discount: "", // In Rupees
    usage_limit: "",
    expires_at: "",
    is_active: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      setCoupons(data || []);
    } catch (err) {
      console.error("Failed to load coupons:", err);
      setError(err.message || "Could not retrieve coupons from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCouponId(null);
    setForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      minimum_amount: "",
      max_discount: "",
      usage_limit: "",
      expires_at: "",
      is_active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCouponId(coupon.id);
    
    // Parse value based on discount type
    const val = coupon.discount_type === "fixed_amount"
      ? (coupon.discount_value / 100).toString()
      : coupon.discount_value.toString();

    // Format local datetime-local value (YYYY-MM-DDThh:mm)
    let expiryStr = "";
    if (coupon.expires_at) {
      const date = new Date(coupon.expires_at);
      const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 16);
      expiryStr = localISOTime;
    }

    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: val,
      minimum_amount: coupon.minimum_amount ? (coupon.minimum_amount / 100).toString() : "",
      max_discount: coupon.max_discount ? (coupon.max_discount / 100).toString() : "",
      usage_limit: coupon.usage_limit ? coupon.usage_limit.toString() : "",
      expires_at: expiryStr,
      is_active: coupon.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const code = form.code.trim().toUpperCase();
      if (!code) throw new Error("Coupon code is required.");

      // Calculate values based on discount type
      let discountValue = parseFloat(form.discount_value);
      if (isNaN(discountValue) || discountValue <= 0) {
        throw new Error("Please enter a valid discount value.");
      }

      if (form.discount_type === "fixed_amount") {
        discountValue = Math.round(discountValue * 100); // convert to cents
      } else {
        // Percentage validation
        if (discountValue > 100) {
          throw new Error("Percentage discount cannot exceed 100%.");
        }
        discountValue = Math.round(discountValue);
      }

      const minAmount = form.minimum_amount ? Math.round(parseFloat(form.minimum_amount) * 100) : 0;
      const maxDisc = form.max_discount ? Math.round(parseFloat(form.max_discount) * 100) : null;
      const usage = form.usage_limit ? parseInt(form.usage_limit) : null;
      const expires = form.expires_at ? new Date(form.expires_at).toISOString() : null;

      const payload = {
        code,
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: discountValue,
        minimum_amount: minAmount,
        max_discount: maxDisc,
        usage_limit: usage,
        expires_at: expires,
        is_active: form.is_active
      };

      if (editingCouponId) {
        const { error: updateErr } = await supabase
          .from("coupons")
          .update(payload)
          .eq("id", editingCouponId);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("coupons")
          .insert({ ...payload, created_at: new Date().toISOString() });

        if (insertErr) throw insertErr;
      }

      alert("Coupon successfully saved.");
      setShowModal(false);
      await fetchCoupons();

    } catch (err) {
      alert("Failed to save coupon: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      const { error: updateErr } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (updateErr) throw updateErr;
      
      // Update local state directly for responsive feedback
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));

    } catch (err) {
      alert("Failed to toggle coupon status: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this coupon? This action cannot be undone.")) return;
    try {
      const { error: delErr } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;
      await fetchCoupons();
    } catch (err) {
      alert("Failed to delete coupon: " + err.message);
    }
  };

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format((cents || 0) / 100);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Marketing & Coupons
          </h1>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 rounded-none cursor-pointer border-none"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Filter Tab controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        
        {/* Total stats label */}
        <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-bold uppercase tracking-wider">
          <Ticket className="w-4 h-4 text-accent" /> Active Codes: {coupons.filter(c => c.is_active).length} / {coupons.length}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search coupons by code or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        </div>

      </div>

      {/* Grid Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Fetching promo files...</span>
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 text-red-500 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-xs tracking-wider font-semibold uppercase">{error}</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
          No coupon codes registered in the marketing system yet.
        </div>
      ) : (
        <div className="border border-zinc-900 bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px] text-xs tracking-wider">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-bold uppercase">
                <th className="p-4 w-12 text-center">Status</th>
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Discount details</th>
                <th className="p-4">Constraints</th>
                <th className="p-4">Usage Limit</th>
                <th className="p-4">Validity Expires</th>
                <th className="p-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredCoupons.map(coupon => {
                const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                const formattedExpiry = coupon.expires_at 
                  ? new Date(coupon.expires_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "No Expiry";

                return (
                  <tr key={coupon.id} className="hover:bg-zinc-950/20 transition-colors">
                    
                    {/* Toggle Active status */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className="text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                        title={coupon.is_active ? "Deactivate" : "Activate"}
                      >
                        {coupon.is_active ? (
                          <ToggleRight className="w-6 h-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-zinc-700" />
                        )}
                      </button>
                    </td>

                    {/* Code */}
                    <td className="p-4">
                      <span className="font-mono font-black text-white text-[13px] tracking-widest bg-zinc-900 border border-zinc-800 px-3 py-1">
                        {coupon.code}
                      </span>
                      {coupon.description && (
                        <span className="block text-[10px] text-zinc-500 mt-2 font-medium">{coupon.description}</span>
                      )}
                    </td>

                    {/* Discount Value */}
                    <td className="p-4 font-extrabold text-accent">
                      {coupon.discount_type === "percentage" 
                        ? `${coupon.discount_value}% OFF`
                        : `${formatPrice(coupon.discount_value)} OFF`}
                    </td>

                    {/* Constraints */}
                    <td className="p-4 space-y-1 text-zinc-400 font-medium">
                      <div className="flex justify-between max-w-[150px]">
                        <span>Min spend:</span>
                        <span className="font-mono font-bold text-white">
                          {coupon.minimum_amount > 0 ? formatPrice(coupon.minimum_amount) : "₹0"}
                        </span>
                      </div>
                      {coupon.discount_type === "percentage" && coupon.max_discount && (
                        <div className="flex justify-between max-w-[150px]">
                          <span>Max cap:</span>
                          <span className="font-mono font-bold text-white">
                            {formatPrice(coupon.max_discount)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Usage limit */}
                    <td className="p-4 font-bold text-zinc-400 font-mono">
                      {coupon.usage_limit || "Unlimited"}
                    </td>

                    {/* Expiry */}
                    <td className="p-4 font-mono font-semibold">
                      <span className={isExpired ? "text-red-500" : "text-zinc-400"}>
                        {formattedExpiry}
                        {isExpired && <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-none font-bold uppercase tracking-wider ml-2 font-sans">EXPIRED</span>}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleOpenEdit(coupon)}
                          className="text-zinc-500 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-zinc-500 hover:text-accent transition-colors p-1 bg-transparent border-none cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT COUPON FORM MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            
            {/* Close */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 border-none bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-md font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                {editingCouponId ? "Update Coupon Parameters" : "Build Promotion Coupon"}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs tracking-wider">
              
              {/* Coupon Code */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Promo Code *</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono font-bold tracking-widest transition-all"
                  placeholder="e.g. CACAPO15"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Campaign Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                  placeholder="e.g. 15% off first order for new clients"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Discount Model *</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm(prev => ({ ...prev, discount_type: e.target.value, discount_value: "" }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all font-semibold uppercase text-[10px]"
                  >
                    <option value="percentage">Percentage OFF</option>
                    <option value="fixed_amount">Fixed Amount OFF</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {form.discount_type === "percentage" ? "Discount Percentage (%) *" : "Discount Value (₹) *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.discount_value}
                    onChange={(e) => setForm(prev => ({ ...prev, discount_value: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                    placeholder={form.discount_type === "percentage" ? "e.g. 15" : "e.g. 500"}
                  />
                </div>
              </div>

              {/* Minimum Purchase & Max Discount cap */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Min Order Total (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.minimum_amount}
                    onChange={(e) => setForm(prev => ({ ...prev, minimum_amount: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                    placeholder="e.g. 1500 (Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.max_discount}
                    onChange={(e) => setForm(prev => ({ ...prev, max_discount: e.target.value }))}
                    disabled={form.discount_type === "fixed_amount"}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all disabled:bg-zinc-900/40 disabled:text-zinc-600 disabled:border-zinc-900/60"
                    placeholder="e.g. 300 (Optional)"
                  />
                </div>
              </div>

              {/* Usage Limit & Expiration date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Usage limit (qty)</label>
                  <input
                    type="number"
                    value={form.usage_limit}
                    onChange={(e) => setForm(prev => ({ ...prev, usage_limit: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                    placeholder="e.g. 100 (Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-accent" /> Expiration Date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-sans text-xs transition-all"
                  />
                </div>
              </div>

              {/* Active Toggle status checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer text-zinc-400 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="accent-accent w-4 h-4 cursor-pointer"
                  />
                  Mark Coupon Active immediately
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-zinc-900 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all rounded-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all rounded-none flex items-center justify-center gap-1.5 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer border-none"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Coupon"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
