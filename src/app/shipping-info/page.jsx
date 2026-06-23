import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Link from "next/link";
import { ArrowRight, Truck, Plane, Sparkles, MapPin } from "lucide-react";

export const metadata = {
  title: "Shipping & Delivery Information",
  description:
    "Learn about CACAPO's ready-to-wear shipping rates, delivery timelines (5–7 days standard, 2–3 days express), order dispatch schedules, and premium atelier packaging.",
  alternates: {
    canonical: "https://cacapoclothing.com/shipping-info",
  },
  openGraph: {
    title: "Shipping & Delivery | CACAPO",
    description:
      "CACAPO ships across India. Standard delivery 5–7 days. Express 2–3 days. Free shipping on orders above ₹10,000.",
    url: "https://cacapoclothing.com/shipping-info",
    type: "website",
  },
};

export default function ShippingInfoPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-black text-white min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO HEADER */}
        <section className="relative h-[45vh] sm:h-[50vh] flex items-center justify-center border-b border-zinc-900 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/55 to-black z-10" />
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] bg-accent/4 rounded-full blur-[90px] pointer-events-none animate-pulse duration-6000" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 space-y-4">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              LOGISTICS & DELIVERY
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider uppercase text-white font-sans leading-none">
              SHIPPING & <span className="text-accent">DELIVERY</span>
            </h1>
            <div className="w-16 h-px bg-accent mx-auto mt-6" />
            <p className="text-zinc-500 text-xs sm:text-sm max-w-lg mx-auto tracking-widest uppercase mt-4">
              Bespoke packaging and premium courier logistics for structural protection.
            </p>
          </div>
        </section>

        {/* POLICY GUIDELINE DETAILS */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            
            {/* Left Narrative Block */}
            <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-28">
              <div className="space-y-3">
                <span className="text-[10px] tracking-[0.3em] font-bold text-accent uppercase block">
                  DELIVERY COMPACT
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white leading-tight">
                  GLOBAL DISPATCH <br />OF STRUCTURAL PIECES
                </h2>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed text-justify">
                To guarantee that your garments arrive in pristine, unblemished condition, House of CACAPO coordinates with elite global courier channels. Every order is fully insured and packed in custom structural frames to prevent wrinkles and layout distortion during transport.
              </p>
              <div className="p-5 border border-zinc-900 bg-zinc-950/40 space-y-2.5">
                <span className="text-[9px] font-bold tracking-widest text-accent uppercase block">Dispatch Location</span>
                <p className="text-zinc-400 text-[11px] tracking-wider leading-relaxed">
                  All orders are dispatched directly from our import hub:
                  <br />
                  House of CACAPO Hub • Kerala, India.
                </p>
              </div>
            </div>

            {/* Right Pillars List */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Pillar 1 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Truck className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Delivery Timelines
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Ready-to-wear collections are dispatched within 24 to 48 hours of order confirmation. 
                  <br /><br />
                  • <strong className="text-white font-semibold">Standard Shipping:</strong> 5 to 7 business days.
                  <br />
                  • <strong className="text-white font-semibold">Express Shipping:</strong> 2 to 3 business days.
                  <br /><br />
                  All pieces are imported from global fashion capitals and thoroughly checked at our Kerala center before final delivery.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <MapPin className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Shipping Charges
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Domestic shipping is free on all orders above <strong className="text-white font-semibold">₹10,000</strong>. For orders below this threshold, a flat delivery and handling fee of <strong className="text-white font-semibold">₹50</strong> is calculated at checkout.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Plane className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Tracking & Status Updates
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Once your shipment is registered, tracking codes and carrier details are instantly updated on your client dashboard and sent via WhatsApp. You can review live transport coordinates in real-time.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Sparkles className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Signature Atelier Packaging
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Every garment is enclosed in a breathable, protective designer dust bag and packed inside a rigid, secure double-walled custom box. Accessories and footwear include structural supports and signature luxury catalog boxes.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* CALL TO ACTION SUPPORT */}
        <section className="relative py-20 border-t border-zinc-900 bg-zinc-950/10 flex items-center justify-center overflow-hidden">
          <div className="max-w-2xl mx-auto px-6 text-center space-y-6 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-zinc-200">
              LOGISTICS SUPPORT
            </h2>
            <p className="text-zinc-500 text-xs tracking-widest max-w-md mx-auto leading-relaxed uppercase">
              Need to coordinate express delivery or change a pending shipping address? Contact our desk.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link 
                href="/contact" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer"
              >
                CONTACT DESK <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
