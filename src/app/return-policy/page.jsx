import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Link from "next/link";
import { ArrowRight, RefreshCw, ShieldAlert, Clock, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Returns & Exchanges | House of CACAPO",
  description: "Review the return window, eligibility guidelines, and exchange process for ready-to-wear luxury garments and bespoke creations at House of CACAPO.",
};

export default function ReturnPolicyPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-black text-white min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO HEADER */}
        <section className="relative h-[45vh] sm:h-[50vh] flex items-center justify-center border-b border-zinc-900 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/55 to-black z-10" />
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] bg-accent/4 rounded-full blur-[90px] pointer-events-none animate-pulse duration-[6000ms]" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 space-y-4">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              CLIENT CARE DESK
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider uppercase text-white font-sans leading-none">
              RETURNS & <span className="text-accent">EXCHANGES</span>
            </h1>
            <div className="w-16 h-[1px] bg-accent mx-auto mt-6" />
            <p className="text-zinc-500 text-xs sm:text-sm max-w-lg mx-auto tracking-widest uppercase mt-4">
              Our policies are structured to ensure absolute quality control and structural perfection.
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
                  SATISFACTION ACCORD
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white leading-tight">
                  OUR GUARANTEE <br />OF EXCELLENCE
                </h2>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed text-justify">
                At House of CACAPO, every silhouette is custom engineered, carefully tailored, and rigorously inspected before dispatch. If a ready-to-wear piece does not sit correctly on your frame, we are fully committed to coordinating exchanges or returns to satisfy your architectural fit.
              </p>
              <div className="p-5 border border-zinc-900 bg-zinc-950/40 space-y-2.5">
                <span className="text-[9px] font-bold tracking-widest text-accent uppercase block">Support Hours</span>
                <p className="text-zinc-400 text-[11px] tracking-wider leading-relaxed">
                  Monday – Saturday • 10:00 AM – 7:00 PM (IST)
                  <br />
                  Response within 12 hours for all requests.
                </p>
              </div>
            </div>

            {/* Right Pillars List */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Pillar 1 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Clock className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Return Window
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  We accept requests for returns or exchanges within <strong className="text-white font-semibold">7 days</strong> from the date of product delivery. Any request received beyond this period cannot be accommodated due to our inventory cycle constraints.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <ShieldAlert className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Eligibility Guidelines
                  </h3>
                </div>
                <ul className="text-zinc-400 text-xs font-light leading-relaxed space-y-2 list-disc list-inside">
                  <li>Garments must be completely unworn, unwashed, and undamaged.</li>
                  <li>Original brand tags, design labels, and packaging materials must be intact.</li>
                  <li>Receipt or proof of purchase must be presented during request.</li>
                  <li>Items must be free from fragrances, cosmetics, or any structural alterations.</li>
                </ul>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <RefreshCw className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Non-Returnable Items
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Bespoke commissions, custom alterations ordered via design desk, final sale archive items, and intimate apparel are strictly non-returnable. We encourage you to carefully cross-reference your measurements with our sizing desks before placing customized orders.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <HelpCircle className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    Exchange Process
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  Upon receiving your request and verifying the product condition at our studio, we will process the replacement shipment. If the requested size is unavailable, a full refund or atelier credit (valid for 1 year) will be issued. Return shipping logistics costs are managed by the client unless the item was delivered damaged.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* CALL TO ACTION SUPPORT */}
        <section className="relative py-20 border-t border-zinc-900 bg-zinc-950/10 flex items-center justify-center overflow-hidden">
          <div className="max-w-2xl mx-auto px-6 text-center space-y-6 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-zinc-200">
              INITIATE A RETURN OR EXCHANGE
            </h2>
            <p className="text-zinc-500 text-xs tracking-widest max-w-md mx-auto leading-relaxed uppercase">
              Send your order reference ID and structural issue details directly to our design assistants.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link 
                href="/contact" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer"
              >
                CONTACT SUPPORT <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
