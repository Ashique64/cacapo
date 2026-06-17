"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ShoppingBag, Heart, SlidersHorizontal, Search, ArrowUpDown, X, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Header/Navbar";
import SmoothScroll from "@/components/providers/SmoothScroll";

function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const wishlistItems = useWishlistStore((state) => state.items);
  
  const isWishlisted = wishlistItems.some((item) => item.id === product.id);
  const images = product.images && product.images.length > 0 ? product.images : ["/Images/clothing.jpg"];
  const hasVariants = product.variants && product.variants.length > 0;
  const variantHasStock = hasVariants && product.variants.some((v) => v.stock_quantity > 0);
  const isCardOutOfStock = product.status === "draft" || (hasVariants ? !variantHasStock : product.stock_quantity <= 0);
  const activePrice = product.sale_price ? product.sale_price : product.price;
  const originalPrice = product.sale_price ? product.price : null;

  const displayPrice = (activePrice / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const displayOriginalPrice = originalPrice ? (originalPrice / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) : null;

  useEffect(() => {
    if (!isHovered) {
      setCurrentImageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHovered, images]);

  const handleAddBag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    addItem(product, defaultVariant, 1, user?.id);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="shrink-0 w-full flex flex-col bg-zinc-950 relative overflow-hidden group transition-all duration-500"
    >
      {/* Product Image — tall, image-dominant */}
      <div className="w-full aspect-3/4 overflow-hidden relative">
        <Link href={`/shop/${product.slug}`} className="block w-full h-full">
          <div
            className="flex h-full w-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={product.name}
                className="w-full h-full object-cover shrink-0 transform scale-100 group-hover:scale-105 transition-transform duration-700"
              />
            ))}
          </div>

          {/* Sold Out Overlay */}
          {isCardOutOfStock && (
            <span className="absolute top-2.5 left-2.5 bg-black/85 border border-red-500/30 text-red-500 text-[8px] font-extrabold tracking-widest px-2 py-0.5 uppercase z-10 font-mono">
              Sold Out
            </span>
          )}

          {/* Hover overlay with VIEW DETAILS — hidden on mobile, visible on hover for md+ */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-end justify-center pb-5 z-10">
            <span
              className="px-5 py-2 text-[10px] font-semibold tracking-[0.2em] uppercase transition-all duration-300 bg-white text-black hover:bg-accent hover:text-white"
            >
              {isCardOutOfStock ? "VIEW DETAILS" : "VIEW DETAILS"}
            </span>
          </div>
        </Link>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 backdrop-blur-sm border border-white/10 hover:border-accent/50 rounded-full text-white hover:text-accent transition-all duration-300 cursor-pointer active:scale-90"
        >
          <Heart className={`w-3 h-3 ${isWishlisted ? "fill-accent text-accent" : "fill-transparent"}`} />
        </button>
      </div>

      {/* Info Row — compact, below image */}
      <div className="px-1.5 pt-2 pb-3">
        <Link href={`/shop/${product.slug}`} className="block">
          <h3 className="text-[11px] sm:text-xs font-medium tracking-wide text-zinc-200 truncate leading-tight">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[10px] font-sans text-zinc-400">₹</span>
          <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-100">{displayPrice}</span>
          {displayOriginalPrice && (
            <span className="text-[9px] font-semibold font-mono text-zinc-500 line-through">
              ₹{displayOriginalPrice}
            </span>
          )}
        </div>

        {/* VIEW DETAILS — mobile only, below price */}
        <Link
          href={`/shop/${product.slug}`}
          className="mt-2 w-full py-1.5 text-[9px] font-semibold tracking-[0.18em] transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer md:hidden bg-zinc-900 border border-zinc-800 text-white active:bg-white active:text-black text-center"
        >
          {isCardOutOfStock ? "VIEW DETAILS" : "VIEW DETAILS"}
        </Link>
      </div>
    </div>
  );
}

