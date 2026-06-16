"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Layers,
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
  Tag,
  FolderOpen,
  Sparkles
} from "lucide-react";

export default function AdminCatalogDesk() {
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states - Products
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    price: "", // In Rupees (will convert to cents)
    sale_price: "", // In Rupees (will convert to cents)
    sku: "",
    stock_quantity: 0,
    category_id: "",
    brand: "CACAPO",
    featured: false,
    status: "draft",
    color: ""
  });
  const [productImages, setProductImages] = useState([""]); // Array of image URLs
  const [productVariants, setProductVariants] = useState([]); // Array of { size, color, price, sale_price, stock_quantity, sku }

  // Form states - Categories
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    parent_id: ""
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (catError) throw catError;
      setCategories(catData || []);

      // 2. Fetch products joined with images and variants
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select(`
          *,
          product_images (image_url, sort_order),
          product_variants (id, size, color, price, sale_price, stock_quantity, sku)
        `)
        .order("created_at", { ascending: false });

      if (prodError) throw prodError;
      setProducts(prodData || []);

    } catch (err) {
      console.error("Failed to load catalog data:", err);
      setError(err.message || "Could not retrieve catalog data from the database.");
    } finally {
      setLoading(false);
    }
  };

  // Slug generator helpers
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleProductNameChange = (e) => {
    const name = e.target.value;
    setProductForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleCategoryNameChange = (e) => {
    const name = e.target.value;
    setCategoryForm(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size exceeds 5MB limit.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `category-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from("categories")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message?.includes("bucket not found") || uploadError.error === "Bucket not found") {
          throw new Error("Supabase Storage bucket 'categories' not found. Please create a public bucket named 'categories' in your Supabase dashboard.");
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("categories")
        .getPublicUrl(filePath);

      setCategoryForm((prev) => ({
        ...prev,
        image_url: publicUrl
      }));

    } catch (err) {
      console.error("Image upload failed:", err);
      alert(err.message || "Failed to upload image. Make sure storage bucket 'categories' is created and set to public.");
    } finally {
      setUploading(false);
    }
  };

  // Image inputs helpers
  const handleRemoveImageField = (index) => {
    setProductImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMakePrimary = (index) => {
    setProductImages(prev => {
      const updated = [...prev];
      const [target] = updated.splice(index, 1);
      updated.unshift(target);
      return updated;
    });
  };

  const handleProductImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingProductImage(true);
    try {
      const uploadedUrls = [...productImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          alert(`Image "${file.name}" exceeds 5MB limit and will be skipped.`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `product-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("products")
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          if (uploadError.message?.includes("bucket not found") || uploadError.error === "Bucket not found") {
            throw new Error("Supabase Storage bucket 'products' not found. Please create a public bucket named 'products' in your Supabase dashboard.");
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("products")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
      setProductImages(uploadedUrls);
    } catch (err) {
      console.error("Product image upload failed:", err);
      alert(err.message || "Failed to upload image. Make sure storage bucket 'products' is created and set to public.");
    } finally {
      setUploadingProductImage(false);
    }
  };

  // Variant helpers
  const handleAddVariantField = () => {
    setProductVariants(prev => [
      ...prev,
      { size: "", color: "", price: "", sale_price: "", stock_quantity: 0, sku: "" }
    ]);
  };

  const handleRemoveVariantField = (index) => {
    setProductVariants(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleVariantChange = (index, field, value) => {
    setProductVariants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Open product modal for Add
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProductForm({
      name: "",
      slug: "",
      description: "",
      short_description: "",
      price: "",
      sale_price: "",
      sku: "",
      stock_quantity: 0,
      category_id: categories[0]?.id || "",
      brand: "CACAPO",
      featured: false,
      status: "draft",
      color: ""
    });
    setProductImages([]);
    setProductVariants([]);
    setShowProductModal(true);
  };

  // Open product modal for Edit
  const handleOpenEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name,
      slug: prod.slug,
      description: prod.description || "",
      short_description: prod.short_description || "",
      price: (prod.price / 100).toString(),
      sale_price: prod.sale_price ? (prod.sale_price / 100).toString() : "",
      sku: prod.sku || "",
      stock_quantity: prod.stock_quantity,
      category_id: prod.category_id || "",
      brand: prod.brand || "CACAPO",
      featured: prod.featured || false,
      status: (prod.status === "active" || prod.status === "draft") ? prod.status : "draft",
      color: prod.product_variants?.[0]?.color || ""
    });
    
    // Set Images
    const imgs = prod.product_images?.length > 0 
      ? prod.product_images.map(img => img.image_url) 
      : [];
    setProductImages(imgs);

    // Set Variants
    const vars = prod.product_variants?.length > 0
      ? prod.product_variants.map(v => ({
          size: v.size || "",
          color: v.color || "",
          price: v.price ? (v.price / 100).toString() : "",
          sale_price: v.sale_price ? (v.sale_price / 100).toString() : "",
          stock_quantity: v.stock_quantity,
          sku: v.sku || ""
        }))
      : [];
    setProductVariants(vars);

    setShowProductModal(true);
  };

  // Submit Product form
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const priceCents = Math.round(parseFloat(productForm.price) * 100);
      const salePriceCents = productForm.sale_price ? Math.round(parseFloat(productForm.sale_price) * 100) : null;

      if (isNaN(priceCents) || priceCents <= 0) {
        throw new Error("Please enter a valid product price.");
      }

      if (salePriceCents !== null && salePriceCents >= priceCents) {
        throw new Error("Sale price must be lower than the regular price.");
      }

      const prodPayload = {
        name: productForm.name.trim(),
        slug: productForm.slug.trim(),
        description: productForm.description.trim(),
        short_description: productForm.short_description.trim(),
        price: priceCents,
        sale_price: salePriceCents,
        sku: productForm.sku.trim() || null,
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        category_id: productForm.category_id || null,
        brand: productForm.brand.trim() || "CACAPO",
        featured: productForm.featured,
        status: productForm.status,
        updated_at: new Date().toISOString()
      };

      let productId = editingProductId;

      if (editingProductId) {
        // Update product
        const { error: updateErr } = await supabase
          .from("products")
          .update(prodPayload)
          .eq("id", editingProductId);

        if (updateErr) throw updateErr;
      } else {
        // Insert product
        const { data: newProd, error: insertErr } = await supabase
          .from("products")
          .insert({ ...prodPayload, created_at: new Date().toISOString() })
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        productId = newProd.id;
      }

      // Sync Images: Clear and insert
      const { error: deleteImgsError } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);

      if (deleteImgsError) throw deleteImgsError;

      const validImages = productImages
        .map(url => url.trim())
        .filter(url => url !== "");

      if (validImages.length > 0) {
        const imgRows = validImages.map((url, index) => ({
          product_id: productId,
          image_url: url,
          sort_order: index
        }));

        const { error: insertImgsError } = await supabase
          .from("product_images")
          .insert(imgRows);

        if (insertImgsError) throw insertImgsError;
      }

      // Sync Variants: Clear and insert
      const { error: deleteVarsError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);

      if (deleteVarsError) throw deleteVarsError;

      const validVariants = productVariants.map(v => {
        const vPrice = v.price ? Math.round(parseFloat(v.price) * 100) : null;
        const vSalePrice = v.sale_price ? Math.round(parseFloat(v.sale_price) * 100) : null;
        return {
          product_id: productId,
          size: v.size.trim() || null,
          color: productForm.color.trim().toUpperCase() || null,
          price: vPrice,
          sale_price: vSalePrice,
          stock_quantity: parseInt(v.stock_quantity) || 0,
          sku: v.sku.trim() || null
        };
      });

      if (validVariants.length > 0) {
        const { error: insertVarsError } = await supabase
          .from("product_variants")
          .insert(validVariants);

        if (insertVarsError) throw insertVarsError;
      }

      alert("Product successfully updated.");
      setShowProductModal(false);
      await fetchData();

    } catch (err) {
      alert("Failed to save product: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product? All related images and variants will be deleted automatically.")) return;
    try {
      const { error: delErr } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;
      await fetchData();
    } catch (err) {
      alert("Failed to delete product: " + err.message);
    }
  };

  // Open category modal for Add
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      parent_id: ""
    });
    setShowCategoryModal(true);
  };

  // Open category modal for Edit
  const handleOpenEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image_url: cat.image_url || "",
      parent_id: cat.parent_id || ""
    });
    setShowCategoryModal(true);
  };

  // Submit Category Form
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const catPayload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        description: categoryForm.description.trim(),
        image_url: categoryForm.image_url.trim() || null,
        parent_id: categoryForm.parent_id || null
      };

      if (editingCategoryId) {
        if (editingCategoryId === categoryForm.parent_id) {
          throw new Error("A category cannot be its own parent.");
        }

        const { error: updateErr } = await supabase
          .from("categories")
          .update(catPayload)
          .eq("id", editingCategoryId);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("categories")
          .insert({ ...catPayload, created_at: new Date().toISOString() });

        if (insertErr) throw insertErr;
      }

      alert("Category successfully updated.");
      setShowCategoryModal(false);
      await fetchData();

    } catch (err) {
      alert("Failed to save category: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category? Products linked to this category will have category set to null.")) return;
    try {
      const { error: delErr } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;
      await fetchData();
    } catch (err) {
      alert("Failed to delete category: " + err.message);
    }
  };

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format((cents || 0) / 100);
  };

  // Filter products by search terms
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter categories by search terms
  const filteredCategories = categories.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Catalog Management
          </h1>
        </div>

        <button
          onClick={activeTab === "products" ? handleOpenAddProduct : handleOpenAddCategory}
          className="px-5 py-2.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 rounded-none cursor-pointer border-none"
        >
          <Plus className="w-4 h-4" /> Add {activeTab === "products" ? "Product" : "Category"}
        </button>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        
        {/* Tab switchers */}
        <div className="flex gap-2 text-[10px] font-bold tracking-widest uppercase">
          <button
            onClick={() => { setActiveTab("products"); setSearchTerm(""); }}
            className={`px-5 py-2.5 transition-all duration-300 rounded-none border flex items-center gap-2 ${
              activeTab === "products"
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Products ({products.length})
          </button>
          <button
            onClick={() => { setActiveTab("categories"); setSearchTerm(""); }}
            className={`px-5 py-2.5 transition-all duration-300 rounded-none border flex items-center gap-2 ${
              activeTab === "categories"
                ? "border-accent bg-accent/5 text-accent"
                : "border-zinc-800 bg-zinc-950/20 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Categories ({categories.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder={activeTab === "products" ? "Search products by SKU, title..." : "Search categories..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        </div>

      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Fetching files...</span>
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 text-red-500 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-xs tracking-wider font-semibold uppercase">{error}</p>
        </div>
      ) : activeTab === "products" ? (
        
        /* PRODUCTS LIST TABLE */
        filteredProducts.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
            No products registered in the inventory yet.
          </div>
        ) : (
          <div className="border border-zinc-900 bg-black overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs tracking-wider">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-bold uppercase">
                  <th className="p-4 w-16">Image</th>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Name</th>
                  <th className="p-4 text-right">Price</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredProducts.map(prod => {
                  const thumb = prod.product_images?.[0]?.image_url || "/Images/clothing.jpg";
                  const catName = categories.find(c => c.id === prod.category_id)?.name || "-";

                  return (
                    <tr key={prod.id} className="hover:bg-zinc-950/20 transition-colors">
                      <td className="p-4">
                        <div className="w-10 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                          <img src={thumb} alt={prod.name} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-zinc-400">{prod.sku || "N/A"}</td>
                      <td className="p-4 font-bold text-white uppercase">{prod.name}</td>
                      <td className="p-4 text-right font-bold text-accent">{formatPrice(prod.price)}</td>
                      <td className="p-4 text-center font-semibold">
                        <span className={prod.stock_quantity === 0 ? "text-red-500" : ""}>
                          {prod.stock_quantity}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-400 font-medium uppercase">{catName}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 font-mono ${
                          prod.status === "active" 
                            ? "bg-green-500/10 border border-green-500/20 text-green-500"
                            : prod.status === "draft"
                              ? "bg-zinc-800 border border-zinc-700 text-zinc-400"
                              : "bg-red-500/10 border border-red-500/20 text-red-400"
                        }`}>
                          {prod.status?.toUpperCase() || "DRAFT"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => handleOpenEditProduct(prod)}
                            className="text-zinc-500 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
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
        )

      ) : (

        /* CATEGORIES LIST TABLE */
        filteredCategories.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
            No categories registered in the system yet.
          </div>
        ) : (
          <div className="border border-zinc-900 bg-black overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] text-xs tracking-wider">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-bold uppercase">
                  <th className="p-4 w-16">Asset</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Parent Category</th>
                  <th className="p-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredCategories.map(cat => {
                  const parentName = categories.find(c => c.id === cat.parent_id)?.name || "-";
                  const thumb = cat.image_url || "/Images/accessories.jpg";

                  return (
                    <tr key={cat.id} className="hover:bg-zinc-950/20 transition-colors">
                      <td className="p-4">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden relative">
                          <img src={thumb} alt={cat.name} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-zinc-400">{cat.slug}</td>
                      <td className="p-4 font-bold text-white uppercase">{cat.name}</td>
                      <td className="p-4 text-zinc-500 truncate max-w-[200px]">{cat.description || "-"}</td>
                      <td className="p-4 text-zinc-400 font-medium uppercase">{parentName}</td>
                      <td className="p-4 text-center">
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => handleOpenEditCategory(cat)}
                            className="text-zinc-500 hover:text-white transition-colors p-1 bg-transparent border-none cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
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
        )
      )}

      {/* PRODUCT FORM MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-4xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 border-none bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-lg font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                {editingProductId ? "Update Product Details" : "Create New Product"}
              </h2>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-6 text-xs tracking-wider">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Side fields */}
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Product Title *</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={handleProductNameChange}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                      placeholder="e.g. SILK COUTURE TRENCH"
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={productForm.slug}
                      onChange={(e) => setProductForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                      placeholder="silk-couture-trench"
                    />
                  </div>

                  {/* Brand, SKU & Color */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Brand *</label>
                      <input
                        type="text"
                        required
                        value={productForm.brand}
                        onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Master SKU</label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                        placeholder="CAC-SILK-01"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Product Color *</label>
                      <input
                        type="text"
                        required
                        value={productForm.color}
                        onChange={(e) => setProductForm(prev => ({ ...prev, color: e.target.value.toUpperCase() }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                        placeholder="e.g. BLACK"
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Regular Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                        placeholder="1850.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sale Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.sale_price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, sale_price: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                        placeholder="Optional sale override"
                      />
                    </div>
                  </div>

                  {/* Category & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Category *</label>
                      <select
                        value={productForm.category_id}
                        onChange={(e) => setProductForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all uppercase font-semibold text-[11px]"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stock Status *</label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all uppercase font-semibold text-[11px]"
                      >
                        <option value="active">Available</option>
                        <option value="draft">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  {/* Basic fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Base Stock Quantity *</label>
                        <span className={`text-[8px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 font-mono ${
                          productForm.stock_quantity > 0 
                            ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {productForm.stock_quantity > 0 ? "In Stock (Available)" : "Out of Stock"}
                        </span>
                      </div>
                      <input
                        type="number"
                        required
                        value={productForm.stock_quantity.toString()}
                        onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <label className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer text-zinc-400 hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={productForm.featured}
                          onChange={(e) => setProductForm(prev => ({ ...prev, featured: e.target.checked }))}
                          className="accent-accent w-4 h-4 cursor-pointer"
                        />
                        New Arrival
                      </label>
                    </div>
                  </div>

                </div>

                {/* Right Side Fields: Images and Descriptions */}
                <div className="space-y-4">
                  {/* Short Description */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Short Description *</label>
                    <textarea
                      required
                      value={productForm.short_description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, short_description: e.target.value }))}
                      rows="2"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all resize-none"
                      placeholder="A short punchy line for catalog listing."
                    />
                  </div>

                  {/* Full Description */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Detailed Description *</label>
                    <textarea
                      required
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      rows="4"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all resize-none"
                      placeholder="Write architectural design parameters, fabric properties, care instructions."
                    />
                  </div>

                  {/* Product Image Gallery Uploader */}
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 border-b border-zinc-900 pb-1.5">
                      <ImageIcon className="w-4 h-4 text-accent" /> Product Image Gallery
                    </label>

                    <div className="grid grid-cols-4 gap-2">
                      {productImages.map((url, index) => (
                        <div key={index} className="relative aspect-[3/4] bg-zinc-900 border border-zinc-800 overflow-hidden group">
                          <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                          
                          {/* Primary Badge */}
                          {index === 0 && (
                            <span className="absolute top-1.5 left-1.5 bg-accent text-white text-[7px] font-extrabold tracking-widest px-1.5 py-0.5 uppercase z-10 font-mono">
                              Primary
                            </span>
                          )}

                          {/* Hover Action Overlay */}
                          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-1">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMakePrimary(index)}
                                className="px-2 py-1 bg-white text-black hover:bg-accent hover:text-white text-[8px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer border-none"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImageField(index)}
                              className="text-zinc-400 hover:text-accent p-1 cursor-pointer bg-transparent border-none flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Image Upload Card */}
                      <label className="relative aspect-[3/4] border border-zinc-800 hover:border-accent bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors flex flex-col items-center justify-center cursor-pointer border-dashed group min-h-[90px]">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleProductImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          disabled={uploadingProductImage}
                        />
                        {uploadingProductImage ? (
                          <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-zinc-500 group-hover:text-zinc-300 transition-colors text-center p-1">
                            <Plus className="w-4 h-4 text-zinc-500 group-hover:text-accent transition-colors" />
                            <span className="text-[8px] font-bold uppercase tracking-wider block">Upload</span>
                            <span className="text-[7px] text-zinc-600 block">WEBP/JPEG</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                </div>

              </div>

              {/* Dynamic Variants Editor Section */}
              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-accent animate-pulse" /> Sizing & Variant Inventory mapping
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddVariantField}
                    className="text-[9px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                  >
                    + Add Size Variant
                  </button>
                </div>

                {productVariants.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 tracking-wider">No variants defined. Master stock count is used.</p>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {productVariants.map((v, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-3 border border-zinc-900 relative">
                        
                        {/* Size */}
                        <div className="w-16 space-y-1">
                          <span className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Size</span>
                          <input
                            type="text"
                            placeholder="S, M, 38"
                            value={v.size}
                            onChange={(e) => handleVariantChange(index, "size", e.target.value.toUpperCase())}
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1 text-white outline-none rounded-none"
                            required
                          />
                        </div>



                        {/* Price */}
                        <div className="w-24 space-y-1">
                          <span className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Override Price (₹)</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            value={v.price}
                            onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1 text-white outline-none rounded-none font-mono"
                          />
                        </div>

                        {/* Sale Price */}
                        <div className="w-24 space-y-1">
                          <span className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Override Sale (₹)</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            value={v.sale_price}
                            onChange={(e) => handleVariantChange(index, "sale_price", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1 text-white outline-none rounded-none font-mono"
                          />
                        </div>

                        {/* Stock */}
                        <div className="w-20 space-y-1">
                          <span className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Stock count</span>
                          <input
                            type="number"
                            value={v.stock_quantity.toString()}
                            onChange={(e) => handleVariantChange(index, "stock_quantity", parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1 text-white outline-none rounded-none font-mono"
                            required
                          />
                        </div>

                        {/* SKU */}
                        <div className="flex-1 min-w-[120px] space-y-1">
                          <span className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">Variant SKU</span>
                          <input
                            type="text"
                            placeholder="Unique variant sku"
                            value={v.sku}
                            onChange={(e) => handleVariantChange(index, "sku", e.target.value.toUpperCase())}
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs px-2 py-1 text-white outline-none rounded-none font-mono"
                          />
                        </div>

                        {/* Delete variant */}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantField(index)}
                          className="text-zinc-500 hover:text-accent p-1 shrink-0 self-end mb-1 cursor-pointer bg-transparent border-none"
                        >
                          <X className="w-4 h-4" />
                        </button>

                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form CTAs */}
              <div className="flex gap-4 pt-4 border-t border-zinc-900 justify-end">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-6 py-2.5 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all rounded-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all rounded-none flex items-center justify-center gap-1.5 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer border-none"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CATEGORY FORM MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1 border-none bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-md font-extrabold uppercase tracking-widest text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-accent" />
                {editingCategoryId ? "Update Category Details" : "Create New Category"}
              </h2>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 text-xs tracking-wider">
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={handleCategoryNameChange}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                  placeholder="e.g. APPAREL"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none font-mono transition-all"
                  placeholder="apparel"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="2"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all resize-none"
                  placeholder="Explain collections inside this category"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Collection Thumbnail Image</label>
                {categoryForm.image_url ? (
                  <div className="relative border border-zinc-800 bg-zinc-950 p-2 flex items-center justify-between gap-4">
                    <img 
                      src={categoryForm.image_url} 
                      alt="Category preview" 
                      className="w-16 h-16 object-cover border border-zinc-800"
                    />
                    <div className="flex-1 truncate">
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">Uploaded URL</span>
                      <span className="block text-[9px] font-mono text-zinc-400 truncate mt-0.5">{categoryForm.image_url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategoryForm(prev => ({ ...prev, image_url: "" }))}
                      className="p-1.5 border border-zinc-800 hover:border-accent hover:text-accent text-zinc-400 transition-colors bg-zinc-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors py-6 flex flex-col items-center justify-center cursor-pointer border-dashed group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={uploading}
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Uploading Asset...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        <ImageIcon className="w-5 h-5 text-zinc-600 group-hover:text-accent transition-colors" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Select & Upload Image</span>
                        <span className="text-[8px] text-zinc-600 block">PNG, JPG, or WEBP up to 5MB</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Parent Category Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Parent Category</label>
                <select
                  value={categoryForm.parent_id}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, parent_id: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all uppercase font-semibold text-[10px]"
                >
                  <option value="">None (Root Category)</option>
                  {categories
                    .filter(c => c.id !== editingCategoryId) // Exclude current category to prevent circular reference
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              {/* Form CTAs */}
              <div className="flex gap-3 pt-4 border-t border-zinc-900 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-5 py-2 border border-zinc-800 text-white text-[10px] font-bold tracking-widest uppercase hover:border-zinc-600 transition-all rounded-none bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-white text-black text-[10px] font-bold tracking-widest uppercase hover:bg-accent hover:text-white transition-all rounded-none flex items-center justify-center gap-1.5 disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer border-none"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Category"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
