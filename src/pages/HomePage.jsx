import Hero from "@/components/sections/Hero/Hero";
import Category from "@/components/sections/Category/Category";
import MostLoved from "@/components/sections/MostLoved/MostLoved";
import BrandVoice from "@/components/sections/BrandVoice/BrandVoice";
import Footer from "@/components/layout/Footer/Footer";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-black">
      <Hero />
      <Category />
      <MostLoved />
      <BrandVoice />
      <Footer />
    </main>
  );
}
