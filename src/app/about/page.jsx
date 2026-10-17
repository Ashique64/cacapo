import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Link from "next/link";

export const metadata = {
  title: "About — Our Story",
  description:
    "Learn how CACAPO curates trendy imported fashion for Gen-Z girls. We source globally, fit-check everything, and deliver fresh drops weekly from our hub in Kerala.",
  alternates: {
    canonical: "https://cacapoclothing.com/about",
  },
  openGraph: {
    title: "About | CACAPO",
    description:
      "Learn how CACAPO curates trendy imported fashion for Gen-Z girls. Sourced globally, delivered fast.",
    url: "https://cacapoclothing.com/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (    <SmoothScroll>
      <Navbar />
      <main className="bg-background text-foreground min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO SECTION */}
        <section className="relative h-[65vh] flex items-center justify-center border-b border-card-border overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-background/10 via-background/40 to-background z-10" />
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-accent/5 rounded-full blur-[100px] pointer-events-none animate-pulse duration-5000" />
          
          <img 
            src="/Images/ethos_white.png" 
            alt="CACAPO Design Ethos" 
            className="absolute inset-0 w-full h-full object-cover opacity-45 object-center scale-100"
          />

          <div className="max-w-4xl mx-auto px-6 text-center relative z-20 space-y-6">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              TRENDY IMPORTED FASHION
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase leading-tight text-foreground font-sans">
              THE WORLD <br />OF <span className="text-accent">CACAPO</span>
            </h1>
            <p className="text-muted-text text-xs sm:text-sm md:text-base max-w-xl mx-auto tracking-wide font-light leading-relaxed">
              Founded on curating trendy imported fashion from across Asia. 
              We bring the latest global trends directly to Indian girls — fit-checked, affordable, and delivered fast.
            </p>
          </div>
        </section>

        {/* SECTION 1: THE BRAND PHILOSOPHY */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left: Beautiful Image Box with border details */}
          <div className="relative group aspect-4/3 bg-card-bg border border-card-border overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-t from-background/60 to-transparent z-10" />
            <img 
              src="/Images/clothing_2.png" 
              alt="Tailoring process" 
              className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
            />
            {/* Structural corner accents */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-accent/40" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-accent/40" />
          </div>

          {/* Right: Narrative Description */}
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="text-[10px] tracking-[0.3em] font-bold text-accent uppercase block">
                BRAND VISION
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide uppercase text-foreground leading-tight">
                FRESH TRENDS <br />FAST TO YOUR DOOR
              </h2>
            </div>
            
            <div className="space-y-6 text-muted-text text-xs sm:text-sm font-light leading-relaxed text-justify">
              <p>
                At CACAPO, we believe great style shouldn't break the bank. 
                We curate the most viral, trendy imported apparel, footwear, and accessories from global fashion capitals, bringing international aesthetics directly to Indian girls.
              </p>
              <p>
                Every single piece is fit-checked before it's listed, packed with care at our Kerala hub, and shipped quickly so you can wear what's trending right now. 
                Limited weekly drops mean you get exclusive styles that keep your rotation fresh and unique.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: THE THREE PILLARS */}
        <section className="bg-[#f9f8f6] border-y border-card-border py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="text-center max-w-xl mx-auto mb-16 md:mb-24 space-y-4">
              <span className="text-[10px] tracking-[0.3em] font-bold text-accent uppercase block">
                OUR CORE VIRTUES
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide text-foreground">
                THE CACAPO METHOD
              </h2>
              <div className="w-12 h-0.5 bg-accent mx-auto mt-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  number: "01",
                  title: "FIT-CHECKED SIZING",
                  desc: "We rigorously fit-check every piece before listing, ensuring true-to-size fits that flatter and feel great all day."
                },
                {
                  number: "02",
                  title: "AFFORDABLE TRENDS",
                  desc: "Sourcing direct from international fashion hubs to bring you the latest viral aesthetics at honest, accessible prices."
                },
                {
                  number: "03",
                  title: "LIMITED WEEKLY DROPS",
                  desc: "Curated in small quantities to keep your wardrobe exclusive. Once a drop sells out, it rarely comes back."
                }
              ].map((pillar, idx) => (
                <div 
                  key={idx} 
                  className="group flex flex-col justify-between bg-white border border-card-border p-6 sm:p-8 hover:border-accent/40 transition-all duration-700 hover:shadow-[0_10px_30px_rgba(0,0,0,0.02)] relative"
                >
                  <div className="absolute top-0 right-0 p-4 text-[40px] font-black font-mono text-zinc-150 group-hover:text-accent/10 transition-colors">
                    {pillar.number}
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold tracking-widest text-foreground uppercase border-b border-card-border pb-3">
                      {pillar.title}
                    </h3>
                    <p className="text-muted-text text-xs font-light leading-relaxed">
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
            <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-foreground">
              DISCOVER THE COLLECTION
            </h2>
            <p className="text-muted-text text-xs sm:text-sm tracking-wide font-light max-w-md mx-auto leading-relaxed">
              Step into our store and explore trending pieces, fresh footwear drops, and must-have accessories.
            </p>
            <div className="pt-2">
              <Link 
                href="/shop" 
                className="inline-flex items-center justify-center px-8 py-3.5 bg-foreground text-background hover:bg-accent hover:text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all duration-500 rounded-none cursor-pointer"
              >
                SHOP LATEST DROPS
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
