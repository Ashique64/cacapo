import SmoothScroll from "@/components/providers/SmoothScroll";
import Navbar from "@/components/layout/Header/Navbar";
import HomePage from "@/pages/HomePage";

export default function Home() {
  return (
    <SmoothScroll>
      <Navbar />
      <HomePage />
    </SmoothScroll>
  );
}

