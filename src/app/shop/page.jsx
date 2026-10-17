import ShopClientPage from "./ShopClient";

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

export default function ShopPage() {
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
      <ShopClientPage />
    </>
  );
}
