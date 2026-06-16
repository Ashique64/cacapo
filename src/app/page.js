import { supabase } from "@/lib/supabase";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Header/Navbar";
import HomePage from "@/pages/HomePage";

export const revalidate = 60; // Cache and revalidate every minute

const FALLBACK_CATEGORIES = [
  {
    id: "cat-1",
    name: "ATELIER APPAREL",
    slug: "clothing",
    description: "Architectural lines meets flowing silks. Expertly tailored drapery designed to contour and elevate the feminine form.",
    shortDesc: "Architectural lines meet flowing silks. Expertly tailored drapery.",
    image_url: "/Images/clothing.jpg",
    tag: "CLOTHING",
  },
  {
    id: "cat-2",
    name: "SCULPTED FOOTWEAR",
    slug: "footwear",
    description: "Crafted in Italy. Striking structural heels and premium buttery leathers that deliver unparalleled elegance with every step.",
    shortDesc: "Italian crafted heels and premium leathers for unparalleled elegance.",
    image_url: "/Images/footwear.jpg",
    tag: "FOOTWEAR",
  },
  {
    id: "cat-3",
    name: "COUTURE ACCENTS",
    slug: "accessories",
    description: "Statement jewelry, structural bags, and luxury accessories made with high-shine gold accents and clean geometric lines.",
    shortDesc: "Statement jewelry and bags featuring clean geometric gold lines.",
    image_url: "/Images/accessories.jpg",
    tag: "ACCESSORIES",
  },
];

const SLUG_IMAGE_FALLBACK = {
  clothing: "/Images/clothing.jpg",
  footwear: "/Images/footwear.jpg",
  accessories: "/Images/accessories.jpg",
};

const MOCK_NEW_ARRIVALS = [
  {
    id: "mock-1",
    name: "SILK SLIP ARCHIVE DRESS",
    price: 185000,
    images: ["/Images/clothing.jpg"],
    slug: "silk-slip-archive-dress",
  },
  {
    id: "mock-2",
    name: "PLATINUM BLOCK HEEL",
    price: 98000,
    images: ["/Images/footwear.jpg"],
    slug: "platinum-block-heel",
  },
  {
    id: "mock-3",
    name: "GEOMETRIC CLASP TOTE",
    price: 240000,
    images: ["/Images/accessories.jpg"],
    slug: "geometric-clasp-tote",
  },
  {
    id: "mock-4",
    name: "DRAPED CASHMERE TRENCH",
    price: 320000,
    images: ["/Images/clothing.jpg"],
    slug: "draped-cashmere-trench",
  },
  {
    id: "mock-5",
    name: "CHAMPAGNE STRAP HEELS",
    price: 110000,
    images: ["/Images/footwear.jpg"],
    slug: "champagne-strap-heels",
  },
  {
    id: "mock-6",
    name: "TEXTURED GOLD CHOKER",
    price: 145000,
    images: ["/Images/accessories.jpg"],
    slug: "textured-gold-choker",
  },
];

export default async function Home() {
  let categories = [];
  let products = [];

  try {
    const [categoriesRes, productsRes] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, description, image_url")
        .is("parent_id", null)
        .order("name"),
      supabase
        .from("products")
        .select(`
          id, name, slug, price,
          product_images(image_url, sort_order),
          product_variants(id, size, color, price, stock_quantity)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6)
    ]);

    // Format categories
    if (categoriesRes.data && categoriesRes.data.length > 0) {
      categories = categoriesRes.data.map((cat) => ({
        ...cat,
        image_url: cat.image_url || SLUG_IMAGE_FALLBACK[cat.slug] || "/Images/clothing.jpg",
        tag: cat.slug.toUpperCase(),
        shortDesc: cat.description || "",
      }));
    } else {
      categories = FALLBACK_CATEGORIES;
    }

    // Format products
    if (productsRes.data && productsRes.data.length > 0) {
      products = productsRes.data.map((p) => ({
        ...p,
        images: p.product_images
          ? p.product_images
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((img) => img.image_url)
          : ["/Images/clothing.jpg"],
        variants: p.product_variants || [],
      }));
    } else {
      products = MOCK_NEW_ARRIVALS;
    }
  } catch (err) {
    console.error("Error fetching homepage data on server:", err);
    categories = FALLBACK_CATEGORIES;
    products = MOCK_NEW_ARRIVALS;
  }

  return (
    <SmoothScroll>
      <Navbar />
      <HomePage initialCategories={categories} initialProducts={products} />
    </SmoothScroll>
  );
}


