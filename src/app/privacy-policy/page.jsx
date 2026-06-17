import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Link from "next/link";
import { ArrowRight, Eye, ShieldAlert, Cpu, Lock } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | House of CACAPO",
  description: "Review the Privacy Policy governing personal data collection, data usage, security protocols, and cookies at House of CACAPO.",
};

export default function PrivacyPolicyPage() {
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
              DATA PRIVACY DESK
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-wider uppercase text-white font-sans leading-none">
              PRIVACY <span className="text-accent">POLICY</span>
            </h1>
            <div className="w-16 h-[1px] bg-accent mx-auto mt-6" />
            <p className="text-zinc-500 text-xs sm:text-sm max-w-lg mx-auto tracking-widest uppercase mt-4">
              Commitment to structural data security, user profiles, and order processing privacy.
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
                  SECURITY STATUTE
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white leading-tight">
                  PROTECTING CLIENT <br />DATA INTEGRITY
                </h2>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed text-justify">
                At House of CACAPO, we treat client data with the same precision and structural care as our garments. We utilize encrypted pathways and restricted database policies to ensure that your address directories, purchase logs, and identity information are protected at all times.
              </p>
              <div className="p-5 border border-zinc-900 bg-zinc-950/40 space-y-2.5">
                <span className="text-[9px] font-bold tracking-widest text-accent uppercase block">Security Standards</span>
                <p className="text-zinc-400 text-[11px] tracking-wider leading-relaxed">
                  Supabase Security Architecture
                  <br />
                  Strict Row Level Security (RLS) policies.
                </p>
              </div>
            </div>

            {/* Right Pillars List */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Pillar 1 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Eye className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    1. Information We Collect
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed text-justify">
                  We collect personal profile data necessary to execute orders and maintain customer accounts. This includes your name, registered email address (safeguarded under auth systems), delivery contact numbers, shipping addresses, and transaction references (such as UTR numbers from UPI payment processes).
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Cpu className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    2. Processing & Usage
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed text-justify">
                  Your information is utilized solely to compile orders, verify manual UPI payments, manage delivery schedules, and update order statuses. Automated WhatsApp notifications and email alerts are triggered dynamically to transmit tracking links and logistics status reports.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <Lock className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    3. Data Security & Storage
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed text-justify">
                  All databases are hosted on encrypted cloud structures. User table interactions are protected by Row Level Security (RLS) rules that prevent standard clients from reading or modifying data belonging to other accounts. Only validated administrative desk users are granted structured read access specifically for verification and delivery tracking.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 sm:p-8 bg-zinc-950/20 border border-zinc-900 space-y-4 hover:border-zinc-800 transition-colors duration-500 relative">
                <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                  <ShieldAlert className="w-4.5 h-4.5 text-accent" />
                  <h3 className="text-xs font-bold tracking-[0.2em] text-zinc-100 uppercase">
                    4. Sharing & Disclosure
                  </h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed text-justify">
                  House of CACAPO does not engage in trading, renting, or selling customer details. Data sharing is limited to registered logistics channels (DHL, FedEx, or domestic premium courier groups) to ensure direct delivery execution. We will disclose info only if compelled under Indian legal jurisdiction.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* CALL TO ACTION SUPPORT */}
        <section className="relative py-20 border-t border-zinc-900 bg-zinc-950/10 flex items-center justify-center overflow-hidden">
          <div className="max-w-2xl mx-auto px-6 text-center space-y-6 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-zinc-200">
              PRIVACY COMPLIANCE
            </h2>
            <p className="text-zinc-500 text-xs tracking-widest max-w-md mx-auto leading-relaxed uppercase">
              To request a profile deletion, data inspection list, or address updates, contact our privacy desk.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link 
                href="/contact" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-none cursor-pointer"
              >
                CONTACT SECURITY DESK <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
