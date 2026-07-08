"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  LogOut, 
  Loader2, 
  Trash2, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";

export default function AccountPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Auth Store
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const signOut = useAuthStore((state) => state.signOut);

  // Profile Details
  const [profile, setProfile] = useState(null);

  // Address State
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressDetails, setAddressDetails] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    isDefault: false
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Password Change State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Return & Exchange State
  const [showReturnForm, setShowReturnForm] = useState({});
  const [returnType, setReturnType] = useState({});
  const [returnReason, setReturnReason] = useState({});
  const [exchangeSize, setExchangeSize] = useState({});
  const [selectedReturnItems, setSelectedReturnItems] = useState({});
  const [submittingReturn, setSubmittingReturn] = useState({});
  const [bankName, setBankName] = useState({});
  const [accountHolder, setAccountHolder] = useState({});
  const [accountNumber, setAccountNumber] = useState({});
  const [ifscCode, setIfscCode] = useState({});

  const handleToggleReturnForm = (orderId, items) => {
    setShowReturnForm(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    const initialSelected = {};
    items.forEach(item => {
      initialSelected[item.id] = true;
    });
    setSelectedReturnItems(prev => ({ ...prev, [orderId]: initialSelected }));
    setReturnType(prev => ({ ...prev, [orderId]: "return" }));
    setReturnReason(prev => ({ ...prev, [orderId]: "" }));
    setExchangeSize(prev => ({ ...prev, [orderId]: "" }));
    setBankName(prev => ({ ...prev, [orderId]: "" }));
    setAccountHolder(prev => ({ ...prev, [orderId]: "" }));
    setAccountNumber(prev => ({ ...prev, [orderId]: "" }));
    setIfscCode(prev => ({ ...prev, [orderId]: "" }));
  };

  const handleReturnCheckboxChange = (orderId, itemId) => {
    setSelectedReturnItems(prev => {
      const orderItems = prev[orderId] || {};
      return {
        ...prev,
        [orderId]: {
          ...orderItems,
          [itemId]: !orderItems[itemId]
        }
      };
    });
  };

  const handleSubmitReturn = async (order) => {
    const orderId = order.id;
    const type = returnType[orderId] || "return";
    const reason = returnReason[orderId]?.trim() || "";
    const size = exchangeSize[orderId]?.trim() || "";
    const itemsMap = selectedReturnItems[orderId] || {};
    const selectedItemIds = Object.keys(itemsMap).filter(id => itemsMap[id]);

    if (selectedItemIds.length === 0) {
      setCustomAlert({
        title: "Selection Required",
        message: "Please select at least one item to return/exchange.",
        type: "error"
      });
      return;
    }

    if (!reason) {
      setCustomAlert({
        title: "Reason Required",
        message: "Please provide a reason for the request.",
        type: "error"
      });
      return;
    }

    if (type === "exchange" && !size) {
      setCustomAlert({
        title: "Size Required",
        message: "Please specify the desired size for exchange.",
        type: "error"
      });
      return;
    }

    const holder = accountHolder[orderId]?.trim() || "";
    const bName = bankName[orderId]?.trim() || "";
    const accNum = accountNumber[orderId]?.trim() || "";
    const ifsc = ifscCode[orderId]?.trim() || "";

    if (type === "return") {
      if (!holder || !bName || !accNum || !ifsc) {
        setCustomAlert({
          title: "Bank Details Required",
          message: "Please fill in all bank details to receive your refund.",
          type: "error"
        });
        return;
      }
    }

    setSubmittingReturn(prev => ({ ...prev, [orderId]: true }));

    try {
      const selectedItemsDetails = order.order_items
        .filter(item => itemsMap[item.id])
        .map(item => ({
          order_item_id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          name: item.product?.name,
          size: item.variant?.size,
          color: item.variant?.color
        }));

      const returnRequest = {
        type,
        status: "pending",
        reason,
        exchange_size: type === "exchange" ? size : null,
        bank_details: type === "return" ? {
          account_holder: holder,
          bank_name: bName,
          account_number: accNum,
          ifsc_code: ifsc
        } : null,
        items: selectedItemsDetails,
        created_at: new Date().toISOString()
      };

      const updatedShippingAddress = {
        ...order.shipping_address,
        return_request: returnRequest
      };

      // Try using secure RPC function to bypass RLS UPDATE restrictions on delivered orders
      const { error: rpcError } = await supabase.rpc("submit_return_request", {
        order_id: orderId,
        return_req: returnRequest
      });

      if (rpcError) {
        console.warn("RPC failed, falling back to direct table update:", rpcError.message);
        
        // Fallback: direct table update (requires custom RLS policies to be configured)
        const { data, error: updateError } = await supabase
          .from("orders")
          .update({
            shipping_address: updatedShippingAddress
          })
          .eq("id", orderId)
          .select();

        if (updateError) throw updateError;
        
        if (!data || data.length === 0) {
          throw new Error("Unable to save return request. Please execute the SQL script in your Supabase SQL Editor to enable return request submissions.");
        }
      }

      setCustomAlert({
        title: "Request Submitted",
        message: `Your ${type} request has been submitted successfully.`,
        type: "success"
      });
      setShowReturnForm(prev => ({ ...prev, [orderId]: false }));
      await fetchOrders();
    } catch (err) {
      console.error("Failed to submit return request:", err);
      setCustomAlert({
        title: "Error",
        message: "Error submitting return request: " + err.message,
        type: "error"
      });
    } finally {
      setSubmittingReturn(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const [gstNumber, setGstNumber] = useState("");
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [customAlert, setCustomAlert] = useState(null); // { title, message, type }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch GST number from settings
  useEffect(() => {
    if (mounted) {
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
          console.error("Failed to load GST number for account invoice:", err);
        }
      };
      fetchGst();
    }
  }, [mounted]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [mounted, authLoading, user, router]);

  // Fetch data when authenticated
  useEffect(() => {
    if (mounted && user) {
      fetchProfileData();
      fetchAddresses();
      fetchOrders();
    }
  }, [mounted, user]);

  const fetchProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.warn("Could not retrieve profiles from Supabase:", err);
    }
  };

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (err) {
      console.warn("Could not load addresses:", err);
    } finally {
      setAddressesLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      // Query orders and order items, with product details joined
      const { data, error } = await supabase
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.warn("Could not fetch orders from Supabase:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressDetails(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (addressErrors[name]) {
      setAddressErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateAddressForm = () => {
    const errors = {};
    if (!addressDetails.fullName.trim()) errors.fullName = "Full name is required";
    if (!addressDetails.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[0-9\s-]{10,14}$/.test(addressDetails.phone.trim())) {
      errors.phone = "Enter a valid phone number";
    }
    if (!addressDetails.addressLine1.trim()) errors.addressLine1 = "Address is required";
    if (!addressDetails.city.trim()) errors.city = "City is required";
    if (!addressDetails.state.trim()) errors.state = "State is required";
    if (!addressDetails.pincode.trim()) {
      errors.pincode = "ZIP/Pincode is required";
    } else if (!/^[0-9]{6}$/.test(addressDetails.pincode.trim())) {
      errors.pincode = "Enter a valid 6-digit pincode";
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    setAddressSubmitting(true);
    try {
      // If setting default, update other addresses
      if (addressDetails.isDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { error } = await supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          full_name: addressDetails.fullName,
          phone: addressDetails.phone,
          address_line1: addressDetails.addressLine1,
          address_line2: addressDetails.addressLine2 || null,
          city: addressDetails.city,
          state: addressDetails.state,
          country: addressDetails.country,
          pincode: addressDetails.pincode,
          is_default: addressDetails.isDefault
        });

      if (error) throw error;
      
      // Reset state
      setAddressDetails({
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        isDefault: false
      });
      setShowAddressForm(false);
      fetchAddresses();
    } catch (err) {
      console.error("Failed to add address:", err);
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = (id) => {
    setConfirmModal({
      title: "Delete Address",
      message: "Are you sure you want to delete this address?",
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const { error } = await supabase
            .from("addresses")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

          if (error) throw error;
          fetchAddresses();
        } catch (err) {
          console.error("Failed to delete address:", err);
        }
      }
    });
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }, [signOut, router]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setPasswordError("Both fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const toggleOrderExpand = useCallback((id) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  }, []);

  const formatPrice = useCallback((cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(cents / 100);
  }, []);

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <SmoothScroll>
      <Navbar />

      <style>{`
        .custom-input {
          background-color: #0c0c0e;
          border: 1px solid #27272a;
          color: white;
          padding: 0.75rem 1rem;
          width: 100%;
          outline: none;
          transition: all 0.3s ease;
          border-radius: 0px;
        }
        .custom-input:focus {
          border-color: #FF4D4D;
          box-shadow: 0 0 8px rgba(255, 77, 77, 0.15);
        }
      `}</style>

      <div className="min-h-screen bg-black text-white py-24 md:py-32 font-sans select-none">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-zinc-900 pb-8 gap-6 mb-12">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                CACAPO Client Desk
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest uppercase text-white mt-2">
                My Account
              </h1>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 border border-zinc-800 hover:border-accent hover:text-accent bg-transparent text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 rounded-none self-start md:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Personal info & addresses */}
            <div className="lg:col-span-5 space-y-12">
              
              {/* Profile Details Box */}
              <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-6">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" /> Profile Information
                </h3>
                
                <div className="space-y-4 text-xs tracking-wider">
                  <div>
                    <span className="text-zinc-500 font-bold block text-[10px] uppercase">Full Name</span>
                    <span className="text-white font-medium block mt-1">
                      {user.user_metadata?.full_name || profile?.full_name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold block text-[10px] uppercase">Registered Email</span>
                    <span className="text-white font-medium block mt-1">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-bold block text-[10px] uppercase">Phone Number</span>
                    <span className="text-white font-medium block mt-1">
                      {user.user_metadata?.phone || profile?.phone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Change Password Box */}
              <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-accent" /> Password & Security
                  </h3>
                  {!showPasswordForm && (
                    <button
                      onClick={() => { setShowPasswordForm(true); setPasswordError(null); setPasswordSuccess(false); }}
                      className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors"
                    >
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordForm ? (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">New Password *</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="custom-input text-xs tracking-wide py-2 px-3 pr-10"
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Confirm New Password *</label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="custom-input text-xs tracking-wide py-2 px-3 pr-10"
                          placeholder="Re-enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {passwordError && (
                      <p className="text-accent text-[10px] tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {passwordError}
                      </p>
                    )}

                    {passwordSuccess && (
                      <p className="text-green-500 text-[10px] tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" /> Password updated successfully!
                      </p>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setShowPasswordForm(false); setNewPassword(""); setConfirmNewPassword(""); setPasswordError(null); }}
                        className="w-1/2 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all duration-300 rounded-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordSubmitting}
                        className="w-1/2 py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-none flex items-center justify-center gap-1.5"
                      >
                        {passwordSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Update"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-zinc-500 tracking-wider">Change your account password to keep your account secure.</p>
                )}
              </div>

              {/* Addresses Box */}
              <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" /> Shipping Addresses
                  </h3>
                  {!showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> ADD NEW
                    </button>
                  )}
                </div>

                {showAddressForm ? (
                  <form onSubmit={handleAddAddress} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Full Name *</label>
                        <input
                          type="text"
                          name="fullName"
                          value={addressDetails.fullName}
                          onChange={handleInputChange}
                          className="custom-input text-xs tracking-wide py-2 px-3"
                          placeholder="Full Name"
                        />
                        {addressErrors.fullName && <p className="text-accent text-[10px]">{addressErrors.fullName}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Phone *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={addressDetails.phone}
                          onChange={handleInputChange}
                          className="custom-input text-xs tracking-wide py-2 px-3"
                          placeholder="Contact number"
                        />
                        {addressErrors.phone && <p className="text-accent text-[10px]">{addressErrors.phone}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Address Line 1 *</label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={addressDetails.addressLine1}
                        onChange={handleInputChange}
                        className="custom-input text-xs tracking-wide py-2 px-3"
                        placeholder="House / Flat / Street"
                      />
                      {addressErrors.addressLine1 && <p className="text-accent text-[10px]">{addressErrors.addressLine1}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Address Line 2</label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={addressDetails.addressLine2}
                        onChange={handleInputChange}
                        className="custom-input text-xs tracking-wide py-2 px-3"
                        placeholder="Apartment / Suite / Area"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">City *</label>
                        <input
                          type="text"
                          name="city"
                          value={addressDetails.city}
                          onChange={handleInputChange}
                          className="custom-input text-xs tracking-wide py-2 px-3"
                          placeholder="City"
                        />
                        {addressErrors.city && <p className="text-accent text-[10px]">{addressErrors.city}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">State *</label>
                        <input
                          type="text"
                          name="state"
                          value={addressDetails.state}
                          onChange={handleInputChange}
                          className="custom-input text-xs tracking-wide py-2 px-3"
                          placeholder="State"
                        />
                        {addressErrors.state && <p className="text-accent text-[10px]">{addressErrors.state}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">ZIP *</label>
                        <input
                          type="text"
                          name="pincode"
                          value={addressDetails.pincode}
                          onChange={handleInputChange}
                          className="custom-input text-xs tracking-wide py-2 px-3"
                          placeholder="Pincode"
                        />
                        {addressErrors.pincode && <p className="text-accent text-[10px]">{addressErrors.pincode}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-3 text-xs tracking-wider cursor-pointer text-zinc-400 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          name="isDefault"
                          checked={addressDetails.isDefault}
                          onChange={handleInputChange}
                          className="accent-accent w-4 h-4 cursor-pointer"
                        />
                        Set as default address
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="w-1/2 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all duration-300 rounded-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addressSubmitting}
                        className="w-1/2 py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-none flex items-center justify-center gap-1.5"
                      >
                        {addressSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {addressesLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : addresses.length === 0 ? (
                      <p className="text-xs text-zinc-500 tracking-wider">No shipping addresses saved yet.</p>
                    ) : (
                      <div className="divide-y divide-zinc-900">
                        {addresses.map((addr) => (
                          <div key={addr.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-start gap-4">
                            <div className="space-y-1 tracking-wider text-xs">
                              <p className="font-bold text-white uppercase flex items-center gap-2">
                                {addr.full_name}
                                {addr.is_default && (
                                  <span className="text-[8px] bg-accent/10 border border-accent/20 text-accent font-bold tracking-widest px-2 py-0.5 rounded-none font-mono">
                                    DEFAULT
                                  </span>
                                )}
                              </p>
                              <p className="text-zinc-400">
                                {addr.address_line1}
                                {addr.address_line2 && `, ${addr.address_line2}`}
                                <br />
                                {addr.city}, {addr.state} - {addr.pincode}
                              </p>
                              <p className="text-zinc-500 font-bold text-[10px]">Phone: {addr.phone}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-zinc-500 hover:text-accent transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Order History */}
            <div className="lg:col-span-7 space-y-6">
              <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-6">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-accent" /> Order History
                </h3>

                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <p className="text-zinc-500 text-xs tracking-wider">You haven't placed any orders yet.</p>
                    <Link 
                      href="/shop" 
                      className="inline-block px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-none"
                    >
                      Shop Catalog
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      const dateFormatted = new Date(order.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      });

                      const orderDate = new Date(order.created_at);
                      // Expected delivery window: 4–7 days after order placement
                      const expectedFrom = new Date(orderDate.getTime() + 4 * 24 * 60 * 60 * 1000);
                      const expectedTo = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                      const expectedFromFormatted = expectedFrom.toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric"
                      });
                      const expectedToFormatted = expectedTo.toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      });

                      return (
                        <div key={order.id} className="border border-zinc-900 bg-black overflow-hidden transition-all duration-300">
                          
                          {/* Order Header Summary Row */}
                          <div 
                            onClick={() => toggleOrderExpand(order.id)}
                            className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-zinc-950/40 transition-colors"
                          >
                            <div className="space-y-1.5 tracking-wider text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold text-white text-[13px]">{order.order_number}</span>
                                 <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                                  order.shipping_address?.return_request
                                    ? order.shipping_address.return_request.status === "approved"
                                      ? order.shipping_address.return_request.type === "exchange"
                                        ? "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                                        : "bg-red-500/10 border border-red-500/20 text-red-500"
                                      : order.shipping_address.return_request.status === "rejected"
                                      ? "bg-zinc-800 border border-zinc-700/50 text-zinc-500"
                                      : order.shipping_address.return_request.status === "received"
                                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
                                      : order.shipping_address.return_request.status === "pickup_confirmed"
                                      ? "bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse"
                                      : order.shipping_address.return_request.type === "exchange"
                                      ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                                    : order.order_status === "delivered"
                                    ? "bg-green-500/10 border border-green-500/20 text-green-500"
                                    : order.order_status === "shipped"
                                    ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                                    : order.order_status === "processing"
                                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                    : order.order_status === "cancelled"
                                    ? "bg-red-500/10 border border-red-500/20 text-red-500"
                                    : order.payment_method === "cod"
                                    ? "bg-green-500/10 border border-green-500/20 text-green-500"
                                    : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                }`}>
                                  {order.shipping_address?.return_request
                                    ? order.shipping_address.return_request.status === "approved"
                                      ? order.shipping_address.return_request.type === "exchange"
                                        ? "EXCHANGED"
                                        : "RETURNED"
                                      : order.shipping_address.return_request.status === "rejected"
                                      ? order.shipping_address.return_request.type === "exchange"
                                        ? "EXCHANGE DECLINED"
                                        : "RETURN DECLINED"
                                      : order.shipping_address.return_request.status === "received"
                                      ? "ITEMS RECEIVED"
                                      : order.shipping_address.return_request.status === "pickup_confirmed"
                                      ? "PICKUP SCHEDULED"
                                      : order.shipping_address.return_request.type === "exchange"
                                      ? "EXCHANGE REQUESTED"
                                      : "RETURN REQUESTED"
                                    : order.order_status === "delivered"
                                    ? "DELIVERED"
                                    : order.order_status === "shipped"
                                    ? "SHIPPED"
                                    : order.order_status === "processing"
                                    ? "PROCESSING"
                                    : order.order_status === "cancelled"
                                    ? "CANCELLED"
                                    : order.payment_method === "cod"
                                    ? "ORDER CONFIRMED"
                                    : "AWAITING VERIFICATION"}
                                </span>
                              </div>
                              <p className="text-zinc-500 text-[10px]">
                                {dateFormatted}
                                {order.order_status !== "delivered" && order.order_status !== "cancelled" && (
                                  <span className="text-zinc-400 ml-3 font-semibold">
                                    • Expected {expectedFromFormatted} – {expectedToFormatted}
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                              <div className="text-right tracking-wider text-xs">
                                <span className="text-zinc-500 font-bold block text-[9px] uppercase">Transaction Value</span>
                                <span className="text-white font-extrabold text-[13px]">{formatPrice(order.total_amount)}</span>
                              </div>
                              <div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Order Detail Block */}
                          {isExpanded && (
                            <div className="border-t border-zinc-900 p-5 bg-zinc-950/20 space-y-6 animate-fadeIn duration-300">
                              
                              {/* Order Items listing */}
                              <div className="space-y-3 divide-y divide-zinc-900">
                                {order.order_items?.map((item, idx) => {
                                  const prodName = item.product?.name || "Product Archive Piece";
                                  const prodImg = item.product?.product_images?.[0]?.image_url || "/Images/clothing.jpg";
                                  
                                  return (
                                    <div key={item.id || idx} className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center text-xs tracking-wider">
                                      <div className="w-12 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                                        <img
                                          src={prodImg}
                                          alt={prodName}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white uppercase truncate text-[11px]">{prodName}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
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

                              {/* Delivery & Billing break */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-900 text-xs leading-relaxed tracking-wider">
                                <div>
                                  <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest mb-1.5">Shipping Address</h4>
                                  <p className="text-white font-bold uppercase text-[10px]">
                                    {order.shipping_address?.full_name}
                                  </p>
                                  <p className="text-zinc-400 text-[11px] mt-0.5">
                                    {order.shipping_address?.address_line1}
                                    {order.shipping_address?.address_line2 && `, ${order.shipping_address?.address_line2}`}
                                    <br />
                                    {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}
                                  </p>
                                  <p className="text-zinc-500 text-[10px] font-bold mt-1">Phone: {order.shipping_address?.phone}</p>

                                  {(order.order_status === "shipped" || order.order_status === "delivered") && order.shipping_carrier && (
                                    <div className="mt-4 p-3 bg-zinc-950 border border-zinc-900 space-y-1">
                                      <h5 className="text-accent text-[8px] font-bold uppercase tracking-widest">Shipment Details</h5>
                                      <p className="text-white text-[10px] font-bold uppercase">
                                        Carrier: {order.shipping_carrier}
                                      </p>
                                      <p className="text-zinc-400 text-[10px] font-mono">
                                        Tracking Reference: {order.tracking_number}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest mb-1">Billing Breakdown</h4>
                                    <div className="space-y-1 text-zinc-400 text-[11px]">
                                      <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(order.subtotal)}</span>
                                      </div>
                                      {order.discount > 0 && (
                                        <div className="flex justify-between text-green-500">
                                          <span>Discount</span>
                                          <span>-{formatPrice(order.discount)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between">
                                        <span>Shipping</span>
                                        <span>{order.shipping_charge === 0 ? "FREE" : formatPrice(order.shipping_charge)}</span>
                                      </div>
                                      <div className="flex justify-between text-white font-bold border-t border-zinc-900 pt-1.5 mt-1 items-start">
                                        <div className="flex flex-col">
                                          <span>Total Paid</span>
                                          <span className="text-[9px] text-zinc-500 tracking-wider font-normal mt-0.5">
                                            (Inclusive of 18% GST)
                                          </span>
                                        </div>
                                        <span>{formatPrice(order.total_amount)}</span>
                                      </div>
                                    </div>
                                  </div>
                                                                    <div>
                                    <h4 className="text-zinc-500 font-bold text-[9px] uppercase tracking-widest mb-1">Transaction Details</h4>
                                    <p className="text-[11px] text-white font-medium uppercase">
                                      Method: {order.payment_method === "upi" ? "UPI Instant" : "Cash on Delivery"}
                                    </p>
                                    {order.payment_method === "upi" && order.order_items?.[0] && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                                        <p className="text-[9px] text-accent tracking-widest font-bold font-mono">
                                          UTR/Ref Verification Pending
                                        </p>
                                      </div>
                                    )}
                                    {gstNumber && (
                                      <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-2 uppercase">
                                        GSTIN: {gstNumber}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Returns & Exchanges Management Section */}
                              <div className="pt-6 border-t border-zinc-900 space-y-4">
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4 text-accent" />
                                  <h4 className="text-zinc-300 font-bold text-xs uppercase tracking-widest">
                                    Returns & Exchanges Desk
                                  </h4>
                                </div>

                                {order.shipping_address?.return_request ? (
                                  // Request Submitted: Display current request status
                                  <div className="p-4 bg-zinc-950/40 border border-zinc-900/80 rounded-none space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                          Request Submitted
                                        </p>
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                            {order.shipping_address.return_request.type === "exchange"
                                              ? `Size Exchange (Desired Size: ${order.shipping_address.return_request.exchange_size})`
                                              : "Product Return (Refund)"}
                                          </span>
                                          <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                                            order.shipping_address.return_request.status === "approved"
                                              ? "bg-green-500/10 border border-green-500/20 text-green-500"
                                              : order.shipping_address.return_request.status === "rejected"
                                              ? "bg-red-500/10 border border-red-500/20 text-red-500"
                                              : order.shipping_address.return_request.status === "received"
                                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                              : order.shipping_address.return_request.status === "pickup_confirmed"
                                              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                              : "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
                                          }`}>
                                            {order.shipping_address.return_request.status === "received"
                                              ? "ITEMS RECEIVED"
                                              : order.shipping_address.return_request.status === "pickup_confirmed"
                                              ? "PICKUP SCHEDULED"
                                              : order.shipping_address.return_request.status?.toUpperCase() || "PENDING REVIEW"}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <span className="text-[10px] text-zinc-500 font-mono">
                                        {new Date(order.shipping_address.return_request.created_at).toLocaleDateString("en-IN", {
                                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                        })}
                                      </span>
                                    </div>

                                    {order.shipping_address.return_request.status === "pickup_confirmed" && order.shipping_address.return_request.expected_pickup_date && (
                                      <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-none text-xs flex flex-col gap-1 tracking-wider">
                                        <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest">
                                          Expected Pickup Date
                                        </span>
                                        <span className="text-accent font-extrabold text-[11px] uppercase">
                                          {new Date(order.shipping_address.return_request.expected_pickup_date).toLocaleDateString("en-IN", {
                                            weekday: "long", day: "numeric", month: "long"
                                          })}
                                        </span>
                                      </div>
                                    )}

                                    {order.shipping_address.return_request.type === "return" && (order.shipping_address.return_request.status === "received" || order.shipping_address.return_request.status === "approved") && !order.shipping_address.return_request.refund_transfer_details && (
                                      <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-none text-xs flex flex-col gap-1 tracking-wider">
                                        <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest">
                                          Estimated Refund Processing
                                        </span>
                                        <span className="text-green-500 font-extrabold text-[11px] uppercase">
                                          {order.shipping_address.return_request.status === "approved"
                                            ? "Refund Approved. Credited in 1–2 business days"
                                            : "Items Received. Refund processed within 3–5 business days"}
                                        </span>
                                      </div>
                                    )}

                                    {order.shipping_address.return_request.refund_transfer_details && (
                                      <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-none text-xs flex flex-col gap-1.5 tracking-wider">
                                        <span className="text-green-500 font-bold uppercase text-[9px] tracking-widest">
                                          Refund Disbursed Successfully
                                        </span>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">
                                          Txn Reference: <span className="text-white font-mono normal-case">{order.shipping_address.return_request.refund_transfer_details.transaction_id}</span>
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">
                                          Amount Credited: <span className="text-white">{formatPrice(order.shipping_address.return_request.refund_transfer_details.amount)}</span>
                                        </p>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase">
                                          Disbursed Date: <span className="text-white">{new Date(order.shipping_address.return_request.refund_transfer_details.transferred_at).toLocaleDateString("en-IN")}</span>
                                        </p>
                                      </div>
                                    )}

                                    <div className="text-[11px] text-zinc-400 tracking-wide leading-relaxed pt-2 border-t border-zinc-900/60">
                                      <span className="font-bold text-zinc-500 uppercase block text-[9px] mb-1">Reason for request:</span>
                                      "{order.shipping_address.return_request.reason}"
                                    </div>

                                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                      <span className="text-zinc-500 font-bold block text-[9px] mb-1">Items Requested:</span>
                                      <ul className="list-disc pl-4 space-y-1">
                                        {order.shipping_address.return_request.items?.map((item, idx) => (
                                          <li key={idx} className="text-zinc-400">
                                            {item.name} {item.size && `(${item.size} / ${item.color || "Default"})`} x {item.quantity}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                ) : order.order_status === "delivered" ? (
                                  // Request Eligible: Allow submitting new request
                                  <div className="space-y-4">
                                    {!showReturnForm[order.id] ? (
                                      <button
                                        onClick={() => handleToggleReturnForm(order.id, order.order_items || [])}
                                        className="px-5 py-2.5 border border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-white hover:text-black hover:border-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer"
                                      >
                                        Request Return / Exchange
                                      </button>
                                    ) : (
                                      <div className="p-5 bg-zinc-950/40 border border-zinc-900 space-y-5 rounded-none max-w-xl">
                                        <h5 className="text-[10px] font-bold text-white uppercase tracking-widest">
                                          Submit Request Details
                                        </h5>

                                        {/* Item Selectors (Checkboxes) */}
                                        <div className="space-y-2.5">
                                          <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                            Select Items to Return/Exchange *
                                          </label>
                                          <div className="space-y-2 border-l-2 border-zinc-800 pl-3">
                                            {order.order_items?.map((item) => (
                                              <label key={item.id} className="flex items-center gap-3 text-[11px] text-zinc-300 cursor-pointer hover:text-white transition-colors">
                                                <input
                                                  type="checkbox"
                                                  checked={!!selectedReturnItems[order.id]?.[item.id]}
                                                  onChange={() => handleReturnCheckboxChange(order.id, item.id)}
                                                  className="accent-accent w-4 h-4 cursor-pointer"
                                                />
                                                <span>
                                                  {item.product?.name} {item.variant?.size && `(${item.variant.size})`} x {item.quantity}
                                                </span>
                                              </label>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Type Selector */}
                                          <div className="space-y-1">
                                            <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                              Request Type *
                                            </label>
                                            <select
                                              value={returnType[order.id] || "return"}
                                              onChange={(e) => setReturnType(prev => ({ ...prev, [order.id]: e.target.value }))}
                                              className="custom-input text-xs tracking-wide py-2 px-3 appearance-none rounded-none focus:border-accent"
                                            >
                                              <option value="return">Return for Refund</option>
                                              <option value="exchange">Size Exchange</option>
                                            </select>
                                          </div>

                                          {/* Exchange Size Selector (Visible only for exchange) */}
                                          {(returnType[order.id] || "return") === "exchange" && (
                                            <div className="space-y-1">
                                              <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                                Desired Size *
                                              </label>
                                              <input
                                                type="text"
                                                value={exchangeSize[order.id] || ""}
                                                onChange={(e) => setExchangeSize(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                className="custom-input text-xs tracking-wide py-2 px-3"
                                                placeholder="e.g. 40, M, L"
                                              />
                                            </div>
                                          )}
                                        </div>

                                        {/* Bank Details Inputs for Refund */}
                                        {(returnType[order.id] || "return") === "return" && (
                                          <div className="space-y-3 pt-2 border-t border-zinc-900">
                                            <span className="block text-[9px] font-bold uppercase tracking-widest text-accent">
                                              Bank Account Details (For Refund Cash) *
                                            </span>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                              <div className="space-y-1">
                                                <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-550">Account Holder Name *</label>
                                                <input
                                                  type="text"
                                                  value={accountHolder[order.id] || ""}
                                                  onChange={(e) => setAccountHolder(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                  className="custom-input text-xs tracking-wide py-1.5 px-3"
                                                  placeholder="e.g. Muhammed Ashik"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-550">Bank Name *</label>
                                                <input
                                                  type="text"
                                                  value={bankName[order.id] || ""}
                                                  onChange={(e) => setBankName(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                  className="custom-input text-xs tracking-wide py-1.5 px-3"
                                                  placeholder="e.g. State Bank of India"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-550">Account Number *</label>
                                                <input
                                                  type="text"
                                                  value={accountNumber[order.id] || ""}
                                                  onChange={(e) => setAccountNumber(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                  className="custom-input text-xs tracking-wide py-1.5 px-3"
                                                  placeholder="Account Number"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-550">IFSC Code *</label>
                                                <input
                                                  type="text"
                                                  value={ifscCode[order.id] || ""}
                                                  onChange={(e) => setIfscCode(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                  className="custom-input text-xs tracking-wide py-1.5 px-3"
                                                  placeholder="IFSC Code"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Reason Input */}
                                        <div className="space-y-1">
                                          <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                            Reason for Return / Exchange *
                                          </label>
                                          <textarea
                                            value={returnReason[order.id] || ""}
                                            onChange={(e) => setReturnReason(prev => ({ ...prev, [order.id]: e.target.value }))}
                                            className="custom-input text-xs tracking-wide py-2 px-3 h-20 resize-none rounded-none focus:border-accent"
                                            placeholder="Please describe why you are requesting a return or exchange..."
                                          />
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex gap-3 pt-2">
                                          <button
                                            type="button"
                                            onClick={() => setShowReturnForm(prev => ({ ...prev, [order.id]: false }))}
                                            className="w-1/2 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all rounded-none bg-transparent cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSubmitReturn(order)}
                                            disabled={submittingReturn[order.id]}
                                            className="w-1/2 py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all rounded-none flex items-center justify-center gap-1.5 cursor-pointer border-none"
                                          >
                                            {submittingReturn[order.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Submit Request"}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Not Eligible: Show placeholder note
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Return window opens only upon successful delivery.
                                  </p>
                                )}
                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
      
      {/* Custom Alert Modal Overlay */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-99999 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm p-6 space-y-6 shadow-2xl relative animate-fadeIn duration-300">
            <div className="space-y-2">
              <h3 className={`text-sm font-bold uppercase tracking-widest ${
                customAlert.type === "error" ? "text-accent" : "text-white"
              }`}>
                {customAlert.title || "Message"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed tracking-wider font-sans">
                {customAlert.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCustomAlert(null)}
                className="w-full py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all rounded-none cursor-pointer border-none"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </SmoothScroll>
  );
}
