import ShopClientPage from "./ShopClient";

export const metadata = {
  title: "Shop — The Archive",
  description:
    "Browse CACAPO's full collection of premium luxury clothing, footwear, and accessories. Filter by category, size, and style to find your perfect architectural silhouette.",
  alternates: {
    canonical: "https://cacapoclothing.com/shop",
  },
  openGraph: {
    title: "Shop The Archive | CACAPO",
    description:
      "Browse CACAPO's full collection of luxury clothing, footwear, and accessories. Premium imported fashion delivered across India.",
    url: "https://cacapoclothing.com/shop",
    type: "website",
  },
};

export default function ShopPage() {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Shop The Archive — CACAPO",
    "description": "Browse CACAPO's full collection of premium luxury clothing, footwear, and accessories.",
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
