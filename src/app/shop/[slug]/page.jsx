import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ProductDetailsClient from "./ProductDetailsClient";

export const revalidate = 60;

const MOCK_PRODUCTS = [
  {
    id: "p1",
    name: "SILK SLIP ARCHIVE DRESS",
    slug: "silk-slip-archive-dress",
    price: 185000,
    description: "Architectural lines meets flowing silks. Expertly tailored drapery designed to contour and elevate the feminine form. Features a deep cowled neckline, adjustable cross-back spaghetti straps, and a delicate raw-edge asymmetrical hem.",
    short_description: "Architectural lines meet flowing silks.",
    category_id: "cat-clothing",
    brand: "CACAPO",
    featured: true,
    images: ["/Images/clothing.jpg", "/Images/clothing.jpg"],
    variants: [
      { id: "v1-s", size: "S", stock_quantity: 10 },
      { id: "v1-m", size: "M", stock_quantity: 15 },
      { id: "v1-l", size: "L", stock_quantity: 0 }
    ]
  },
  {
    id: "p2",
    name: "PLATINUM BLOCK HEEL",
    slug: "platinum-block-heel",
    price: 98000,
    description: "Crafted in Milan. Striking structural block heels and premium buttery leathers that deliver unparalleled elegance with every step. Features a hand-carved chrome metallic heel, square toe silhouette, and delicate wrap-around ankle straps.",
    short_description: "Italian crafted heels and premium leathers.",
    category_id: "cat-footwear",
    brand: "CACAPO",
    featured: true,
    images: ["/Images/footwear.jpg", "/Images/footwear.jpg"],
    variants: [
      { id: "v2-37", size: "37", stock_quantity: 5 },
      { id: "v2-38", size: "38", stock_quantity: 8 },
      { id: "v2-39", size: "39", stock_quantity: 0 }
    ]
  },
  {
    id: "p3",
    name: "GEOMETRIC CLASP TOTE",
    slug: "geometric-clasp-tote",
    price: 240000,
    description: "Statement luxury bag made with high-shine gold accents and clean geometric lines. Handmade with structured top-grain calfskin leather, lined with premium suede, and featuring a custom-cast gold-finished logo clasp.",
    short_description: "Statement luxury bag with geometric lines.",
    category_id: "cat-accessories",
    brand: "CACAPO",
    featured: true,
    images: ["/Images/accessories.jpg", "/Images/accessories.jpg"],
    variants: [
      { id: "v3-os", size: "OS", stock_quantity: 20 }
    ]
  },
  {
    id: "p4",
    name: "DRAPED CASHMERE TRENCH",
    slug: "draped-cashmere-trench",
    price: 320000,
    description: "Luxurious double-faced cashmere trench coat with an oversized structural collar. Expertly tailored in a longline drape silhouette with deep welt pockets, tortoiseshell button hardware, and a matching fabric tie belt.",
    short_description: "Luxurious cashmere trench coat.",
    category_id: "cat-clothing",
    brand: "CACAPO",
    featured: false,
    images: ["/Images/clothing.jpg", "/Images/clothing.jpg"],
    variants: [
      { id: "v4-s", size: "S", stock_quantity: 3 },
      { id: "v4-m", size: "M", stock_quantity: 5 }
    ]
  },
  {
    id: "p5",
    name: "CHAMPAGNE STRAP HEELS",
    slug: "champagne-strap-heels",
    price: 110000,
    description: "Delicate satin strap heels in a shimmering champagne shade. Features minimalist dual straps, a padded leather footbed for comfort, and a sleek 90mm stiletto heel. Ideal for evening couture accents.",
    short_description: "Delicate champagne strap heels.",
    category_id: "cat-footwear",
    brand: "CACAPO",
    featured: false,
    images: ["/Images/footwear.jpg", "/Images/footwear.jpg"],
    variants: [
      { id: "v5-37", size: "37", stock_quantity: 0 },
      { id: "v5-38", size: "38", stock_quantity: 6 },
      { id: "v5-39", size: "39", stock_quantity: 4 }
    ]
  },
  {
    id: "p6",
    name: "TEXTURED GOLD CHOKER",
    slug: "textured-gold-choker",
    price: 145000,
    description: "Textured solid brass collar choker finished in heavy 24k gold plating. Artfully distressed surface detail captures light uniquely. Open back design makes it flexible and comfortable to wear.",
    short_description: "Heavy 24k gold plated collar choker.",
    category_id: "cat-accessories",
    brand: "CACAPO",
    featured: false,
    images: ["/Images/accessories.jpg", "/Images/accessories.jpg"],
    variants: [
      { id: "v6-os", size: "OS", stock_quantity: 12 }
    ]
  }
];

