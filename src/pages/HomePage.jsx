import Hero from "@/components/sections/Hero/Hero";
import Marquee from "@/components/sections/Marquee/Marquee";
import Category from "@/components/sections/Category/Category";
import MostLoved from "@/components/sections/MostLoved/MostLoved";
import BrandVoice from "@/components/sections/BrandVoice/BrandVoice";
import Footer from "@/components/layout/Footer/Footer";

export default function HomePage({ initialCategories, initialProducts }) {
  return (
    <main className="flex flex-col min-h-screen bg-black">
      <Hero />
      <Marquee />
      <Category initialCategories={initialCategories} />
      <MostLoved initialProducts={initialProducts} />
      <BrandVoice />
      <Footer />
    </main>
  );
}
