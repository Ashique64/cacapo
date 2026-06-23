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
  return <ShopClientPage />;
}
