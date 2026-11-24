import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Server-side Supabase client using service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = "https://cacapoclothing.com";
const BRAND = "CACAPO";

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatPrice(paise) {
  // Prices stored in paise, Meta needs "1599.00 INR"
  const rupees = (paise / 100).toFixed(2);
  return `${rupees} INR`;
}

function getGoogleCategory(categoryName) {
  if (!categoryName) return "Apparel &amp; Accessories &gt; Clothing";
  const lower = categoryName.toLowerCase();
  if (lower.includes("shoe") || lower.includes("footwear") || lower.includes("sandal") || lower.includes("heel")) {
    return "Apparel &amp; Accessories &gt; Shoes";
  }
  if (lower.includes("bag") || lower.includes("handbag") || lower.includes("purse")) {
    return "Apparel &amp; Accessories &gt; Handbags, Wallets &amp; Cases";
  }
  if (lower.includes("jewel") || lower.includes("necklace") || lower.includes("earring") || lower.includes("bracelet")) {
    return "Apparel &amp; Accessories &gt; Jewelry";
  }
  return "Apparel &amp; Accessories &gt; Clothing";
}

export async function GET() {
  try {
    // Fetch all active products with their images, variants, and categories
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        description,
        status,
        product_images (image_url, sort_order),
        product_variants (id, size, color, price, sale_price, stock_quantity, sku),
        categories (name)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching products:", error);
      return new NextResponse("Error fetching products", { status: 500 });
    }

    const items = [];

    for (const product of products) {
      // Get the first image (sorted by sort_order)
      const sortedImages = (product.product_images || []).sort(
        (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
      );
      const imageUrl = sortedImages[0]?.image_url || "";
      if (!imageUrl) continue; // Meta requires an image — skip products without one

      const categoryName = product.categories?.name || "";
      const googleCategory = getGoogleCategory(categoryName);
      const productLink = `${SITE_URL}/shop/${product.slug}`;
      const description = escapeXml(
        product.description
          ? product.description.replace(/<[^>]*>/g, "").slice(0, 9999)
          : product.name
      );

      const variants = product.product_variants || [];

      if (variants.length === 0) {
        // Product with no variants — single item
        items.push(`    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${description}</g:description>
      <g:link>${escapeXml(productLink)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:price>0.00 INR</g:price>
      <g:brand>${BRAND}</g:brand>
      <g:google_product_category>${googleCategory}</g:google_product_category>
    </item>`);
      } else {
        // One item per variant
        for (const variant of variants) {
          const effectivePrice = variant.sale_price && variant.sale_price > 0
            ? variant.sale_price
            : variant.price;
          const inStock = variant.stock_quantity > 0;
          const itemId = `${product.id}_${variant.id}`;

          // Build title: "Product Name - Size Color"
          const titleParts = [product.name];
          if (variant.size) titleParts.push(variant.size);
          if (variant.color) titleParts.push(variant.color);
          const title = titleParts.join(" - ");

          let itemXml = `    <item>
      <g:id>${escapeXml(itemId)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${description}</g:description>
      <g:link>${escapeXml(productLink)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${inStock ? "in stock" : "out of stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${formatPrice(effectivePrice)}</g:price>`;

          // If there's a sale price different from original, include original price
          if (variant.sale_price && variant.sale_price > 0 && variant.sale_price < variant.price) {
            itemXml += `\n      <g:sale_price>${formatPrice(variant.sale_price)}</g:sale_price>`;
          }

          if (variant.sku) {
            itemXml += `\n      <g:mpn>${escapeXml(variant.sku)}</g:mpn>`;
          }
          if (variant.size) {
            itemXml += `\n      <g:size>${escapeXml(variant.size)}</g:size>`;
          }
          if (variant.color) {
            itemXml += `\n      <g:color>${escapeXml(variant.color)}</g:color>`;
          }

          itemXml += `
      <g:brand>${BRAND}</g:brand>
      <g:google_product_category>${googleCategory}</g:google_product_category>
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>
    </item>`;

          items.push(itemXml);
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>CACAPO Clothing Product Feed</title>
    <link>${SITE_URL}</link>
    <description>CACAPO women's clothing product catalog for Meta Ads</description>
${items.join("\n")}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("Catalog feed error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
