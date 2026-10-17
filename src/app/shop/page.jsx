import { supabase } from "@/lib/supabase";
import ShopClientPage from "./ShopClient";

export const revalidate = 60; // Cache shop catalog on server for 60 seconds

export const metadata = {
  title: "Shop — Latest Drops",
  description:
    "Browse CACAPO's full collection of trendy imported clothing, footwear, and accessories. Filter by category, size, and style to find your perfect fit.",
  alternates: {
    canonical: "https://cacapoclothing.com/shop",
  },
  openGraph: {
    title: "Shop Latest Drops | CACAPO",
    description:
      "Browse CACAPO's full collection of trendy imported clothing, footwear, and accessories. Curated fashion delivered across India.",
    url: "https://cacapoclothing.com/shop",
    type: "website",
  },
};

export default async function ShopPage() {
  let categories = [];
  let products = [];

  try {
    const [catRes, prodRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("products")
        .select(`
          *,
          product_images(image_url, sort_order),
          product_variants(*)
        `)
        .in("status", ["active", "draft"])
        .order("created_at", { ascending: false })
    ]);

    if (catRes.data) {
      categories = catRes.data;
    }

    if (prodRes.data) {
      products = prodRes.data.map((p) => ({
        ...p,
        images: p.product_images
          ? p.product_images
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((img) => img.image_url)
          : [],
        variants: p.product_variants || []
      }));
    }
  } catch (err) {
    console.error("Error prefetching shop catalog on server:", err);
  }

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Shop Latest Drops — CACAPO",
    "description": "Browse CACAPO's full collection of trendy imported clothing, footwear, and accessories.",
    "url": "https://cacapoclothing.com/shop",
    "isPartOf": {
      "@type": "WebSite",
      "name": "CACAPO",
      "url": "https://cacapoclothing.com"
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://cacapoclothing.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Shop",
        "item": "https://cacapoclothing.com/shop"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ShopClientPage initialProducts={products} initialCategories={categories} />
    </>
  );
}
