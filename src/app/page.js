import { supabase } from "@/lib/supabase";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Header/Navbar";
import HomePage from "@/pages/HomePage";

export const revalidate = 60; // Cache and revalidate every minute

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
        .in("status", ["active", "draft"])
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(6)
    ]);

    // Format categories
    if (categoriesRes.data && categoriesRes.data.length > 0) {
      categories = categoriesRes.data.map((cat) => ({
        ...cat,
        image_url: cat.image_url || "/Images/clothing.jpg",
        tag: cat.slug.toUpperCase(),
        shortDesc: cat.description || "",
      }));
    } else {
      categories = [];
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
      products = [];
    }
  } catch (err) {
    console.error("Error fetching homepage data on server:", err);
    categories = [];
    products = [];
  }

  return (
    <SmoothScroll>
      <Navbar />
      <HomePage initialCategories={categories} initialProducts={products} />
    </SmoothScroll>
  );
}


