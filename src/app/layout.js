import { Outfit, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CartSidebar from "@/components/layout/CartSidebar";

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
    default: "CACAPO — House of Couture",
    template: "%s | CACAPO",
  },
  description:
    "Experience premium couture, tailored drapes, and architectural silhouettes by CACAPO. Discover our curated collections of luxury clothing, footwear, and accessories.",
  keywords: [
    "CACAPO",
    "luxury clothing India",
    "premium fashion Kerala",
    "architectural couture",
    "imported streetwear India",
    "luxury fashion online",
    "designer clothes India",
    "minimalist fashion",
    "premium accessories",
    "bespoke fashion",
  ],
  authors: [{ name: "House of CACAPO", url: "https://cacapoclothing.com" }],
  creator: "House of CACAPO",
  publisher: "House of CACAPO",
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
    title: "CACAPO — House of Couture",
    description:
      "Experience premium couture, tailored drapes, and architectural silhouettes by CACAPO. Discover our curated collections of luxury clothing, footwear, and accessories.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CACAPO — House of Couture",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CACAPO — House of Couture",
    description:
      "Experience premium couture, tailored drapes, and architectural silhouettes by CACAPO.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${playfair.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CartSidebar />
      </body>
    </html>
  );
}
