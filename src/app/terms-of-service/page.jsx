import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Scale, FileText, Info } from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description:
    "Read CACAPO's Terms of Service governing product purchases, intellectual property, account security, UPI payment verification, and logistics guidelines.",
  alternates: {
    canonical: "https://cacapoclothing.com/terms-of-service",
  },
  openGraph: {
    title: "Terms of Service | CACAPO",
    description:
      "Read CACAPO's Terms of Service governing purchases, intellectual property, and account security.",
    url: "https://cacapoclothing.com/terms-of-service",
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-background text-foreground min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO HEADER */}
        <section className="relative h-[45vh] sm:h-[50vh] flex items-center justify-center border-b border-card-border overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-white/20 via-white/55 to-white z-10" />
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] bg-accent/4 rounded-full blur-[90px] pointer-events-none animate-pulse duration-6000" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 space-y-4">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              LEGAL CHARTER
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider uppercase text-foreground font-sans leading-none">
              TERMS OF <span className="text-accent">SERVICE</span>
            </h1>
            <div className="w-16 h-px bg-accent mx-auto mt-6" />
            <p className="text-muted-text text-xs sm:text-sm max-w-lg mx-auto tracking-widest uppercase mt-4">
              Agreement governing access, platform purchases, and design ownership.
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
                  ATELIER ACCORD
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-foreground leading-tight">
                  GOVERNING RETAIL <br />& DESIGN USE
                </h2>
              </div>
              <p className="text-muted-text text-xs sm:text-sm font-light leading-relaxed text-justify">
                These Terms of Service outline the code of conduct, ownership rights, and purchasing guidelines between clients and the House of CACAPO studio. By accessing this platform or acquiring structural silhouettes, you confirm your acceptance of these terms.
              </p>
              <div className="p-5 border border-card-border bg-[#f9f8f6] space-y-2.5">
                <span className="text-[9px] font-bold tracking-widest text-accent uppercase block">Last Updated</span>
                <p className="text-muted-text text-[11px] tracking-wider leading-relaxed">
                  June 2026
                  <br />
                  Subject to modifications without prior notice.
                </p>
              </div>
            </div>

            {/* Right Pillars List */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Pillar 1 */}
              <div className="p-6 sm:p-8 bg-[#f9f8f6] border border-card-border space-y-4 hover:border-accent/40 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-card-border pb-3">
                  <ShieldCheck className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase">
                    1. Intellectual Property
                  </h3>
                </div>
                <p className="text-muted-text text-xs font-light leading-relaxed text-justify">
                  All digital and material contents on this platform—including structural dress designs, shoe designs, visual layouts, patterns, brand imagery, codebase, and logos—are the exclusive intellectual property of House of CACAPO. Any unauthorized replication, commercial resale, or distribution of these structural concepts is strictly prohibited.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 sm:p-8 bg-[#f9f8f6] border border-card-border space-y-4 hover:border-accent/40 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-card-border pb-3">
                  <FileText className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase">
                    2. Purchasing & Orders
                  </h3>
                </div>
                <p className="text-muted-text text-xs font-light leading-relaxed">
                  • <strong className="text-foreground font-semibold">Pricing:</strong> Product prices are displayed in Indian Rupees (INR) and are subject to change without prior notice.
                  <br />
                  • <strong className="text-foreground font-semibold">Shipping Terms:</strong> Flat delivery rates of <strong className="text-foreground font-semibold">₹50</strong> are applied on orders below <strong className="text-foreground font-semibold">₹10,000</strong>. Orders of value ₹10,000 and above qualify for free shipping.
                  <br />
                  • <strong className="text-foreground font-semibold">UPI Verification:</strong> Orders utilizing manual UPI payments are subjected to verification desk verification via receipt/UTR checking before processing begins.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 sm:p-8 bg-[#f9f8f6] border border-card-border space-y-4 hover:border-accent/40 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-card-border pb-3">
                  <Info className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase">
                    3. Imported Collections & Archive Sales
                  </h3>
                </div>
                <p className="text-muted-text text-xs font-light leading-relaxed text-justify">
                  All apparel, footwear, and accessories are premium readymade goods imported from global fashion capitals to Kerala, India. Final sale archive items and select intimate wear are non-refundable and exempt from standard return/exchange windows. Sizing specifications must be reviewed carefully prior to purchase.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 sm:p-8 bg-[#f9f8f6] border border-card-border space-y-4 hover:border-accent/40 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-card-border pb-3">
                  <Scale className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase">
                    4. Governing Law & Jurisdiction
                  </h3>
                </div>
                <p className="text-muted-text text-xs font-light leading-relaxed text-justify">
                  These terms are governed by and construed in accordance with the laws of India. Any legal claims, disputes, or actions arising from purchases or platform access shall be filed exclusively under the local jurisdiction of Malappuram, Kerala, India.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* CALL TO ACTION SUPPORT */}
        <section className="relative py-20 border-t border-card-border bg-[#f9f8f6] flex items-center justify-center overflow-hidden">
          <div className="max-w-2xl mx-auto px-6 text-center space-y-6 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-foreground">
              LEGAL DESK INQUIRIES
            </h2>
            <p className="text-muted-text text-xs tracking-widest max-w-md mx-auto leading-relaxed uppercase">
              Have questions regarding copyrights, billing adjustments, or custom commission contracts? Reach out to us.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link 
                href="/contact" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-foreground text-background border border-foreground hover:bg-transparent hover:text-foreground text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer"
              >
                CONTACT LEGAL DESK <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