function ShopContent() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState(400000); // Default ₹4,000 in cents, dynamically adjusted later
  const [maxPriceLimit, setMaxPriceLimit] = useState(400000); // Dynamic maximum price limit
  const [sortBy, setSortBy] = useState("newest");

  // Mobile Drawer Toggles
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileSort, setShowMobileSort] = useState(false);

  // Read ?category= query param from URL
  const searchParams = useSearchParams();
  const categoryParam = searchParams ? searchParams.get("category") : null;

  // Pagination
  const ITEMS_PER_PAGE = 12; // desktop: 3cols × 4rows | mobile: 2cols × 6rows
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch Categories
        let { data: catData } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        // Fetch Products with variants
        let { data: prodData } = await supabase
          .from("products")
          .select(`
            *,
            product_images(image_url, sort_order),
            product_variants(*)
          `)
          .in("status", ["active", "draft"]);

        // Set state or fallback to Empty arrays
        if (catData && catData.length > 0) {
          setCategories([
            { id: "all", name: "All Collections", slug: "all" },
            ...catData
          ]);
        } else {
          setCategories([{ id: "all", name: "All Collections", slug: "all" }]);
        }

        if (prodData && prodData.length > 0) {
          // Format product layout to match component structure
          const formatted = prodData.map(p => ({
            ...p,
            images: p.product_images
              ? p.product_images.sort((a,b) => a.sort_order - b.sort_order).map(img => img.image_url)
              : [],
            variants: p.product_variants || []
          }));
          setProducts(formatted);

          // Dynamically compute maximum price
          const maxPrice = Math.max(...formatted.map(p => p.price));
          setMaxPriceLimit(maxPrice);
          setPriceRange(maxPrice);
        } else {
          setProducts([]);
          setMaxPriceLimit(400000); // Default 4000.00
          setPriceRange(400000);
        }
      } catch (err) {
        console.error("Error loading products:", err);
        setProducts([]);
        setCategories([{ id: "all", name: "All Collections", slug: "all" }]);
        setMaxPriceLimit(400000);
        setPriceRange(400000);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Pre-filter by ?category= URL query param once categories are loaded
  useEffect(() => {
    if (!categoryParam || categories.length === 0) return;
    // Try exact id match first (e.g. "cat-clothing" or a UUID)
    const byId = categories.find((c) => c.id === categoryParam);
    if (byId) {
      setSelectedCategory(byId.id);
      return;
    }
    // Try matching by slug field (Supabase categories have a slug column)
    const bySlug = categories.find((c) => c.slug === categoryParam);
    if (bySlug) {
      setSelectedCategory(bySlug.id);
    }
  }, [categories, categoryParam]);

  // Filter & Sort Application
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      
      // Category Mapping Match (works for UUIDs as well as MOCK slugs)
      let matchesCategory = true;
      if (selectedCategory !== "all") {
        if (selectedCategory.startsWith("cat-")) {
          // Mock data matching
          matchesCategory = product.category_id === selectedCategory;
        } else {
          // Supabase UUID matching
          matchesCategory = product.category_id === selectedCategory;
        }
      }

      const matchesPrice = product.price <= priceRange;

      return matchesSearch && matchesCategory && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") {
        if (a.price !== b.price) return a.price - b.price;
      } else if (sortBy === "price-desc") {
        if (a.price !== b.price) return b.price - a.price;
      } else if (sortBy === "featured") {
        const featA = a.featured ? 1 : 0;
        const featB = b.featured ? 1 : 0;
        if (featA !== featB) return featB - featA;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setPriceRange(maxPriceLimit);
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Reset to page 1 whenever filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, priceRange, sortBy]);

  // Pagination slice
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <SmoothScroll>
      <Navbar />
      <div className="bg-black text-white min-h-screen pt-24 px-6 md:px-12 select-none">
        {/* Title Header */}
        <div className="max-w-7xl mx-auto border-b border-zinc-900 pb-8 mb-8">
          <span className="text-[10px] font-semibold tracking-[0.4em] text-accent uppercase block mb-2">
            THE CATALOGUE
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white uppercase font-sans">
            EXPLORE <span className="text-accent">PIECES</span>
          </h1>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-24">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28 space-y-8">
              {/* Search */}
              <div>
                <h3 className="text-xs font-bold tracking-widest text-zinc-400 mb-3 uppercase">Search</h3>
                <div className="relative flex items-center border-b border-zinc-800 focus-within:border-accent transition-colors duration-300 py-1.5">
                  <input
                    type="text"
                    placeholder="SEARCH ARCHIVE..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-xs tracking-wider font-light placeholder-zinc-700 focus:outline-none w-full uppercase"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-xs font-bold tracking-widest text-zinc-400 mb-4 uppercase">Collections</h3>
                <div className="flex flex-col gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-left text-xs tracking-widest uppercase transition-colors duration-300 hover:text-accent cursor-pointer ${
                        selectedCategory === cat.id ? "text-accent font-semibold" : "text-zinc-500"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h3 className="text-xs font-bold tracking-widest text-zinc-400 mb-4 uppercase">
                  Max Price: <span className="text-accent font-mono">₹{(priceRange / 100).toLocaleString("en-IN")}</span>
                </h3>
                <input
                  type="range"
                  min="50000" // ₹500 in cents
                  max={maxPriceLimit} // Dynamic max price
                  step={Math.max(25000, Math.floor((maxPriceLimit - 50000) / 20))} // Proportional steps
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-accent bg-zinc-900 cursor-pointer h-1 rounded-none appearance-none"
                />
                <div className="flex justify-between text-[9px] tracking-widest text-zinc-600 font-mono mt-2">
                  <span>₹500</span>
                  <span>₹{(maxPriceLimit / 100).toLocaleString("en-IN")}</span>
                </div>
              </div>
              
              {/* Reset */}
              <button
                onClick={resetFilters}
                className="text-[10px] font-semibold tracking-widest text-zinc-400 hover:text-white uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                RESET FILTERS
              </button>
            </div>
          </aside>

          {/* Mobile Filter & Sort Triggers */}
          <div className="flex lg:hidden items-center gap-2 border-b border-zinc-900 pb-3 mb-4">
            {/* Filter Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 border text-[10px] tracking-[0.15em] uppercase font-semibold transition-all duration-300 cursor-pointer ${
                selectedCategory !== "all" || priceRange < maxPriceLimit || search
                  ? "border-accent text-accent bg-accent/5"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filters
              {(selectedCategory !== "all" || priceRange < maxPriceLimit || search) && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>

            {/* Sort Button */}
            <button
              onClick={() => setShowMobileSort(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 border text-[10px] tracking-[0.15em] uppercase font-semibold transition-all duration-300 cursor-pointer ${
                sortBy !== "featured"
                  ? "border-accent text-accent bg-accent/5"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              Sort
              {sortBy !== "featured" && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          </div>

          {/* Product Cards Container */}
          <div className="grow">
            {/* Desktop Sort Header */}
            <div className="hidden lg:flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <span className="text-[10px] tracking-widest text-zinc-500 font-mono uppercase">
                {filteredProducts.length} Piece{filteredProducts.length !== 1 && "s"} Found
              </span>
              <div className="flex items-center gap-6">
                <span className="text-[10px] tracking-widest text-zinc-500 uppercase">Sort By</span>
                <div className="flex gap-4">
                  {[
                    { id: "featured", label: "Featured" },
                    { id: "price-asc", label: "Price: Low to High" },
                    { id: "price-desc", label: "Price: High to Low" },
                    { id: "newest", label: "Newest" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={`text-[10px] tracking-widest uppercase transition-colors duration-300 hover:text-white cursor-pointer ${
                        sortBy === option.id ? "text-accent font-semibold" : "text-zinc-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-xs tracking-[0.2em] font-mono">LOADING PIECES...</span>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-10 select-none">
                  {/* Prev */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 flex items-center justify-center border text-[10px] tracking-widest font-mono transition-all duration-300 ${
                      currentPage === 1
                        ? "border-zinc-800 text-zinc-700 cursor-not-allowed"
                        : "border-zinc-700 text-zinc-400 hover:border-white hover:text-white cursor-pointer"
                    }`}
                  >
                    ←
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current ±1, and ellipsis
                    const show =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;
                    const showEllipsisBefore =
                      page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter =
                      page === currentPage + 2 && currentPage < totalPages - 2;

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={`ellipsis-${page}`} className="w-8 h-8 flex items-center justify-center text-zinc-600 text-[10px] font-mono">
                          ···
                        </span>
                      );
                    }
                    if (!show) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 flex items-center justify-center border text-[10px] tracking-widest font-mono transition-all duration-300 cursor-pointer ${
                          currentPage === page
                            ? "border-accent bg-accent/10 text-accent font-semibold"
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-white"
                        }`}
                      >
                        {String(page).padStart(2, "0")}
                      </button>
                    );
                  })}

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-8 h-8 flex items-center justify-center border text-[10px] tracking-widest font-mono transition-all duration-300 ${
                      currentPage === totalPages
                        ? "border-zinc-800 text-zinc-700 cursor-not-allowed"
                        : "border-zinc-700 text-zinc-400 hover:border-white hover:text-white cursor-pointer"
                    }`}
                  >
                    →
                  </button>
                </div>
              )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-500 border border-zinc-900/60 p-8">
                <span className="text-xs tracking-[0.2em] font-mono mb-4 uppercase">NO PIECES MATCH SEARCH CRITERIA</span>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 border border-zinc-800 text-[10px] tracking-widest hover:border-white hover:text-white transition-all uppercase cursor-pointer"
                >
                  RESET ALL FILTERS
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Bottom Sheet */}
        {showMobileFilters && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            />
            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl lg:hidden"
              style={{ maxHeight: "85vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
                <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">Filter Pieces</span>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto no-scrollbar px-5 py-5 space-y-7" style={{ maxHeight: "calc(85vh - 130px)" }}>
                {/* Search */}
                <div>
                  <h3 className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 mb-3 uppercase">Search</h3>
                  <div className="flex items-center border border-zinc-800 focus-within:border-accent transition-colors duration-300 px-3 py-2.5 gap-2">
                    <Search className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <input
                      type="text"
                      placeholder="SEARCH ARCHIVE..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-transparent text-xs tracking-wider font-light placeholder-zinc-700 focus:outline-none w-full uppercase"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Collections */}
                <div>
                  <h3 className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 mb-3 uppercase">Collections</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 border text-[10px] tracking-[0.15em] uppercase font-medium transition-all duration-200 cursor-pointer ${
                          selectedCategory === cat.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">Max Price</h3>
                    <span className="text-xs font-semibold font-mono text-accent">₹{(priceRange / 100).toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max={maxPriceLimit}
                    step={Math.max(25000, Math.floor((maxPriceLimit - 50000) / 20))}
                    value={priceRange}
                    onChange={(e) => setPriceRange(Number(e.target.value))}
                    className="w-full accent-accent bg-zinc-900 cursor-pointer h-0.5 rounded-none appearance-none"
                  />
                  <div className="flex justify-between text-[9px] tracking-widest text-zinc-700 font-mono mt-2">
                    <span>₹500</span>
                    <span>₹{(maxPriceLimit / 100).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 pb-6 pt-3 border-t border-zinc-900 flex gap-3">
                <button
                  onClick={() => { resetFilters(); setShowMobileFilters(false); }}
                  className="flex-1 py-3 border border-zinc-800 text-[10px] tracking-[0.2em] text-zinc-400 hover:border-zinc-500 hover:text-white uppercase transition-all cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3 bg-white text-black text-[10px] tracking-[0.2em] font-semibold uppercase hover:bg-accent hover:text-white transition-all cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Sort Bottom Sheet */}
        {showMobileSort && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setShowMobileSort(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-2xl lg:hidden">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
                <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">Sort By</span>
                <button
                  onClick={() => setShowMobileSort(false)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Options */}
              <div className="px-5 py-4 pb-8 space-y-1">
                {[
                  { id: "featured", label: "Featured", sub: "Highlighted picks" },
                  { id: "price-asc", label: "Price: Low to High", sub: "Budget to premium" },
                  { id: "price-desc", label: "Price: High to Low", sub: "Premium to budget" },
                  { id: "newest", label: "New Arrivals", sub: "Latest drops first" }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => { setSortBy(option.id); setShowMobileSort(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 cursor-pointer ${
                      sortBy === option.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "border-l-2 border-transparent hover:bg-zinc-900"
                    }`}
                  >
                    <div className="text-left">
                      <div className={`text-xs tracking-[0.15em] uppercase font-semibold ${
                        sortBy === option.id ? "text-accent" : "text-zinc-200"
                      }`}>{option.label}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5 tracking-wide">{option.sub}</div>
                    </div>
                    {sortBy === option.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </SmoothScroll>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-zinc-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <span className="text-xs tracking-[0.2em] font-mono">LOADING ARCHIVE...</span>
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}

