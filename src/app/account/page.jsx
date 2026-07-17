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
  RefreshCw,
  Upload,
  X,
  CheckCircle,
  ShieldCheck
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import imageCompression from "browser-image-compression";

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
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  // Return & Exchange State (Step 8.4 Upgrade)
  const [activeReturnOrder, setActiveReturnOrder] = useState(null);
  const [returnModalStep, setReturnModalStep] = useState(1);
  const [selectedItems, setSelectedItems] = useState({}); // { [order_item_id]: boolean }
  const [returnAction, setReturnAction] = useState("return"); // "return" or "exchange"
  const [returnReasonSelected, setReturnReasonSelected] = useState("damaged");
  const [returnDescription, setReturnDescription] = useState("");
  const [targetExchangeVariants, setTargetExchangeVariants] = useState({}); // { [order_item_id]: variant_id }
  const [productVariantsCache, setProductVariantsCache] = useState({}); // { [product_id]: [variants] }
  const [uploadedFiles, setUploadedFiles] = useState([]); // Array of { file, name, size, type, preview, progress }
  const [uploadError, setUploadError] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceSkipped, setEvidenceSkipped] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Bank refund details state
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  const fetchProductVariants = async (productId) => {
    if (productVariantsCache[productId]) return productVariantsCache[productId];
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, size, color, stock_quantity")
        .eq("product_id", productId);
      if (error) throw error;
      setProductVariantsCache(prev => ({ ...prev, [productId]: data || [] }));
      return data || [];
    } catch (err) {
      console.error("Failed to fetch product variants:", err);
      return [];
    }
  };

  const handleOpenReturnModal = (order) => {
    setActiveReturnOrder(order);
    setReturnModalStep(1);
    setReturnAction("return");
    setReturnReasonSelected("damaged");
    setReturnDescription("");
    setUploadedFiles([]);
    setUploadError(null);
    setEvidenceSkipped(false);
    setBankName("");
    setAccountHolder("");
    setAccountNumber("");
    setIfscCode("");
    
    const initialSelected = {};
    order.order_items?.forEach(item => {
      initialSelected[item.id] = true;
    });
    setSelectedItems(initialSelected);
    setTargetExchangeVariants({});
    
    order.order_items?.forEach(item => {
      fetchProductVariants(item.product_id);
    });
  };

  const handleReturnCheckboxChange = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleFileUpload = async (e) => {
    const filesList = Array.from(e.target.files);
    setUploadError(null);

    // Limit checks: max 1 video + 5 photos
    const currentVideoCount = uploadedFiles.filter(f => f.type.startsWith("video/")).length;
    const currentPhotoCount = uploadedFiles.filter(f => f.type.startsWith("image/")).length;

    let newVideoCount = currentVideoCount;
    let newPhotoCount = currentPhotoCount;

    const filesToUpload = [];

    for (const file of filesList) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        setUploadError("Only images (JPG, PNG, WEBP) and videos (MP4, MOV, WEBM) are supported.");
        continue;
      }

      if (isVideo) {
        if (newVideoCount >= 1) {
          setUploadError("You can only upload 1 unboxing video.");
          continue;
        }
        if (file.size > 52428800) { // 50MB
          setUploadError("Video size must be under 50MB.");
          continue;
        }
        newVideoCount++;
      }

      if (isImage) {
        if (newPhotoCount >= 5) {
          setUploadError("You can only upload up to 5 photos.");
          continue;
        }
        if (file.size > 2097152) { // 2MB
          setUploadError(`Photo "${file.name}" exceeds 2MB. Please use a smaller image.`);
          continue;
        }
        newPhotoCount++;
      }

      const preview = URL.createObjectURL(file);
      filesToUpload.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview,
        progress: 0
      });
    }

    if (filesToUpload.length === 0) return;

    // Apply Client-Side Image Compression using browser-image-compression
    const processedFiles = [];
    for (const item of filesToUpload) {
      if (item.type.startsWith("image/")) {
        try {
          const options = {
            maxSizeMB: 1, // Compress to ~1MB
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          const compressed = await imageCompression(item.file, options);
          processedFiles.push({
            ...item,
            file: compressed,
            size: compressed.size
          });
        } catch (compErr) {
          console.warn("Client-side compression failed, using original file:", compErr);
          processedFiles.push(item);
        }
      } else {
        processedFiles.push(item);
      }
    }

    setUploadedFiles(prev => [...prev, ...processedFiles]);
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => {
      const file = prev[index];
      if (file && file.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleNextStep = () => {
    const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (selectedItemIds.length === 0) {
      setCustomAlert({
        title: "Selection Required",
        message: "Please select at least one item to return/exchange.",
        type: "error"
      });
      return;
    }

    if (returnModalStep === 1) {
      if (returnAction === "exchange") {
        setReturnModalStep(2);
      } else {
        setReturnModalStep(3);
      }
    } else if (returnModalStep === 2) {
      let missingVariants = false;
      selectedItemIds.forEach(itemId => {
        if (!targetExchangeVariants[itemId]) {
          missingVariants = true;
        }
      });

      if (missingVariants) {
        setCustomAlert({
          title: "Replacement Size Required",
          message: "Please select a replacement size for all exchange items.",
          type: "error"
        });
        return;
      }
      setReturnModalStep(3);
    } else if (returnModalStep === 3) {
      const hasVideo = uploadedFiles.some(f => f.type.startsWith("video/"));
      const isEvidenceRequired = ["damaged", "defective"].includes(returnReasonSelected);

      if (isEvidenceRequired && !hasVideo && !evidenceSkipped) {
        setEvidenceSkipped(true);
        setCustomAlert({
          title: "Evidence Required",
          message: "Damaged or defective return claims require unboxing video evidence. Submitting without evidence will delay priority review. Click Next again to proceed anyway.",
          type: "warning"
        });
        return;
      }
      setReturnModalStep(4);
    }
  };

  const handleSubmitReturnModal = async () => {
    setSubmittingReturn(true);
    try {
      const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
      const itemsPayload = activeReturnOrder.order_items
        .filter(item => selectedItems[item.id])
        .map(item => ({
          order_item_id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          name: item.product?.name,
          size: item.variant?.size,
          color: item.variant?.color
        }));

      const exchangeDetails = {};
      if (returnAction === "exchange") {
        selectedItemIds.forEach(itemId => {
          const varId = targetExchangeVariants[itemId];
          const item = activeReturnOrder.order_items.find(i => i.id === itemId);
          const cachedVariants = productVariantsCache[item?.product_id] || [];
          const selectedVar = cachedVariants.find(v => v.id === varId);
          if (selectedVar) {
            exchangeDetails[itemId] = {
              target_variant_id: varId,
              target_size: selectedVar.size,
              target_color: selectedVar.color || "Default"
            };
          }
        });
      }

      // Step A: Call return submission API
      const res = await fetch("/api/returns/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: activeReturnOrder.id,
          user_id: user.id,
          request_type: returnAction,
          reason: returnReasonSelected,
          reason_notes: returnDescription,
          items: itemsPayload,
          exchange_details: returnAction === "exchange" ? exchangeDetails : null,
          bank_details: returnAction === "return" ? {
            account_holder: accountHolder,
            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode
          } : null
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit return request");
      }

      const submitData = await res.json();
      const returnRequestId = submitData.return_request_id;

      // Step B: Upload files if any exist
      if (uploadedFiles.length > 0 && returnRequestId) {
        const uploadFormData = new FormData();
        uploadFormData.append("return_request_id", returnRequestId);
        uploadFormData.append("user_id", user.id);
        
        uploadedFiles.forEach((fileObj) => {
          uploadFormData.append("files", fileObj.file);
        });

        setUploadingEvidence(true);

        const uploadRes = await fetch("/api/returns/upload-evidence", {
          method: "POST",
          body: uploadFormData
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}));
          throw new Error(uploadErr.error || "Evidence files upload failed.");
        }
      }

      setCustomAlert({
        title: "Request Submitted",
        message: `Your ${returnAction === "exchange" ? "exchange" : "return"} request has been successfully queued for priority review.`,
        type: "success"
      });
      setActiveReturnOrder(null);
      await fetchOrders();

    } catch (err) {
      console.error("Submission failed:", err);
      setCustomAlert({
        title: "Submission Error",
        message: err.message || "An unexpected error occurred during submission.",
        type: "error"
      });
    } finally {
      setSubmittingReturn(false);
      setUploadingEvidence(false);
    }
  };

  const [returnRequests, setReturnRequests] = useState([]);
  const [uploadingDirectOrderId, setUploadingDirectOrderId] = useState(null);

  async function fetchProfileData() {
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
  }

  async function fetchAddresses() {
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
  }

  async function fetchOrders() {
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

      // Try loading returns requests from return_requests table (Step 8.8)
      try {
        const { data: rrData, error: rrError } = await supabase
          .from("return_requests")
          .select("*")
          .eq("user_id", user.id);
        if (!rrError && rrData) {
          setReturnRequests(rrData);
        }
      } catch (rrTableErr) {
        console.warn("Could not query return_requests table, fallback order metadata will be used:", rrTableErr.message);
      }
    } catch (err) {
      console.warn("Could not fetch orders from Supabase:", err);
    } finally {
      setOrdersLoading(false);
    }
  }

  const handleCancelOrder = async (order) => {
    setConfirmModal({
      title: "Cancel Order",
      message: `Are you sure you want to cancel Order #${order.order_number || order.id}? This action cannot be undone and stock holds will be released.`,
      onConfirm: async () => {
        setCancellingOrderId(order.id);
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

          setCustomAlert({
            title: "Order Cancelled",
            message: `Order #${order.order_number || order.id} has been cancelled successfully. Any stock holds have been released.`,
            type: "success"
          });

          await fetchOrders();
        } catch (err) {
          console.error("Failed to cancel order:", err);
          setCustomAlert({
            title: "Cancellation Failed",
            message: err.message || "An unexpected error occurred while cancelling your order. Please try again.",
            type: "error"
          });
        } finally {
          setCancellingOrderId(null);
        }
      }
    });
  };

  const handleUploadEvidenceDirect = async (e, order, returnRequest) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validation
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    const videoFiles = files.filter(f => f.type.startsWith("video/"));

    if (imageFiles.length > 5) {
      alert("You can upload a maximum of 5 evidence photos.");
      return;
    }
    if (videoFiles.length > 1) {
      alert("You can upload a maximum of 1 evidence video.");
      return;
    }
    const oversizedImage = files.filter(f => f.type.startsWith("image/")).some(f => f.size > 2097152); // 2MB
    const oversizedVideo = files.filter(f => f.type.startsWith("video/")).some(f => f.size > 52428800); // 50MB
    if (oversizedImage) {
      alert("Each evidence photo must be smaller than 2MB.");
      return;
    }
    if (oversizedVideo) {
      alert("The evidence video must be smaller than 50MB.");
      return;
    }

    setUploadingDirectOrderId(order.id);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("return_request_id", returnRequest.id);
      uploadFormData.append("user_id", user.id);

      files.forEach((file) => {
        uploadFormData.append("files", file);
      });

      const res = await fetch("/api/returns/upload-evidence", {
        method: "POST",
        body: uploadFormData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to upload evidence files.");
      }

      setCustomAlert({
        title: "Evidence Uploaded",
        message: "✓ Evidence successfully submitted — your request has been updated to priority review status.",
        type: "success"
      });

      await fetchOrders();
    } catch (err) {
      console.error("[DirectEvidenceUpload] Upload failed:", err);
      setCustomAlert({
        title: "Upload Failed",
        message: err.message || "Could not upload evidence files. Please try again.",
        type: "error"
      });
    } finally {
      setUploadingDirectOrderId(null);
    }
  };

  const [gstNumber, setGstNumber] = useState("");
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [customAlert, setCustomAlert] = useState(null); // { title, message, type }

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Disable body scroll and Lenis hijacking when Returns Modal is open (Step 8.4)
  useEffect(() => {
    if (mounted && activeReturnOrder) {
      document.body.style.overflow = "hidden";
      if (typeof window !== "undefined" && window.lenis) {
        window.lenis.stop();
      }
    } else if (mounted) {
      document.body.style.overflow = "auto";
      if (typeof window !== "undefined" && window.lenis) {
        window.lenis.start();
      }
    }
    return () => {
      if (mounted) {
        document.body.style.overflow = "auto";
        if (typeof window !== "undefined" && window.lenis) {
          window.lenis.start();
        }
      }
    };
  }, [activeReturnOrder, mounted]);

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
      queueMicrotask(() => {
        fetchProfileData();
        fetchAddresses();
        fetchOrders();
      });
    }
  }, [mounted, user]);


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
                    <p className="text-zinc-500 text-xs tracking-wider">You haven&apos;t placed any orders yet.</p>
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
                      let badgeClass = "";
                      let badgeText = "";

                      const rr = order.shipping_address?.return_request || returnRequests.find(r => r.order_id === order.id);

                      if (rr) {
                        if (rr.status === "approved" || rr.status === "completed") {
                          if (rr.type === "exchange" || rr.request_type === "exchange") {
                            badgeClass = "bg-teal-500/10 border border-teal-500/20 text-teal-400";
                            badgeText = "EXCHANGED";
                          } else {
                            badgeClass = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
                            badgeText = "RETURNED";
                          }
                        } else if (rr.status === "rejected") {
                          badgeClass = "bg-zinc-800 border border-zinc-700/50 text-zinc-500";
                          badgeText = (rr.type === "exchange" || rr.request_type === "exchange") ? "EXCHANGE DECLINED" : "RETURN DECLINED";
                        } else if (rr.status === "received") {
                          badgeClass = "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse";
                          badgeText = "ITEMS RECEIVED";
                        } else if (rr.status === "pickup_confirmed") {
                          badgeClass = "bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-pulse";
                          badgeText = "PICKUP SCHEDULED";
                        } else {
                          if (rr.type === "exchange" || rr.request_type === "exchange") {
                            badgeClass = "bg-purple-500/10 border border-purple-500/20 text-purple-400";
                            badgeText = "EXCHANGE REQUESTED";
                          } else {
                            badgeClass = "bg-red-500/10 border border-red-500/20 text-red-400";
                            badgeText = "RETURN REQUESTED";
                          }
                        }
                      } else if (order.order_status === "return_requested" || order.order_status === "returned" || order.order_status === "exchange_requested" || order.order_status === "exchanged") {
                        if (order.order_status === "return_requested") {
                          badgeClass = "bg-red-500/10 border border-red-500/20 text-red-400";
                          badgeText = "RETURN REQUESTED";
                        } else if (order.order_status === "returned") {
                          badgeClass = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
                          badgeText = "RETURNED";
                        } else if (order.order_status === "exchange_requested") {
                          badgeClass = "bg-purple-500/10 border border-purple-500/20 text-purple-400";
                          badgeText = "EXCHANGE REQUESTED";
                        } else if (order.order_status === "exchanged") {
                          badgeClass = "bg-teal-500/10 border border-teal-500/20 text-teal-400";
                          badgeText = "EXCHANGED";
                        }
                      } else {
                        switch (order.order_status) {
                          case "delivered":
                            badgeClass = "bg-green-500/10 border border-green-500/20 text-green-500";
                            badgeText = "DELIVERED";
                            break;
                          case "shipped":
                            badgeClass = "bg-orange-500/10 border border-orange-500/20 text-orange-400";
                            badgeText = "DISPATCHED";
                            break;
                          case "processing":
                            badgeClass = "bg-blue-500/10 border border-blue-500/20 text-blue-400";
                            badgeText = "PROCESSING";
                            break;
                          case "cancelled":
                            badgeClass = "bg-zinc-800 border border-zinc-700/50 text-zinc-500";
                            badgeText = "CANCELLED";
                            break;
                          case "pending":
                          case "pending_payment":
                          default:
                            badgeClass = "bg-amber-500/10 border border-amber-500/20 text-amber-400";
                            badgeText = "AWAITING VERIFICATION";
                            break;
                        }
                      }

                      return (
                        <div key={order.id} className="border border-zinc-900 bg-black overflow-hidden transition-all duration-300">
                          
                          {/* Order Header Summary Row */}
                          <div 
                            onClick={() => toggleOrderExpand(order.id)}
                            className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-zinc-950/40 transition-colors"
                          >
                            <div className="space-y-1.5 tracking-wider text-xs">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="font-mono font-bold text-white text-[13px]">{order.order_number}</span>
                                <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${badgeClass}`}>
                                  {badgeText}
                                </span>
                                {(() => {
                                  const rr = order.shipping_address?.return_request || returnRequests.find(r => r.order_id === order.id);
                                  const isReturnRequested = ["return_requested", "exchange_requested"].includes(order.order_status) || (rr && ["pending", "under_review"].includes(rr.status));
                                  if (isReturnRequested && rr && rr.evidence_skipped) {
                                    return (
                                      <>
                                        <input
                                          type="file"
                                          multiple
                                          accept="image/*,video/*"
                                          onChange={(e) => handleUploadEvidenceDirect(e, order, rr)}
                                          className="hidden"
                                          id={`badge-evidence-input-${order.id}`}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            document.getElementById(`badge-evidence-input-${order.id}`).click();
                                          }}
                                          disabled={uploadingDirectOrderId === order.id}
                                          className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono bg-accent hover:bg-white hover:text-black text-white transition-all cursor-pointer border-none"
                                        >
                                          {uploadingDirectOrderId === order.id ? "UPLOADING..." : "ADD EVIDENCE"}
                                        </button>
                                      </>
                                    );
                                  }
                                  return null;
                                })()}
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
                                  {(order.order_status === "shipped" || order.order_status === "delivered") && (order.shipping_carrier || order.tracking_number) && (
                                    <div className="mt-4 p-3 bg-zinc-950 border border-zinc-900 space-y-1">
                                      <h5 className="text-accent text-[8px] font-bold uppercase tracking-widest">Shipment Details</h5>
                                      {order.shipping_carrier && (
                                        <p className="text-white text-[10px] font-bold uppercase">
                                          Carrier: {order.shipping_carrier}
                                        </p>
                                      )}
                                      {order.tracking_number && (
                                        <p className="text-zinc-400 text-[10px] font-mono">
                                          Tracking Reference: {order.tracking_number}
                                        </p>
                                      )}
                                      {order.tracking_url && (
                                        <a 
                                          href={order.tracking_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-block text-accent hover:underline text-[9px] uppercase tracking-widest font-bold mt-1"
                                        >
                                          Track Live Shipment →
                                        </a>
                                      )}
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
                                            (Inclusive of GST)
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
                                  {(() => {
                                  const rr = order.shipping_address?.return_request || returnRequests.find(r => r.order_id === order.id);
                                  
                                  if (rr) {
                                    return (
                                      // Request Submitted: Display current request status
                                      <div className="p-4 bg-zinc-950/40 border border-zinc-900/80 rounded-none space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div className="space-y-1">
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                              Request Submitted
                                            </p>
                                            <div className="flex items-center gap-2.5">
                                              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                                                {rr.request_type === "exchange" || rr.type === "exchange"
                                                  ? "Size Exchange"
                                                  : "Product Return"}
                                              </span>
                                              <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                                                rr.status === "approved"
                                                  ? "bg-green-500/10 border border-green-500/20 text-green-500"
                                                  : rr.status === "rejected"
                                                  ? "bg-red-500/10 border border-red-500/20 text-red-500"
                                                  : rr.status === "received"
                                                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-405 text-amber-400"
                                                  : rr.status === "pickup_confirmed"
                                                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                                  : "bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse"
                                              }`}>
                                                {rr.status === "received"
                                                  ? "ITEMS RECEIVED"
                                                  : rr.status === "pickup_confirmed"
                                                  ? "PICKUP SCHEDULED"
                                                  : rr.status?.toUpperCase() || "PENDING REVIEW"}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          <span className="text-[10px] text-zinc-500 font-mono">
                                            {new Date(rr.created_at).toLocaleDateString("en-IN", {
                                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                            })}
                                          </span>
                                        </div>

                                        {/* Inline Nudges (Step 8.8) */}
                                        <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-none text-xs flex flex-col gap-1.5 tracking-wider">
                                          {rr.evidence_skipped ? (
                                            <>
                                              <span className="text-accent font-bold uppercase text-[9px] tracking-widest flex items-center gap-1">
                                                ⚡ Add your unboxing photo/video to unlock priority review.
                                              </span>
                                              <div className="pt-2 flex items-center gap-2">
                                                <input
                                                  type="file"
                                                  multiple
                                                  accept="image/*,video/*"
                                                  onChange={(e) => handleUploadEvidenceDirect(e, order, rr)}
                                                  className="hidden"
                                                  id={`inline-evidence-input-${order.id}`}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => document.getElementById(`inline-evidence-input-${order.id}`).click()}
                                                  disabled={uploadingDirectOrderId === order.id}
                                                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-805 text-white text-[9px] font-bold tracking-widest uppercase hover:border-accent hover:text-accent transition-colors cursor-pointer"
                                                >
                                                  {uploadingDirectOrderId === order.id ? "UPLOADING..." : "UPLOAD EVIDENCE NOW"}
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-green-550 text-green-500 font-bold uppercase text-[9px] tracking-widest">
                                              ✓ Evidence submitted — your request is in priority review.
                                            </span>
                                          )}
                                        </div>

                                        {rr.status === "pickup_confirmed" && rr.expected_pickup_date && (
                                          <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-none text-xs flex flex-col gap-1 tracking-wider">
                                            <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest">
                                              Expected Pickup Date
                                            </span>
                                            <span className="text-accent font-extrabold text-[11px] uppercase">
                                              {new Date(rr.expected_pickup_date).toLocaleDateString("en-IN", {
                                                weekday: "long", day: "numeric", month: "long"
                                              })}
                                            </span>
                                          </div>
                                        )}

                                        {rr.status === "rejected" && rr.admin_notes && (
                                          <div className="p-3 bg-red-950/10 border border-red-900/40 rounded-none text-xs text-red-400 tracking-wider">
                                            <span className="font-bold uppercase text-[9px] block mb-1">Rejection Reason:</span>
                                            {rr.admin_notes}
                                          </div>
                                        )}

                                        <div className="text-[11px] text-zinc-400 tracking-wide leading-relaxed pt-2 border-t border-zinc-900/60">
                                          <span className="font-bold text-zinc-500 uppercase block text-[9px] mb-1">Reason for request:</span>
                                          &quot;{rr.reason_notes || rr.reason}&quot;
                                        </div>

                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                          <span className="text-zinc-500 font-bold block text-[9px] mb-1">Items Requested:</span>
                                          <ul className="list-disc pl-4 space-y-1">
                                            {rr.items?.map((item, idx) => (
                                              <li key={idx} className="text-zinc-400">
                                                {item.name} {item.size && `(${item.size} / ${item.color || "Default"})`} x {item.quantity}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      // Request Eligible: Allow submitting new request
                                      <div>
                                        {(() => {
                                          const orderDate = new Date(order.created_at);
                                          const now = new Date();
                                          const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
                                          const isEligible = order.order_status === "delivered" && diffDays <= 7;
                                          const canCancel = ["pending", "processing", "pending_payment"].includes(order.order_status);

                                          if (isEligible) {
                                            return (
                                              <button
                                                onClick={() => handleOpenReturnModal(order)}
                                                className="px-5 py-2.5 border border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-white hover:text-black hover:border-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer"
                                              >
                                                Initiate Return / Exchange
                                              </button>
                                            );
                                          } else if (canCancel) {
                                            return (
                                              <div className="space-y-3">
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                  This order is awaiting dispatch. You can cancel it before shipment.
                                                </p>
                                                <button
                                                  onClick={() => handleCancelOrder(order)}
                                                  disabled={cancellingOrderId === order.id}
                                                  className="px-5 py-2.5 border border-red-900/60 bg-red-950/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center gap-2"
                                                >
                                                  {cancellingOrderId === order.id ? (
                                                    <>
                                                      <Loader2 className="w-3 h-3 animate-spin" />
                                                      CANCELLING...
                                                    </>
                                                  ) : (
                                                    "Cancel Order"
                                                  )}
                                                </button>
                                              </div>
                                            );
                                          } else {
                                            return (
                                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                {order.order_status === "delivered" 
                                                  ? "Return window closed (7 days from delivery exceeded)"
                                                  : order.order_status === "cancelled"
                                                  ? "This order has been cancelled."
                                                  : "Return window opens only upon successful delivery."
                                                }
                                              </p>
                                            );
                                          }
                                        })()}
                                      </div>
                                    );
                                  }
                                })()}
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
      {/* Upgraded Multi-Step Returns Modal (Step 8.4) */}
      {activeReturnOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-9999 flex items-start justify-center p-4 md:p-8 overflow-y-auto" data-lenis-prevent>
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl relative text-white select-none my-4 md:my-8">
            
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => setActiveReturnOrder(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stepper Header */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono tracking-[0.25em] text-accent uppercase font-bold">
                Returns & Exchanges Desk
              </span>
              <h3 className="text-lg font-bold tracking-widest uppercase flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-accent animate-spin-slow" />
                Initiate Request
              </h3>
              
              {/* Stepper Steps visual tracker */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-b border-zinc-900 pb-4 text-[9px] tracking-wider uppercase font-bold">
                <div className={`border-b-2 pb-1.5 ${returnModalStep >= 1 ? "border-accent text-white" : "border-zinc-800 text-zinc-500"}`}>
                  01. Items & Reason
                </div>
                <div className={`border-b-2 pb-1.5 ${returnAction === "exchange" ? (returnModalStep >= 2 ? "border-accent text-white" : "border-zinc-800 text-zinc-500") : "border-dashed border-zinc-800 text-zinc-600"}`}>
                  02. Replacements
                </div>
                <div className={`border-b-2 pb-1.5 ${returnModalStep >= 3 ? "border-accent text-white" : "border-zinc-800 text-zinc-500"}`}>
                  03. Evidence
                </div>
                <div className={`border-b-2 pb-1.5 ${returnModalStep >= 4 ? "border-accent text-white" : "border-zinc-800 text-zinc-500"}`}>
                  04. Review
                </div>
              </div>
            </div>

            {/* STEP 1: ITEM & REASON SELECTION */}
            {returnModalStep === 1 && (
              <div className="space-y-5 animate-fadeIn duration-300">
                <div className="space-y-2.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                    Select Items to Return/Exchange *
                  </label>
                  <div className="divide-y divide-zinc-900 border border-zinc-900 bg-zinc-950/40 p-4 space-y-3 max-h-48 overflow-y-auto">
                    {activeReturnOrder.order_items?.map((item) => {
                      const prodName = item.product?.name || "Product Item";
                      const prodImg = item.product?.product_images?.[0]?.image_url || "/Images/clothing.jpg";
                      return (
                        <label 
                          key={item.id} 
                          className="flex items-center gap-4 py-2 first:pt-0 last:pb-0 cursor-pointer hover:text-white transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedItems[item.id]}
                            onChange={() => handleReturnCheckboxChange(item.id)}
                            className="accent-accent w-4 h-4 cursor-pointer"
                          />
                          <div className="w-10 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                            <img src={prodImg} alt={prodName} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-zinc-300 uppercase">{prodName}</p>
                            <p className="text-[9px] text-zinc-500 uppercase mt-0.5">
                              {item.variant?.size && `Size: ${item.variant.size}`}
                              {item.variant?.color && ` • Color: ${item.variant.color}`}
                            </p>
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            {item.quantity} x {formatPrice(item.price)}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Return vs Exchange Toggle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400">Action Type *</label>
                    <div className="grid grid-cols-2 border border-zinc-800 p-0.5">
                      <button
                        type="button"
                        onClick={() => setReturnAction("return")}
                        className={`py-2 text-[10px] font-bold tracking-widest uppercase text-center rounded-none transition-colors border-none cursor-pointer ${
                          returnAction === "return" ? "bg-white text-black" : "bg-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Return (Store Credit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnAction("exchange")}
                        className={`py-2 text-[10px] font-bold tracking-widest uppercase text-center rounded-none transition-colors border-none cursor-pointer ${
                          returnAction === "exchange" ? "bg-white text-black" : "bg-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Exchange Sizes
                      </button>
                    </div>
                  </div>

                  {/* Reason Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400">Reason for Request *</label>
                    <select
                      value={returnReasonSelected}
                      onChange={(e) => setReturnReasonSelected(e.target.value)}
                      className="custom-input text-xs tracking-wider py-2.5 px-3 appearance-none rounded-none focus:border-accent"
                    >
                      <option value="damaged">Damaged / Defective</option>
                      <option value="wrong_item">Wrong Item Received</option>
                      <option value="size_fit">Size / Fit Issue</option>
                      <option value="not_as_described">Not As Described</option>
                      <option value="changed_mind">Changed Mind</option>
                    </select>
                  </div>
                </div>

                {/* Reason Dynamic Policy Card */}
                {(() => {
                  const policyDetails = {
                    damaged: { evidence: "Unboxing Video (mandatory) + photos", window: "48–72 hours from delivery", fee: "Free" },
                    wrong_item: { evidence: "Photo of item + packaging label/tag", window: "7 days from delivery", fee: "Free" },
                    size_fit: { evidence: "Photos optional (recommended)", window: "7 days from delivery", fee: "₹50 return shipping charge" },
                    not_as_described: { evidence: "Photos + video comparison", window: "7 days from delivery", fee: "₹50 return shipping charge" },
                    changed_mind: { evidence: "None required", window: "7 days from delivery", fee: "₹50 return shipping charge" }
                  }[returnReasonSelected];

                  const showIncentive = ["damaged", "defective", "wrong_item", "not_as_described"].includes(returnReasonSelected);

                  return (
                    <div className="p-4 bg-zinc-950 border border-zinc-900 space-y-3.5">
                      <div className="grid grid-cols-3 gap-2 text-center text-[9px] uppercase tracking-wider divide-x divide-zinc-900">
                        <div className="space-y-1">
                          <span className="text-zinc-500 font-bold block">Evidence</span>
                          <span className="text-white font-extrabold block normal-case">{policyDetails.evidence}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-zinc-500 font-bold block">Window</span>
                          <span className="text-white font-extrabold block">{policyDetails.window}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-zinc-500 font-bold block">Fee</span>
                          <span className="text-accent font-extrabold block">{policyDetails.fee}</span>
                        </div>
                      </div>

                      {showIncentive && (
                        <p className="text-[10px] text-accent tracking-wide italic font-medium pt-1 border-t border-zinc-900/60 text-center">
                          ⚡ Priority Review Nudge: Submit unboxing evidence now for priority same-day approval. Skipped evidence defaults to standard 2-3 day manual reviews.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Customer Notes */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400">Additional Information / Notes (Optional)</label>
                  <textarea
                    value={returnDescription}
                    onChange={(e) => setReturnDescription(e.target.value)}
                    className="custom-input text-xs tracking-wider py-2 px-3 h-20 resize-none rounded-none focus:border-accent"
                    placeholder="Provide details about size difference, defect locations, or wrong items..."
                  />
                </div>
              </div>
            )}

            {/* STEP 2: EXCHANGE SIZE DETAILS (CONDITIONAL) */}
            {returnModalStep === 2 && (
              <div className="space-y-5 animate-fadeIn duration-300">
                <p className="text-xs text-zinc-400 tracking-wider">
                  Choose your target replacement variant for each selected garment. Real-time warehouse availability is listed.
                </p>

                <div className="space-y-4 divide-y divide-zinc-900">
                  {activeReturnOrder.order_items?.filter(item => selectedItems[item.id]).map((item) => {
                    const prodName = item.product?.name || "Garment";
                    const cachedVariants = productVariantsCache[item.product_id] || [];
                    const selectedValId = targetExchangeVariants[item.id] || "";

                    return (
                      <div key={item.id} className="pt-4 first:pt-0 space-y-3 text-xs tracking-wider">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-white uppercase truncate max-w-[280px]">{prodName}</span>
                          <span className="text-zinc-500 uppercase text-[9px]">Original: Size {item.variant?.size}</span>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Replacement Variant *</label>
                          {cachedVariants.length === 0 ? (
                            <div className="flex items-center gap-2 text-zinc-600 text-[10px] italic py-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" /> Querying variant stock cache...
                            </div>
                          ) : (
                            <select
                              value={selectedValId}
                              onChange={(e) => setTargetExchangeVariants(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="custom-input text-xs tracking-wide py-2.5 px-3 appearance-none rounded-none focus:border-accent"
                            >
                              <option value="">-- SELECT TARGET SIZE/VARIANT --</option>
                              {cachedVariants.map(v => {
                                const isAvailable = v.stock_quantity > 0;
                                return (
                                  <option key={v.id} value={v.id} disabled={!isAvailable}>
                                    Size {v.size} {v.color ? ` - ${v.color}` : ""} ({isAvailable ? `${v.stock_quantity} in stock` : "OUT OF STOCK"})
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: EVIDENCE UPLOAD */}
            {returnModalStep === 3 && (
              <div className="space-y-5 animate-fadeIn duration-300">
                
                {/* Guidelines */}
                <div className="p-4 border border-zinc-900 bg-zinc-950/60 text-xs leading-relaxed tracking-wider space-y-2">
                  <span className="text-accent uppercase font-bold text-[9px] tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" /> CAPTURE CLEAR VALUE — For priority SAME-DAY verification:
                  </span>
                  <ol className="list-decimal pl-4.5 space-y-1 font-light text-zinc-400">
                    <li>Film the sealed package showing the courier details/label clearly</li>
                    <li>Open on camera showing the whole product without any cuts</li>
                    <li>Focus clearly on the specific size label or defect point</li>
                  </ol>
                  <p className="text-[9px] text-zinc-500 italic pt-1 border-t border-zinc-900/60">
                    MIME formats: JPG, PNG, WEBP (Compressed client-side); MP4, MOV, WEBM (Max 60s, 50MB). Limit: 1 video + 5 photos.
                  </p>
                </div>

                {/* Upload Action inputs */}
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex-1 py-4 border border-dashed border-zinc-800 hover:border-accent bg-zinc-950/20 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors select-none">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-zinc-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Choose Files</span>
                      <span className="text-[8px] text-zinc-650 uppercase">Select images or unboxing video</span>
                    </label>
                  </div>
                  {uploadError && (
                    <p className="text-accent text-[10px] font-medium tracking-wider text-center">{uploadError}</p>
                  )}
                </div>

                {/* Preview Grid */}
                <div className="space-y-2">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Selected Evidence Files ({uploadedFiles.length})</span>
                  {uploadedFiles.length === 0 ? (
                    <p className="text-zinc-600 text-[10px] italic py-2">No files selected. Submit unboxing video to enable priority reviews.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-48 overflow-y-auto pr-1">
                      {uploadedFiles.map((fileObj, idx) => (
                        <div key={idx} className="relative aspect-square border border-zinc-900 bg-zinc-950 overflow-hidden shrink-0 group">
                          {fileObj.type.startsWith("image/") ? (
                            <img src={fileObj.preview} alt="Upload" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-[8px] text-zinc-400 uppercase font-bold p-2 text-center gap-1.5">
                              <span className="text-accent">📹 VIDEO</span>
                              <span className="text-zinc-600 truncate max-w-full text-[7px]">{fileObj.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/80 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-none border border-zinc-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & SUBMIT */}
            {returnModalStep === 4 && (
              <div className="space-y-5 animate-fadeIn duration-300">
                <p className="text-xs text-zinc-400 tracking-wider">
                  Review the summary of your claim before submitting.
                </p>

                <div className="border border-zinc-900 bg-zinc-950/40 p-4 space-y-4 text-xs tracking-wider">
                  <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest block mb-0.5">Claim Action</span>
                      <span className="text-white font-extrabold uppercase">
                        {returnAction === "exchange" ? "Size Exchange" : "Return (Refund credit)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest block mb-0.5">Reason</span>
                      <span className="text-white font-extrabold uppercase">{returnReasonSelected.replace("_", " ")}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-zinc-900 pb-3">
                    <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest block">Selected Items</span>
                    <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                      {activeReturnOrder.order_items?.filter(item => selectedItems[item.id]).map(item => {
                        const targetId = targetExchangeVariants[item.id];
                        const cached = productVariantsCache[item.product_id] || [];
                        const selectedVar = cached.find(v => v.id === targetId);

                        return (
                          <li key={item.id}>
                            {item.product?.name} ({item.variant?.size})
                            {returnAction === "exchange" && selectedVar && (
                              <span className="text-accent font-bold"> &rarr; Replacement Size: {selectedVar.size}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest block mb-0.5">Evidence Uploaded</span>
                      <span className="text-white font-extrabold">{uploadedFiles.length} files ({uploadedFiles.filter(f => f.type.startsWith("video/")).length} videos, {uploadedFiles.filter(f => f.type.startsWith("image/")).length} images)</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest block mb-0.5">Logistics return charge</span>
                      <span className="text-accent font-extrabold uppercase">
                        {["size_fit", "changed_mind", "not_as_described"].includes(returnReasonSelected) ? "₹50 (Deducted from credit)" : "FREE"}
                      </span>
                    </div>
                  </div>

                  {/* Bank Details Input conditional on return */}
                  {returnAction === "return" && (
                    <div className="space-y-3.5 pt-1">
                      <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-widest block">Direct Bank Transfer Details (For Refund Cash)</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Account Holder Name *</label>
                          <input
                            type="text"
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            className="custom-input text-xs tracking-wide py-1.5 px-3"
                            placeholder="e.g. Rahul Sharma"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Bank Name *</label>
                          <input
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="custom-input text-xs tracking-wide py-1.5 px-3"
                            placeholder="e.g. State Bank of India"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Account Number *</label>
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="custom-input text-xs tracking-wide py-1.5 px-3"
                            placeholder="Account Number"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">IFSC Code *</label>
                          <input
                            type="text"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value)}
                            className="custom-input text-xs tracking-wide py-1.5 px-3"
                            placeholder="IFSC Code"
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-500 leading-normal italic pt-1 text-justify">
                        * Direct bank transfers are processed only after reverse items successfully reach our warehouse and pass quality evaluations.
                      </p>
                    </div>
                  )}
                </div>

                {uploadingEvidence && (
                  <div className="space-y-2 text-center py-2 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-accent" />
                    <p className="text-[10px] font-mono tracking-widest uppercase text-accent font-semibold">Uploading high-resolution unboxing evidence...</p>
                  </div>
                )}
              </div>
            )}

            {/* Stepper Footer buttons */}
            <div className="flex gap-4 pt-4 border-t border-zinc-900">
              {returnModalStep > 1 && (
                <button
                  type="button"
                  disabled={submittingReturn || uploadingEvidence}
                  onClick={() => {
                    if (returnModalStep === 3 && returnAction === "exchange") {
                      setReturnModalStep(2);
                    } else {
                      setReturnModalStep(returnModalStep - 1);
                    }
                  }}
                  className="px-6 py-3 border border-zinc-800 bg-transparent text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-colors rounded-none w-1/3 disabled:opacity-30 cursor-pointer"
                >
                  Back
                </button>
              )}

              {returnModalStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 py-3 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-colors rounded-none border-none cursor-pointer text-center"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submittingReturn || uploadingEvidence || (returnAction === "return" && (!accountHolder.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim()))}
                  onClick={handleSubmitReturnModal}
                  className="flex-1 py-3 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-colors rounded-none border-none cursor-pointer flex items-center justify-center gap-2 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed"
                >
                  {submittingReturn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting Claim...
                    </>
                  ) : (
                    "Confirm & Submit Request"
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

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

      {/* Custom Confirmation Modal Overlay */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-99999 flex items-center justify-center p-4 animate-fadeIn duration-200">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm p-6 space-y-6 shadow-2xl relative">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                {confirmModal.title || "Confirm Action"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed tracking-wider font-sans normal-case">
                {confirmModal.message}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-1/2 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-550 transition-all rounded-none cursor-pointer bg-transparent"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="w-1/2 py-2 bg-accent text-white text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-all rounded-none cursor-pointer border-none"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </SmoothScroll>
  );
}
