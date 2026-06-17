import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Link from "next/link";

export const metadata = {
  title: "About | House of CACAPO",
  description: "Discover the architectural lines, sustainable luxury philosophy, and structural couture that define the minimalist design ethos of CACAPO.",
};

export default function AboutPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-black text-white min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO SECTION */}
        <section className="relative h-[65vh] flex items-center justify-center border-b border-zinc-900 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/40 to-black z-10" />
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none animate-pulse duration-5000" />
          
          <img 
            src="/Images/ethos.jpg" 
            alt="CACAPO Design Ethos" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 object-center scale-100"
          />

          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 space-y-6">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              THE HOUSE OF CACAPO
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-tight text-white font-sans">
              THE ARCHITECTURE <br />OF <span className="text-accent">COUTURE</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm md:text-base max-w-xl mx-auto tracking-wide font-light leading-relaxed">
              Founded on the principles of geometric structuralism and minimalist tailory. 
              We design timeless silhouettes that contour, empower, and redefine the feminine form.
            </p>
          </div>
        </section>

        {/* SECTION 1: THE BRAND PHILOSOPHY */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left: Beautiful Image Box with border details */}
          <div className="relative group aspect-[4/3] bg-zinc-950 border border-zinc-900 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent z-10" />
            <img 
              src="/Images/clothing.jpg" 
              alt="Tailoring process" 
              className="w-full h-full object-contain transition-transform duration-[1.5s] group-hover:scale-105"
            />
            {/* Structural corner accents */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-accent/60" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-accent/60" />
          </div>

          {/* Right: Narrative Description */}
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="text-[10px] tracking-[0.3em] font-bold text-accent uppercase block">
                DESIGN ETHOS
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide uppercase text-white leading-tight">
                FLUIDITY MEETS <br />STRUCTURAL INTEGRITY
              </h2>
            </div>
            
            <div className="space-y-6 text-zinc-400 text-xs sm:text-sm font-light leading-relaxed text-justify">
              <p>
                At CACAPO, we believe that fashion is an extension of structural art. 
                Our collections discard transient, loud trends in favor of silent, architectural aesthetics. 
                Every cowl drape, clean seam, and sharp line is mathematically optimized to drape organically, creating a visual dialogue between fabric and frame.
              </p>
              <p>
                We do not construct clothing; we assemble wearable sculptures. 
                By working primarily with pure natural fibers like organic mulberry silk, double-faced wool, and hand-combed cashmere, we ensure that tactile luxury matches our visual cleanliness.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: THE THREE PILLARS */}
        <section className="bg-zinc-950/60 border-y border-zinc-900 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-xl mx-auto mb-16 md:mb-24 space-y-4">
              <span className="text-[10px] tracking-[0.3em] font-bold text-accent uppercase block">
                OUR CORE VIRTUES
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-white">
                THE CACAPO METHOD
              </h2>
              <div className="w-12 h-0.5 bg-accent mx-auto mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  number: "01",
                  title: "ARCHITECTURAL FIT",
                  desc: "We analyze structural movement to engineer cuts that move seamlessly with the body. True bespoke proportions built into ready-to-wear luxury."
                },
                {
                  number: "02",
                  title: "MATERIAL HONESTY",
                  desc: "Sourcing premium natural textiles with no compromise on quality. Pure silks, fine leathers, and cashmere that deliver tactile comfort and durability."
                },
                {
                  number: "03",
                  title: "MINIMALIST ESSENTIALS",
                  desc: "Designing curated wardrobe foundations. Highly cohesive palettes, geometric details, and timeless statements that outlast seasons."
                }
              ].map((pillar, idx) => (
                <div 
                  key={idx} 
                  className="group flex flex-col justify-between bg-black/40 border border-zinc-900/80 p-6 sm:p-8 hover:border-accent/40 transition-all duration-700 hover:shadow-[0_0_30px_rgba(255,77,77,0.02)] relative"
                >
                  <div className="absolute top-0 right-0 p-4 text-[40px] font-black font-mono text-zinc-900/40 group-hover:text-accent/10 transition-colors">
                    {pillar.number}
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold tracking-widest text-zinc-100 uppercase border-b border-zinc-900 pb-3">
                      {pillar.title}
                    </h3>
                    <p className="text-zinc-500 text-xs font-light leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: CALL TO ACTION */}
        <section className="relative py-28 md:py-40 flex items-center justify-center overflow-hidden">
          {/* Glowing Red Accent Ambient */}
          <div className="absolute w-[30vw] h-[30vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-2xl mx-auto px-6 text-center space-y-8 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-zinc-200">
              DISCOVER THE COLLECTION
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm tracking-wide font-light max-w-md mx-auto leading-relaxed">
              Step into the archive and explore tailored pieces, sculpted footwear, and couture accessories.
            </p>
            <div className="pt-2">
              <Link 
                href="/shop" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-500 rounded-none cursor-pointer"
              >
                EXPLORE THE ARCHIVE
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
