import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ProductDetailsClient from "./ProductDetailsClient";

export const revalidate = 60;

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
      .in("status", ["active", "draft"])
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

  // Fallback to notFound if DB query fails or has no results
  if (!product) {
    notFound();
  }

  // 2. Fetch related products from the same category with fallback to other products if < 4
  try {
    let relatedData = [];
    if (product.category_id) {
      const { data } = await supabase
        .from("products")
        .select(`
          id, name, slug, price,
          product_images(image_url, sort_order),
          product_variants(id, size, color, price, stock_quantity)
        `)
        .eq("category_id", product.category_id)
        .in("status", ["active", "draft"])
        .neq("id", product.id)
        .limit(4);
      relatedData = data || [];
    }

    // If we have fewer than 4 related products from the same category, fill the rest with other active products
    if (relatedData.length < 4) {
      const excludedIds = [product.id, ...relatedData.map(p => p.id)];
      // Format array of UUIDs for Supabase 'in' filter
      const filterString = `(${excludedIds.join(",")})`;
      const needed = 4 - relatedData.length;

      const { data: fallbackData } = await supabase
        .from("products")
        .select(`
          id, name, slug, price,
          product_images(image_url, sort_order),
          product_variants(id, size, color, price, stock_quantity)
        `)
        .in("status", ["active", "draft"])
        .not("id", "in", filterString)
        .limit(needed);

      if (fallbackData && fallbackData.length > 0) {
        relatedData = [...relatedData, ...fallbackData];
      }
    }

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
  } catch (err) {
    console.error("Error fetching related products on server:", err);
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
      .in("status", ["active", "draft"]);

    const dbSlugs = products ? products.map(p => ({ slug: p.slug })) : [];
    return dbSlugs;
  } catch (err) {
    console.error("Error generating static params:", err);
    return [];
  }
}
