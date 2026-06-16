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
  title: "CACAPO",
  description: "Experience premium couture, tailored drapes, and architectural silhouettes by CACAPO. Discover our curated collections of luxury clothing, footwear, and accessories.",
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
