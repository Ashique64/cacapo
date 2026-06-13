import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import HeroCanvas from "@/components/HeroCanvas";
import Collections from "@/components/Collections";
import ProductShowcase from "@/components/ProductShowcase";
import BrandEthos from "@/components/BrandEthos";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="flex flex-col min-h-screen bg-black">
        <HeroCanvas />
        <Collections />
        <ProductShowcase />
        <BrandEthos />
        <Footer />
      </main>
    </SmoothScroll>
  );
}

