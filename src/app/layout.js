import { Outfit, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CartSidebar from "@/components/layout/CartSidebar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://cacapoclothing.com"),
  title: {
    default: "CACAPO — Trendy Imported Fashion for Girls",
    template: "%s | CACAPO",
  },
  description:
    "Shop CACAPO for trendy imported fashion — fit-checked, fast-delivered, limited drops. Curated streetwear, clothing, footwear & accessories for Gen-Z girls across India.",
  keywords: [
    "CACAPO",
    "trendy fashion India",
    "imported clothing Kerala",
    "Gen-Z fashion India",
    "imported streetwear India",
    "affordable fashion online",
    "trendy clothes girls",
    "limited drops fashion",
    "Korean fashion India",
    "fast fashion India",
  ],
  authors: [{ name: "CACAPO", url: "https://cacapoclothing.com" }],
  creator: "CACAPO",
  publisher: "CACAPO",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://cacapoclothing.com",
    siteName: "CACAPO",
    title: "CACAPO — Trendy Imported Fashion for Girls",
    description:
      "Shop CACAPO for trendy imported fashion — fit-checked, fast-delivered, limited drops. Curated streetwear, clothing, footwear & accessories for Gen-Z girls across India.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CACAPO — Trendy Imported Fashion for Girls",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CACAPO — Trendy Imported Fashion for Girls",
    description:
      "Trendy imported fashion — fit-checked, fast-delivered, limited drops. Shop CACAPO now.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CACAPO",
    "url": "https://cacapoclothing.com",
    "logo": "https://cacapoclothing.com/icon.png",
    "sameAs": [
      "https://instagram.com/cacapoclothing"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@cacapoclothing.com",
      "contactType": "customer service"
    }
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "CACAPO — Trendy Imported Fashion",
    "url": "https://cacapoclothing.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://cacapoclothing.com/shop?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${playfair.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* Global drag prevention for images */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('dragstart', function(e) {
                  if (e.target && (
                    e.target.tagName === 'IMG' ||
                    e.target.tagName === 'PICTURE' ||
                    e.target.tagName === 'SVG' ||
                    e.target.closest('img') ||
                    e.target.closest('[data-nimg]') ||
                    (e.target.tagName === 'A' && e.target.querySelector('img'))
                  )) {
                    e.preventDefault();
                  }
                }, { capture: true });
              }
            `,
          }}
        />
        {children}
        <CartSidebar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
