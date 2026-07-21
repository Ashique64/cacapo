"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building,
  CreditCard,
  Mail,
  Phone,
  Store,
  Upload,
  Trash2,
  Shield
} from "lucide-react";

export default function AdminSettingsDesk() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Form State with hardcoded fallbacks
  const [form, setForm] = useState({
    store_name: "CACAPO",
    gst_number: "",
    upi_id: "pay@cacapo",
    upi_qr_url: "",
    support_email: "care@cacapo.com",
    support_phone: "+91 98765 43210"
  });

  useEffect(() => {
    checkRoleAndFetch();
  }, []);

  const checkRoleAndFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const { data: adminData, error: adminErr } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (adminErr || !adminData || adminData.role !== "super_admin") {
        setCurrentUserRole(adminData?.role || "unauthorized");
        setLoading(false);
        return;
      }

      setCurrentUserRole("super_admin");
      await fetchSettings();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during role validation.");
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("store_settings")
        .select("*");

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        const settingsMap = {};
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
        });
        setForm((prev) => ({
          ...prev,
          ...settingsMap
        }));
      }
    } catch (err) {
      console.error("Failed to load store settings:", err);
      // We don't block the UI since we have standard local fallbacks
      setError("Note: Using default local configuration. Run the database migration script to enable settings editing.");
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `settings-qr-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from("categories")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("categories")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        upi_qr_url: publicUrl
      }));
    } catch (err) {
      console.error("QR Code upload failed:", err);
      setError("QR Code upload failed: " + (err.message || "Ensure the 'categories' storage bucket is created and set to public in Supabase."));
    } finally {
      setUploadingQr(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const updates = Object.keys(form).map((key) => ({
        key,
        value: form[key],
        updated_at: new Date().toISOString()
      }));

      const { error: dbError } = await supabase
        .from("store_settings")
        .upsert(updates, { onConflict: "key" });

      if (dbError) throw dbError;
      setSuccess(true);
    } catch (err) {
      console.error("Failed to save store settings:", err);
      setError(err.message || "Failed to update configuration settings in Supabase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    currentUserRole && currentUserRole !== "super_admin" ? (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 select-none font-sans px-4 text-white">
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-none text-red-500 animate-pulse">
          <Shield className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">
            Access Restricted
          </h1>
          <p className="text-zinc-500 text-xs tracking-wider max-w-md mx-auto leading-relaxed">
            The Store Settings Desk is reserved for system owners. You require <strong className="text-red-400 font-mono">super_admin</strong> authorization to access these records.
          </p>
        </div>
        <button
          onClick={() => window.location.href = "/admin/orders"}
          className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300"
        >
          Return to Orders Desk
        </button>
      </div>
    ) : (
      <div className="space-y-8 select-none font-sans text-white animate-fadeIn duration-300">
      
      {/* Header Desk */}
      <div className="flex justify-between items-end pb-6 border-b border-zinc-900">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            System Configuration
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1">
            Store Settings
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
            Retrieving settings...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          
          {error && (
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-400 text-xs tracking-wider flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 px-4 py-3 text-green-400 text-xs tracking-wider flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Configuration successfully saved to database. All store calculations and displays updated.</span>
            </div>
          )}

          {/* Settings Grid Panel */}
          <div className="bg-zinc-950/45 border border-zinc-900/80 backdrop-blur-md p-6 md:p-8 space-y-8">
            
            {/* Store Identification Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                <Store className="w-4 h-4 text-accent" /> Store Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Store Brand Name
                  </label>
                  <input
                    type="text"
                    name="store_name"
                    value={form.store_name}
                    onChange={handleChange}
                    required
                    className="w-full bg-black border border-zinc-800 text-xs px-4 py-3 hover:border-zinc-700 focus:border-accent outline-none text-white tracking-wider font-semibold transition-all rounded-none"
                    placeholder="e.g. CACAPO"
                  />
                </div>
              </div>
            </div>

            {/* Tax Details Section */}
            <div className="space-y-4 border-t border-zinc-900/60 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                <Building className="w-4 h-4 text-accent" /> Tax Compliance (GST)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    GSTIN / Business GST Number
                  </label>
                  <input
                    type="text"
                    name="gst_number"
                    value={form.gst_number}
                    onChange={handleChange}
                    className="w-full bg-black border border-zinc-800 text-xs px-4 py-3 hover:border-zinc-700 focus:border-accent outline-none text-white tracking-wider font-semibold transition-all rounded-none"
                    placeholder="Enter GSTIN (e.g. 32ABCDE1234F1Z1)"
                  />
                  <p className="text-[10px] text-zinc-500 leading-normal font-medium tracking-wide">
                    Leave blank if your business is not registered for GST. If set, this number will be displayed on client invoices and receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Support Details Section */}
            <div className="space-y-4 border-t border-zinc-900/60 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent" /> Customer Support Contacts
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Support Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-3.5 h-3.5 text-zinc-600 absolute left-4" />
                    <input
                      type="text"
                      name="support_phone"
                      value={form.support_phone}
                      onChange={handleChange}
                      required
                      className="w-full bg-black border border-zinc-800 text-xs pl-11 pr-4 py-3 hover:border-zinc-700 focus:border-accent outline-none text-white tracking-wider font-semibold transition-all rounded-none"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Support Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-3.5 h-3.5 text-zinc-600 absolute left-4" />
                    <input
                      type="email"
                      name="support_email"
                      value={form.support_email}
                      onChange={handleChange}
                      required
                      className="w-full bg-black border border-zinc-800 text-xs pl-11 pr-4 py-3 hover:border-zinc-700 focus:border-accent outline-none text-white tracking-wider font-semibold transition-all rounded-none"
                      placeholder="e.g. care@cacapo.com"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-accent border border-accent text-white hover:bg-transparent hover:text-accent text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer group shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white group-hover:text-accent transition-colors" /> Saving Changes
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white group-hover:text-accent transition-colors" /> Save Configuration
                </>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
    )
  );
}
