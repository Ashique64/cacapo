"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  AlertCircle 
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

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleDeleteAddress = async (id) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
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
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Failed to sign out:", err);
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
    }).format(cents / 100);
  };

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
                    <span className="text-zinc-500 font-bold block text-[10px] uppercase">Registered Email</span>
                    <span className="text-white font-medium block mt-1">{user.email}</span>
                  </div>
                  {profile && (
                    <>
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Full Name</span>
                        <span className="text-white font-medium block mt-1">{profile.full_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-bold block text-[10px] uppercase">Contact Number</span>
                        <span className="text-white font-medium block mt-1">{profile.phone || "N/A"}</span>
                      </div>
                    </>
                  )}
                </div>
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
                                  order.payment_method === "cod" 
                                    ? "bg-green-500/10 border border-green-500/20 text-green-500"
                                    : "bg-accent/10 border border-accent/20 text-accent"
                                }`}>
                                  {order.payment_method === "cod" ? "ORDER CONFIRMED" : "AWAITING VERIFICATION"}
                                </span>
                              </div>
                              <p className="text-zinc-500 text-[10px]">{dateFormatted}</p>
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
                                      <div className="flex justify-between">
                                        <span>Taxes (GST)</span>
                                        <span>{formatPrice(order.tax)}</span>
                                      </div>
                                      <div className="flex justify-between text-white font-bold border-t border-zinc-900 pt-1.5 mt-1">
                                        <span>Total Paid</span>
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
                                  </div>
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
            </div>

          </div>

        </div>
      </div>
      
      <Footer />
    </SmoothScroll>
  );
}