export default async function ProductDetailsPage({ params }) {
  const { slug } = await params;

  let product = null;
  let relatedProducts = [];

  try {
    // 1. Fetch main product details joined with images and variants
    const { data: productData, error } = await supabase
      .from("products")
      .select(`
        id, name, slug, price, description, short_description, brand, status, category_id,
        product_images(image_url, sort_order),
        product_variants(id, size, color, price, sale_price, stock_quantity, sku)
      `)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (productData) {
      product = {
        ...productData,
        images: productData.product_images && productData.product_images.length > 0
          ? productData.product_images
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((img) => img.image_url)
          : ["/Images/clothing.jpg"],
        variants: productData.product_variants || []
      };
    }
  } catch (err) {
    console.error("Error fetching product data on server:", err);
  }

  // Fallback to mock data if DB query fails or has no results
  if (!product) {
    const mock = MOCK_PRODUCTS.find((p) => p.slug === slug);
    if (mock) {
      product = mock;
    } else {
      notFound();
    }
  }

  // 2. Fetch related products from the same category
  try {
    if (product.category_id && !product.category_id.startsWith("cat-")) {
      const { data: relatedData } = await supabase
        .from("products")
        .select(`
          id, name, slug, price,
          product_images(image_url, sort_order),
          product_variants(id, size, color, price, stock_quantity)
        `)
        .eq("category_id", product.category_id)
        .eq("status", "active")
        .neq("id", product.id)
        .limit(4);

      if (relatedData && relatedData.length > 0) {
        relatedProducts = relatedData.map((p) => ({
          ...p,
          images: p.product_images && p.product_images.length > 0
            ? p.product_images
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((img) => img.image_url)
            : ["/Images/clothing.jpg"],
          variants: p.product_variants || []
        }));
      }
    }
  } catch (err) {
    console.error("Error fetching related products on server:", err);
  }

  // Fallback related products from mock data
  if (relatedProducts.length === 0) {
    relatedProducts = MOCK_PRODUCTS
      .filter((p) => p.slug !== slug && p.category_id === product.category_id)
      .slice(0, 4);

    if (relatedProducts.length === 0) {
      relatedProducts = MOCK_PRODUCTS.filter((p) => p.slug !== slug).slice(0, 4);
    }
  }

  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-black text-white min-h-screen pt-24 overflow-x-hidden">
        <ProductDetailsClient product={product} relatedProducts={relatedProducts} />
      </main>
      <Footer />
    </SmoothScroll>
  );
}

export async function generateStaticParams() {
  try {
    const { data: products } = await supabase
      .from("products")
      .select("slug")
      .eq("status", "active");

    const dbSlugs = products ? products.map(p => ({ slug: p.slug })) : [];
    const mockSlugs = MOCK_PRODUCTS.map(p => ({ slug: p.slug }));
    
    const allSlugs = [...dbSlugs, ...mockSlugs];
    const uniqueSlugs = Array.from(new Set(allSlugs.map(s => s.slug))).map(slug => ({ slug }));
    
    return uniqueSlugs;
  } catch (err) {
    console.error("Error generating static params:", err);
    return MOCK_PRODUCTS.map(p => ({ slug: p.slug }));
  }
}
