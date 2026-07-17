"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShoppingBag, 
  Info, 
  Lock, 
  ChevronRight, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";

const FALLBACK_COUPONS = {
  WELCOME10: { code: "WELCOME10", discount_type: "percentage", discount_value: 10, minimum_amount: 0 },
  CACAPO20: { code: "CACAPO20", discount_type: "percentage", discount_value: 20, minimum_amount: 500000 }, // min ₹5,000 (in cents)
  COUTURE15: { code: "COUTURE15", discount_type: "percentage", discount_value: 15, minimum_amount: 250000 }  // min ₹2,500 (in cents)
};



export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0); // 0: SHIPPING, 1: PAYMENT, 2: CONFIRMED
  const [policyAccepted, setPolicyAccepted] = useState(false);
  
  // Zustand State
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push("/login?redirect=/checkout");
    }
  }, [mounted, authLoading, user, router]);
  
  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressesLoading, setAddressesLoading] = useState(false);
  
  // Shipping Form State
  const [shippingDetails, setShippingDetails] = useState({
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
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("razorpay"); // razorpay or cod
  const [utrCode, setUtrCode] = useState("");
  const [utrError, setUtrError] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Checkout Processing
  const [orderLoading, setOrderLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  // Store Settings state
  const [storeSettings, setStoreSettings] = useState({
    upi_id: "pay@cacapoclothing",
    gst_number: "",
    upi_qr_url: "",
    support_phone: "+91 98765 43210"
  });

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);

    // Dynamically load Razorpay checkout script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      clearTimeout(timer);
      document.body.removeChild(script);
    };
  }, []);

  // Fetch settings dynamically from database
  useEffect(() => {
    if (mounted) {
      const fetchStoreSettings = async () => {
        try {
          const { data, error } = await supabase
            .from("store_settings")
            .select("*");
          if (error) throw error;
          if (data) {
            const settingsMap = {};
            data.forEach((item) => {
              settingsMap[item.key] = item.value;
            });
            setStoreSettings((prev) => ({
              ...prev,
              ...settingsMap
            }));
          }
        } catch (err) {
          console.error("Failed to fetch store settings in checkout:", err);
        }
      };
      fetchStoreSettings();
    }
  }, [mounted]);

  function populateFormFromAddress(addr) {
    setShippingDetails({
      fullName: addr.full_name || "",
      phone: addr.phone || "",
      addressLine1: addr.address_line1 || "",
      addressLine2: addr.address_line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      country: addr.country || "India",
      isDefault: addr.is_default || false
    });
  }

  async function fetchUserAddresses() {
    setAddressesLoading(true);
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      
      setAddresses(data || []);
      if (data && data.length > 0) {
        const defaultAddr = data.find(a => a.is_default) || data[0];
        setSelectedAddressId(defaultAddr.id);
        populateFormFromAddress(defaultAddr);
      }
    } catch (err) {
      console.warn("Could not retrieve addresses from Supabase:", err);
    } finally {
      setAddressesLoading(false);
    }
  }

  // Fetch addresses when mounted & logged in
  useEffect(() => {
    if (mounted && user) {
      const timer = setTimeout(() => {
        fetchUserAddresses();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user]);

  const handleSelectSavedAddress = (e) => {
    const id = e.target.value;
    setSelectedAddressId(id);
    if (id === "new") {
      setShippingDetails({
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
    } else {
      const found = addresses.find(a => a.id === id);
      if (found) populateFormFromAddress(found);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setShippingDetails(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.variant?.price || item.product?.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  // Free shipping over ₹10,000 (1000000 cents), otherwise ₹50 (5000 cents)
  const shippingCharge = subtotal >= 1000000 ? 0 : 5000;

  // Coupon calculations
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discount = Math.round((subtotal * appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount && discount > appliedCoupon.max_discount) {
        discount = appliedCoupon.max_discount;
      }
    } else if (appliedCoupon.discount_type === "fixed_amount") {
      discount = appliedCoupon.discount_value;
    }
  }

  // Calculate pre-discount GST for each item based on unit price threshold (₹2,499 = 249,900 paise)
  let totalPreDiscountTax = 0;
  cartItems.forEach(item => {
    const unitPrice = item.variant?.price || item.product?.price || 0;
    const rate = unitPrice > 249900 ? 18 : 5;
    const unitTax = Math.round(unitPrice * (rate / 100));
    totalPreDiscountTax += unitTax * item.quantity;
  });

  // GST (Tax) - Inclusive in Subtotal (reduced proportionally by coupon discount)
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = subtotal > 0
    ? Math.round(totalPreDiscountTax * (taxableAmount / subtotal))
    : 0;

  const totalAmount = taxableAmount + shippingCharge;

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  const validateShippingForm = () => {
    const errors = {};
    if (!shippingDetails.fullName.trim()) errors.fullName = "Full name is required";
    if (!shippingDetails.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[0-9\s-]{10,14}$/.test(shippingDetails.phone.trim())) {
      errors.phone = "Enter a valid phone number";
    }
    if (!shippingDetails.addressLine1.trim()) errors.addressLine1 = "Address is required";
    if (!shippingDetails.city.trim()) errors.city = "City is required";
    if (!shippingDetails.state.trim()) errors.state = "State is required";
    if (!shippingDetails.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^[0-9]{6}$/.test(shippingDetails.pincode.trim())) {
      errors.pincode = "Enter a valid 6-digit pincode";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      // Try to query Supabase coupons table
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Validate minimum amount
        if (subtotal < data.minimum_amount) {
          setCouponError(`This coupon requires a minimum subtotal of ${formatPrice(data.minimum_amount)}`);
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon(data);
          setCouponError(null);
        }
      } else {
        // Fallback to client-side predefined codes
        const fallback = FALLBACK_COUPONS[couponCode.toUpperCase().trim()];
        if (fallback) {
          if (subtotal < fallback.minimum_amount) {
            setCouponError(`This coupon requires a minimum subtotal of ${formatPrice(fallback.minimum_amount)}`);
            setAppliedCoupon(null);
          } else {
            setAppliedCoupon(fallback);
            setCouponError(null);
          }
        } else {
          setCouponError("Invalid or expired coupon code");
          setAppliedCoupon(null);
        }
      }
    } catch (err) {
      console.warn("Coupon database check failed, attempting local fallback:", err);
      const fallback = FALLBACK_COUPONS[couponCode.toUpperCase().trim()];
      if (fallback) {
        if (subtotal < fallback.minimum_amount) {
          setCouponError(`This coupon requires a minimum subtotal of ${formatPrice(fallback.minimum_amount)}`);
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon(fallback);
          setCouponError(null);
        }
      } else {
        setCouponError("Invalid or expired coupon code");
        setAppliedCoupon(null);
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(storeSettings.upi_id || "pay@cacapo");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    if (validateShippingForm()) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePlaceOrder = async () => {
    setOrderLoading(true);
    setCheckoutError(null);

    const orderNumber = `CCP-${Math.floor(100000 + Math.random() * 900000)}`;
    const addressData = selectedAddressId && selectedAddressId !== "new"
      ? addresses.find(a => a.id === selectedAddressId)
      : shippingDetails;

    const finalAddressJson = {
      full_name: addressData.fullName || addressData.full_name,
      phone: addressData.phone,
      address_line1: addressData.addressLine1 || addressData.address_line1,
      address_line2: addressData.addressLine2 || addressData.address_line2 || "",
      city: addressData.city,
      state: addressData.state,
      country: addressData.country || "India",
      pincode: addressData.pincode || addressData.pincode
    };

    let generatedOrderId = null;

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const hasMockItems = cartItems.some(item => !uuidRegex.test(item.product_id));

      if (hasMockItems) {
        // Simulate order placement for demo/mock products
        generatedOrderId = crypto.randomUUID();
        setPlacedOrder({
          orderId: generatedOrderId,
          orderNumber: orderNumber,
          totals: { subtotal, discount, shipping: shippingCharge, tax, total: totalAmount },
          paymentMethod,
          utr: "pay_mock_" + Math.floor(Math.random() * 1000000),
          shippingAddress: finalAddressJson,
          items: [...cartItems]
        });
        await clearCart(user?.id);
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
        setOrderLoading(false);
        return;
      }

      // 1. Save Address to profile if user selected so and address is new
      let addressId = selectedAddressId && selectedAddressId !== "new" ? selectedAddressId : null;
      if (user && saveAddressToProfile && (!selectedAddressId || selectedAddressId === "new")) {
        const { data: savedAddr, error: addrErr } = await supabase
          .from("addresses")
          .insert({
            user_id: user.id,
            full_name: shippingDetails.fullName,
            phone: shippingDetails.phone,
            address_line1: shippingDetails.addressLine1,
            address_line2: shippingDetails.addressLine2 || null,
            city: shippingDetails.city,
            state: shippingDetails.state,
            country: shippingDetails.country,
            pincode: shippingDetails.pincode,
            is_default: shippingDetails.isDefault
          })
          .select()
          .single();

        if (!addrErr && savedAddr) {
          addressId = savedAddr.id;
        }
      }

      // 2. Insert Order
      if (user) {
        const { data: dbOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            address_id: addressId,
            shipping_address: finalAddressJson,
            order_number: orderNumber,
            subtotal: subtotal,
            discount: discount,
            shipping_charge: shippingCharge,
            tax: tax,
            total_amount: totalAmount,
            payment_status: "unpaid",
            order_status: "pending",
            payment_method: paymentMethod === "razorpay" ? "upi" : paymentMethod,
            applied_coupon_id: appliedCoupon?.id || null
          })
          .select()
          .single();

        if (orderErr) throw orderErr;
        generatedOrderId = dbOrder.id;

        // 3. Insert Order Items
        const itemsToInsert = cartItems.map(item => ({
          order_id: generatedOrderId,
          product_id: item.product_id,
          variant_id: item.variant_id && uuidRegex.test(item.variant_id) ? item.variant_id : null,
          quantity: item.quantity,
          price: item.variant?.price || item.product?.price || 0
        }));

        const { error: itemsErr } = await supabase
          .from("order_items")
          .insert(itemsToInsert);

        if (itemsErr) throw itemsErr;

        // 4. Deduct stock for each ordered item via SECURITY DEFINER function
        for (const item of cartItems) {
          const qty = item.quantity || 1;
          const variantId = item.variant_id && uuidRegex.test(item.variant_id) ? item.variant_id : null;
          const productId = item.product_id && uuidRegex.test(item.product_id) ? item.product_id : null;

          await supabase.rpc("deduct_stock", {
            p_variant_id: variantId,
            p_product_id: variantId ? null : productId,
            p_quantity: qty
          });
        }

        // 5. COD vs Razorpay flow logic
        if (paymentMethod === "cod") {
          const { error: payErr } = await supabase
            .from("payments")
            .insert({
              order_id: generatedOrderId,
              payment_gateway: "cod",
              transaction_id: null,
              amount: totalAmount,
              status: "pending"
            });

          if (payErr) throw payErr;

          // Update COD order status to processing directly
          await supabase
            .from("orders")
            .update({ order_status: "processing" })
            .eq("id", generatedOrderId);

          setPlacedOrder({
            orderId: generatedOrderId,
            orderNumber: orderNumber,
            totals: { subtotal, discount, shipping: shippingCharge, tax, total: totalAmount },
            paymentMethod: "cod",
            utr: null,
            shippingAddress: finalAddressJson,
            items: [...cartItems]
          });

          await clearCart(user?.id);
          setStep(2);
          window.scrollTo({ top: 0, behavior: "smooth" });
          setOrderLoading(false);

        } else {
          // Call API to create order
          const orderCreateRes = await fetch("/api/payments/razorpay/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: totalAmount, orderNumber })
          });

          if (!orderCreateRes.ok) {
            const errJson = await orderCreateRes.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to initiate Razorpay order.");
          }

          const rzpOrderData = await orderCreateRes.json();

          // Insert pending payment record
          const { error: payErr } = await supabase
            .from("payments")
            .insert({
              order_id: generatedOrderId,
              payment_gateway: rzpOrderData.mock ? "razorpay_mock" : "razorpay",
              transaction_id: rzpOrderData.id,
              amount: totalAmount,
              status: "pending"
            });

          if (payErr) throw payErr;



          if (typeof window.Razorpay === "undefined") {
            throw new Error("Razorpay SDK failed to load. Please refresh the page.");
          }

          const rzpOptions = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: rzpOrderData.amount,
            currency: rzpOrderData.currency,
            name: "CACAPO",
            description: `Order #${orderNumber}`,
            order_id: rzpOrderData.id,
            handler: async function (response) {
              setOrderLoading(true);
              try {
                const verifyRes = await fetch("/api/payments/razorpay/verify-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    order_id: generatedOrderId
                  })
                });

                if (!verifyRes.ok) {
                  const verifyErr = await verifyRes.json().catch(() => ({}));
                  throw new Error(verifyErr.error || "Payment verification failed.");
                }

                setPlacedOrder({
                  orderId: generatedOrderId,
                  orderNumber: orderNumber,
                  totals: { subtotal, discount, shipping: shippingCharge, tax, total: totalAmount },
                  paymentMethod: "razorpay",
                  utr: response.razorpay_payment_id,
                  shippingAddress: finalAddressJson,
                  items: [...cartItems]
                });

                await clearCart(user?.id);
                setStep(2);
                window.scrollTo({ top: 0, behavior: "smooth" });
              } catch (err) {
                setCheckoutError(err.message || "Payment verification failed. Please contact support.");
              } finally {
                setOrderLoading(false);
              }
            },
            modal: {
              ondismiss: function () {
                setOrderLoading(false);
              }
            },
            prefill: {
              name: finalAddressJson.full_name,
              contact: finalAddressJson.phone,
              email: user?.email || ""
            },
            theme: {
              color: "#000000"
            }
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.open();
        }
      }
    } catch (err) {
      console.error("Payment flow failed:", err);
      setCheckoutError(err.message || "An unexpected error occurred. Please try again.");
      setOrderLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Empty Cart State
  if (cartItems.length === 0 && step < 2) {
    return (
      <SmoothScroll>
        <Navbar />
        <div className="min-h-[75vh] bg-black flex flex-col items-center justify-center text-white px-6 font-sans">
          <div className="relative mb-6">
            <div className="absolute -inset-1 bg-accent/20 rounded-full blur-lg"></div>
            <ShoppingBag className="w-16 h-16 text-zinc-600 stroke-1 relative bg-black p-3 rounded-full border border-zinc-800" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] uppercase mb-2">Checkout is Empty</h1>
          <p className="text-muted-text text-sm text-center max-w-md mb-8 tracking-wider">
            You must add items to your cart before proceeding to checkout.
          </p>
          <Link 
            href="/shop" 
            className="px-8 py-3 bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 rounded-none"
          >
            Explore Collection
          </Link>
        </div>
        <Footer />
      </SmoothScroll>
    );
  }

  // Require Authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user && step < 2) {
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
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
        .animate-scan {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #FF4D4D;
          box-shadow: 0 0 10px #FF4D4D;
          animation: scan 3s ease-in-out infinite;
        }
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
          
          {step < 2 ? (
            <>
              {/* Stepper Indicator */}
              <div className="flex items-center justify-start gap-4 mb-12 border-b border-zinc-900 pb-6">
                <span 
                  className={`text-xs tracking-[0.2em] font-bold ${
                    step >= 0 ? "text-white" : "text-zinc-600"
                  } transition-colors`}
                >
                  01. SHIPPING
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
                <span 
                  className={`text-xs tracking-[0.2em] font-bold ${
                    step >= 1 ? "text-white" : "text-zinc-600"
                  } transition-colors`}
                >
                  02. PAYMENT
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                {/* Left Form Panel */}
                <div className="lg:col-span-7">
                  
                  {step === 0 && (
                    <form onSubmit={handleShippingSubmit} className="space-y-8">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold tracking-widest uppercase">Shipping Address</h2>
                        <span className="text-xs text-muted-text flex items-center gap-1.5 font-medium">
                          <Lock className="w-3.5 h-3.5" /> SECURE CHECKOUT
                        </span>
                      </div>

                      {/* Saved Addresses dropdown */}
                      {user && addresses.length > 0 && (
                        <div className="p-5 border border-zinc-800 bg-zinc-950/40 space-y-3">
                          <label className="block text-xs font-bold uppercase tracking-widest text-muted-text">
                            Saved Addresses
                          </label>
                          {addressesLoading ? (
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <Loader2 className="w-3 h-3 animate-spin text-accent" /> Loading saved addresses...
                            </div>
                          ) : (
                            <select
                              value={selectedAddressId}
                              onChange={handleSelectSavedAddress}
                              className="custom-input text-xs tracking-wider"
                            >
                              {addresses.map((addr) => (
                                <option key={addr.id} value={addr.id}>
                                  {addr.full_name} - {addr.address_line1}, {addr.city}
                                </option>
                              ))}
                              <option value="new">+ ADD NEW ADDRESS</option>
                            </select>
                          )}
                        </div>
                      )}

                      {/* Address Fields */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              name="fullName"
                              value={shippingDetails.fullName}
                              onChange={handleInputChange}
                              disabled={selectedAddressId && selectedAddressId !== "new"}
                              className="custom-input text-sm tracking-wide"
                              placeholder="e.g. Jane Doe"
                            />
                            {formErrors.fullName && (
                              <p className="text-accent text-[11px] tracking-wider font-medium">{formErrors.fullName}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                              Contact Number *
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={shippingDetails.phone}
                              onChange={handleInputChange}
                              disabled={selectedAddressId && selectedAddressId !== "new"}
                              className="custom-input text-sm tracking-wide"
                              placeholder="e.g. +91 98765 43210"
                            />
                            {formErrors.phone && (
                              <p className="text-accent text-[11px] tracking-wider font-medium">{formErrors.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                            Address Line 1 *
                          </label>
                          <input
                            type="text"
                            name="addressLine1"
                            value={shippingDetails.addressLine1}
                            onChange={handleInputChange}
                            disabled={selectedAddressId && selectedAddressId !== "new"}
                            className="custom-input text-sm tracking-wide"
                            placeholder="Flat, House no., Building, Company, Apartment"
                          />
                          {formErrors.addressLine1 && (
                            <p className="text-accent text-[11px] tracking-wider font-medium">{formErrors.addressLine1}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                            Address Line 2 (Optional)
                          </label>
                          <input
                            type="text"
                            name="addressLine2"
                            value={shippingDetails.addressLine2}
                            onChange={handleInputChange}
                            disabled={selectedAddressId && selectedAddressId !== "new"}
                            className="custom-input text-sm tracking-wide"
                            placeholder="Area, Street, Sector, Village"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                              City *
                            </label>
                            <input
                              type="text"
                              name="city"
                              value={shippingDetails.city}
                              onChange={handleInputChange}
                              disabled={selectedAddressId && selectedAddressId !== "new"}
                              className="custom-input text-sm tracking-wide"
                              placeholder="e.g. Mumbai"
                            />
                            {formErrors.city && (
                              <p className="text-accent text-[11px] tracking-wider font-medium">{formErrors.city}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                              State *
                            </label>
                            <input
                              type="text"
                              name="state"
                              value={shippingDetails.state}
                              onChange={handleInputChange}
                              disabled={selectedAddressId && selectedAddressId !== "new"}
                              className="custom-input text-sm tracking-wide"
                              placeholder="e.g. Maharashtra"
                            />
                            {formErrors.state && (
                              <p className="text-accent text-[11px] tracking-wider font-medium">{formErrors.state}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400">
                              ZIP / Pincode *
                            </label>
                            <input
                              type="text"
                              name="pincode"
                              value={shippingDetails.pincode}
                              onChange={handleInputChange}
                              disabled={selectedAddressId && selectedAddressId !== "new"}
                              className="custom-input text-sm tracking-wide"
                              placeholder="e.g. 400001"
                            />
                            {formErrors.pincode && (
                              <p className="text-accent text-[11px] tracking-wider font-medium">{formErrors.pincode}</p>
                            )}
                          </div>
                        </div>

                        {user && (!selectedAddressId || selectedAddressId === "new") && (
                          <div className="flex flex-col gap-3 pt-2">
                            <label className="flex items-center gap-3 text-xs tracking-wider cursor-pointer text-zinc-400 hover:text-white transition-colors">
                              <input
                                type="checkbox"
                                checked={saveAddressToProfile}
                                onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                                className="accent-accent w-4 h-4 cursor-pointer"
                              />
                              Save address to profile for future checkout
                            </label>
                            {saveAddressToProfile && (
                              <label className="flex items-center gap-3 text-xs tracking-wider cursor-pointer text-zinc-400 hover:text-white transition-colors">
                                <input
                                  type="checkbox"
                                  name="isDefault"
                                  checked={shippingDetails.isDefault}
                                  onChange={handleInputChange}
                                  className="accent-accent w-4 h-4 cursor-pointer"
                                />
                                Set as default shipping address
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                      {Object.values(formErrors).some(val => val) && (
                        <div className="text-center text-lg mt-6 animate-pulse select-none">
                          ⚠️
                        </div>
                      )}

                      {/* Return policy acknowledgment checkbox (Step 8.3) */}
                      <div className="flex flex-col gap-2 pt-4 border-t border-zinc-900/60">
                        <label className="flex items-start gap-3 text-[10px] tracking-wider cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors select-none leading-relaxed">
                          <input
                            type="checkbox"
                            checked={policyAccepted}
                            onChange={(e) => setPolicyAccepted(e.target.checked)}
                            className="accent-accent w-4 h-4 cursor-pointer mt-0.5"
                          />
                          <span>
                            I have read and agree to the{" "}
                            <Link href="/return-policy" target="_blank" className="text-accent underline font-semibold">
                              Return & Replacement Policy
                            </Link>.
                            <span className="block text-[9px] text-zinc-600 mt-1 italic normal-case">
                              Understanding our policy ensures faster resolutions if anything goes wrong with your order.
                            </span>
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={!policyAccepted}
                        className="w-full py-4 bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 rounded-none mt-8 disabled:bg-zinc-900 disabled:text-zinc-650 disabled:border-zinc-900 disabled:cursor-not-allowed"
                      >
                        CONTINUE TO PAYMENT <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}

                  {step === 1 && (
                    <div className="space-y-8">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold tracking-widest uppercase">Select Payment Mode</h2>
                        <span className="text-xs text-muted-text flex items-center gap-1.5 font-medium">
                          <Lock className="w-3.5 h-3.5" /> SECURE CHANNEL
                        </span>
                      </div>

                      {/* Payment Mode Selector */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("razorpay");
                            setUtrError("");
                          }}
                          className={`flex items-center gap-4 p-5 border text-left rounded-none transition-all duration-300 bg-transparent ${
                            paymentMethod === "razorpay"
                              ? "border-accent bg-accent/5"
                              : "border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMethod === "razorpay" ? "border-accent" : "border-zinc-700"
                          }`}>
                            {paymentMethod === "razorpay" && <div className="w-2 h-2 rounded-full bg-accent"></div>}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white">Online Payment</p>
                            <p className="text-[11px] text-muted-text mt-1 tracking-wider">Cards, UPI, Netbanking, Wallets via Razorpay</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("cod");
                            setUtrError("");
                          }}
                          className={`flex items-center gap-4 p-5 border text-left rounded-none transition-all duration-300 bg-transparent ${
                            paymentMethod === "cod"
                              ? "border-accent bg-accent/5"
                              : "border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMethod === "cod" ? "border-accent" : "border-zinc-700"
                          }`}>
                            {paymentMethod === "cod" && <div className="w-2 h-2 rounded-full bg-accent"></div>}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white">Cash on Delivery (COD)</p>
                            <p className="text-[11px] text-muted-text mt-1 tracking-wider">Pay in cash upon delivery</p>
                          </div>
                        </button>
                      </div>

                      {/* Razorpay Payment Flow */}
                      {paymentMethod === "razorpay" && (
                        <div className="p-5 border border-zinc-800 bg-zinc-950/40 space-y-3 animate-fadeIn duration-500">
                          <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-accent" /> Secure Razorpay Checkout Selected
                          </p>
                          <p className="text-xs text-muted-text tracking-wider leading-relaxed pt-1">
                            Upon clicking &quot;Place Order&quot;, a secure Razorpay payment window will open where you can pay instantly using your preferred UPI app, Credit/Debit card, Netbanking, or mobile wallets.
                          </p>
                          <p className="text-[11px] text-zinc-500 italic">
                            Do not close or refresh the window while payment is processing.
                          </p>
                        </div>
                      )}

                      {/* Cash on Delivery Flow */}
                      {paymentMethod === "cod" && (
                        <div className="p-5 border border-zinc-800 bg-zinc-950/40 space-y-2 animate-fadeIn duration-500">
                          <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-500" /> Cash on Delivery Selected
                          </p>
                          <p className="text-xs text-muted-text tracking-wider leading-relaxed pt-1">
                            Your order will be processed immediately. You will pay the courier partner the exact total amount of{" "}
                            <span className="text-white font-bold">{formatPrice(totalAmount)}</span> in cash upon receiving your package.
                          </p>
                        </div>
                      )}

                      {checkoutError && (
                        <div className="p-4 border border-accent/20 bg-accent/5 text-accent text-xs tracking-wider leading-relaxed text-center font-medium uppercase mt-4">
                          {checkoutError}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setStep(0);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-6 py-4 border border-zinc-800 bg-transparent text-white text-xs font-bold tracking-widest uppercase hover:border-zinc-600 transition-all duration-300 rounded-none w-1/3"
                        >
                          BACK
                        </button>
                        
                        <button
                          type="button"
                          disabled={orderLoading}
                          onClick={handlePlaceOrder}
                          className="flex-1 py-4 bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 rounded-none disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          {orderLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> PLACING ORDER...
                            </>
                          ) : (
                            paymentMethod === "upi" ? "SUBMIT & COMPLETE CHECKOUT" : "CONFIRM & PLACE ORDER"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Summary Panel */}
                <div className="lg:col-span-5">
                  <div className="border border-zinc-800 bg-black p-6 rounded-none sticky top-28 space-y-6">
                    <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 border-b border-zinc-900 pb-3">
                      Order Summary ({cartItems.length})
                    </h3>

                    {/* Cart Items list */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-zinc-900 pr-1 no-scrollbar">
                      {cartItems.map((item) => {
                        const itemPrice = item.variant?.price || item.product?.price || 0;
                        const dbImages = item.product?.product_images ? item.product.product_images.map(img => img.image_url) : [];
                        const mainImage = item.product?.images?.[0] || (dbImages.length > 0 ? dbImages[0] : "/Images/clothing.jpg");
                        return (
                          <div key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center">
                            <div className="w-12 h-14 bg-zinc-900 relative shrink-0 border border-zinc-800 overflow-hidden">
                              <img
                                src={mainImage}
                                alt={item.product?.name || "Product"}
                                className="w-full h-full object-cover object-center"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] font-bold uppercase tracking-widest text-white truncate">
                                {item.product?.name}
                              </h4>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                {item.variant?.size && `Size: ${item.variant.size}`}
                                {item.variant?.color && ` • Color: ${item.variant.color}`}
                              </p>
                              <p className="text-[10px] text-zinc-400 mt-1 tracking-wider">
                                {item.quantity} x {formatPrice(itemPrice)}
                              </p>
                            </div>
                            <div className="text-[11px] font-bold tracking-wider text-white">
                              {formatPrice(itemPrice * item.quantity)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Coupon Box */}
                    <div className="border-t border-zinc-900 pt-4 space-y-3">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-3 border border-zinc-800 bg-zinc-950/40">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white font-mono">
                                {appliedCoupon.code} APPLIED
                              </p>
                              <p className="text-[9px] text-green-500 tracking-wider">
                                Save {appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : formatPrice(appliedCoupon.discount_value)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-accent transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleApplyCoupon} className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value.toUpperCase());
                              if (couponError) setCouponError(null);
                            }}
                            placeholder="PROMO CODE (e.g. WELCOME10)"
                            className="custom-input text-xs tracking-wider flex-1 py-2 px-3"
                          />
                          <button
                            type="submit"
                            disabled={couponLoading || !couponCode.trim()}
                            className="px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white text-[10px] font-bold tracking-widest uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "APPLY"}
                          </button>
                        </form>
                      )}
                      {couponError && (
                        <p className="text-accent text-[10px] tracking-wider font-medium pl-1">{couponError}</p>
                      )}
                    </div>

                    {/* Order Price Breakdown */}
                    <div className="border-t border-zinc-900 pt-4 space-y-2.5 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span className="tracking-wider">Subtotal</span>
                        <span className="font-semibold">{formatPrice(subtotal)}</span>
                      </div>
                      
                      {appliedCoupon && (
                        <div className="flex justify-between text-green-500">
                          <span className="tracking-wider">Promo Discount</span>
                          <span className="font-semibold">-{formatPrice(discount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-zinc-400">
                        <span className="tracking-wider">Shipping</span>
                        <span className="font-semibold">
                          {shippingCharge === 0 ? "FREE" : formatPrice(shippingCharge)}
                        </span>
                      </div>

                      <div className="flex justify-between text-white border-t border-zinc-900 pt-3 text-sm font-bold items-start">
                        <div className="flex flex-col">
                          <span className="tracking-widest uppercase">Total Due</span>
                          <span className="text-[10px] text-zinc-500 tracking-wider font-normal mt-0.5">
                            (Inclusive of GST)
                          </span>
                          {storeSettings.gst_number && (
                            <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase mt-1">
                              GSTIN: {storeSettings.gst_number}
                            </span>
                          )}
                        </div>
                        <span className="text-base tracking-wider">{formatPrice(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </>
          ) : (
            
            /* Step 2: CONFIRMED Success Screen */
            <div className="max-w-2xl mx-auto text-center space-y-8 py-12 animate-fadeIn duration-500">
              
              {/* Checkmark or Verification shield animation container */}
              <div className="relative inline-block">
                <div className={`absolute -inset-2 rounded-full blur-xl ${
                  placedOrder?.paymentMethod === "upi" ? "bg-accent/20" : "bg-green-500/20"
                }`}></div>
                
                {placedOrder?.paymentMethod === "upi" ? (
                  <div className="relative border-2 border-accent bg-zinc-950 p-6 rounded-full inline-block">
                    <Info className="w-12 h-12 text-accent" />
                  </div>
                ) : (
                  <div className="relative border-2 border-green-500 bg-zinc-950 p-6 rounded-full inline-block">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                )}
              </div>

              {/* Title & Status Message */}
              <div className="space-y-3">
                <h1 className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Checkout Complete
                </h1>
                
                {placedOrder?.paymentMethod === "upi" ? (
                  <>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest uppercase text-white">
                      AWAITING PAYMENT VERIFICATION
                    </h2>
                    <p className="text-zinc-400 text-sm max-w-lg mx-auto tracking-wider leading-relaxed pt-2">
                      Your order has been registered successfully. Our administrative desk will verify your UPI Transaction UTR Reference (<strong>{placedOrder.utr}</strong>) within 24 hours to confirm your shipment.
                    </p>
                  </>
                ) : placedOrder?.paymentMethod === "razorpay" ? (
                  <>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest uppercase text-green-500">
                      ORDER PAID SUCCESSFULLY
                    </h2>
                    <p className="text-zinc-400 text-sm max-w-lg mx-auto tracking-wider leading-relaxed pt-2">
                      Thank you for your purchase. Your payment reference (<strong>{placedOrder.utr}</strong>) has been verified. Your order is confirmed and is being processed for dispatch.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-widest uppercase text-white">
                      ORDER CONFIRMED
                    </h2>
                    <p className="text-zinc-400 text-sm max-w-lg mx-auto tracking-wider leading-relaxed pt-2">
                      Thank you for your purchase. Your Cash on Delivery order is confirmed and is being processed for dispatch. We will coordinate details with you shortly.
                    </p>
                  </>
                )}
              </div>

              {/* Order Receipt Details Card */}
              <div className="border border-zinc-900 bg-zinc-950/40 p-6 text-left space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3 text-xs tracking-wider">
                  <span className="text-zinc-500 font-bold uppercase">Order Reference</span>
                  <span className="text-white font-mono font-bold">{placedOrder?.orderNumber}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Shipping Destination</h4>
                    <p className="text-xs text-white mt-1.5 font-bold tracking-wider uppercase">
                      {placedOrder?.shippingAddress?.full_name}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed tracking-wider">
                      {placedOrder?.shippingAddress?.address_line1}
                      {placedOrder?.shippingAddress?.address_line2 && `, ${placedOrder?.shippingAddress?.address_line2}`}
                      <br />
                      {placedOrder?.shippingAddress?.city}, {placedOrder?.shippingAddress?.state} - {placedOrder?.shippingAddress?.pincode}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-bold">
                      Phone: {placedOrder?.shippingAddress?.phone}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
                    <div>
                      <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Billing Mode</h4>
                      <p className="text-xs text-white font-bold uppercase tracking-wider mt-1.5">
                        {placedOrder?.paymentMethod === "upi" ? "UPI Transfer" : placedOrder?.paymentMethod === "razorpay" ? "Online Payment (Razorpay)" : "Cash on Delivery"}
                      </p>
                      {(placedOrder?.paymentMethod === "upi" || placedOrder?.paymentMethod === "razorpay") && (
                        <p className="text-[10px] text-accent font-mono mt-1 tracking-widest font-semibold">
                          REF ID: {placedOrder.utr}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Total Transaction</h4>
                      <p className="text-xs text-accent font-extrabold tracking-wider mt-1.5">
                        {formatPrice(placedOrder?.totals?.total || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="border-t border-zinc-900 pt-4">
                    <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Items Included</h4>
                    <div className="space-y-2">
                      {placedOrder?.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs tracking-wider">
                          <span className="text-zinc-400 truncate max-w-xs uppercase font-bold text-[10px]">
                            {item.product?.name} <span className="text-zinc-600">({item.quantity}x)</span>
                          </span>
                          <span className="text-zinc-400 font-medium">
                            {formatPrice((item.variant?.price || item.product?.price || 0) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center pt-4">
                <Link
                  href="/shop"
                  className="w-full md:w-auto px-8 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold tracking-widest uppercase transition-all duration-300 rounded-none text-center"
                >
                  CONTINUE SHOPPING
                </Link>
              </div>

            </div>
          )}

        </div>
      </div>
      
      <Footer />
    </SmoothScroll>
  );
}
