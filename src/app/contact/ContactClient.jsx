"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Header/Navbar";
import Footer from "@/components/layout/Footer/Footer";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver message. Please check parameters.");
      }

      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SmoothScroll>
      <Navbar />
      <main className="bg-background text-foreground min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO HEADER */}
        <section className="relative py-20 border-b border-card-border overflow-hidden flex flex-col items-center justify-center text-center">
          {/* Ambient light glow */}
          <div className="absolute top-0 w-[50vw] h-[50vh] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-6 space-y-4 relative z-10">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              CLIENT SERVICES
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-foreground">
              CONNECT WITH <span className="text-accent">CACAPO</span>
            </h1>
            <p className="text-muted-text text-xs sm:text-sm tracking-wide font-light max-w-md mx-auto leading-relaxed">
              Inquiries regarding bespoke sizing orders, shipping tracking, or collection consultation.
            </p>
          </div>
        </section>

        {/* CONTENT SECTION: Grid layout */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Contact details (Lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-[0.3em] text-accent uppercase border-b border-card-border pb-3">
                THE ATELIER HEADQUARTERS
              </h2>
              <p className="text-muted-text text-xs sm:text-sm font-light leading-relaxed text-justify">
                Our customer assistance team is available Monday through Friday, 10:00 AM to 6:00 PM IST. 
                Whether you require detailed fit parameters or custom styling assistance, the CACAPO desk is here to consult.
              </p>
            </div>

            {/* Inquiries Info list */}
            <div className="space-y-6">
              {[
                {
                  icon: <Mail className="w-4 h-4 text-accent" />,
                  title: "EDITORIAL & GENERAL INQUIRIES",
                  detail: "support@cacapoclothing.com"
                },
                {
                  icon: <Phone className="w-4 h-4 text-accent" />,
                  title: "CLIENT HOTLINE SUPPORT",
                  detail: "+91 62386 76820"
                },
                {
                  icon: <MapPin className="w-4 h-4 text-accent" />,
                  title: "ATELIER SHOWROOM DESK",
                  detail: "Building No: 15/451B,452B, Ottu company building, Pandikkad road, Melattur, Kerala 679326"
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="p-3 bg-card-bg border border-card-border rounded-none shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-muted-text">
                      {item.title}
                    </span>
                    <span className="block text-xs sm:text-sm text-foreground font-medium font-mono">
                      {item.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Contact form (Lg: 7 cols) */}
          <div className="lg:col-span-7 bg-card-bg border border-card-border p-8 sm:p-10 relative">
            {/* Structural corner details */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t border-l border-accent/40" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-accent/40" />

            {success ? (
              <div className="text-center py-16 space-y-6 animate-fadeIn">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto animate-pulse" />
                <div className="space-y-2">
                  <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">MESSAGE TRANSMITTED</h3>
                  <p className="text-muted-text text-xs font-light tracking-wide max-w-sm mx-auto leading-relaxed">
                    Thank you. Your concierge request has been safely logged. A CACAPO advisor will contact you within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-2.5 bg-zinc-100 border border-card-border text-[10px] font-bold tracking-widest text-foreground hover:bg-foreground hover:text-background uppercase transition-all rounded-none cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs tracking-wider">
                <h3 className="text-[10px] font-bold tracking-widest text-muted-text uppercase border-b border-card-border pb-3 flex items-center gap-2">
                  CONCIERGE DIRECT INQUIRY
                </h3>
                
                {error && (
                  <div className="p-3.5 border border-accent/25 bg-accent/5 text-accent text-xs font-semibold leading-relaxed tracking-wider text-center">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name input */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-text">YOUR NAME *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-background border border-card-border focus:border-accent text-foreground px-3.5 py-2.5 outline-none rounded-none transition-all"
                      placeholder="e.g. ALESSANDRA"
                    />
                  </div>
                  
                  {/* Email input */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-text">EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-background border border-card-border focus:border-accent text-foreground px-3.5 py-2.5 outline-none rounded-none transition-all font-mono"
                      placeholder="e.g. name@domain.com"
                    />
                  </div>
                </div>

                {/* Subject input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-text">SUBJECT *</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-background border border-card-border focus:border-accent text-foreground px-3.5 py-2.5 outline-none rounded-none transition-all"
                    placeholder="e.g. Order Tracking or Bespoke Sizing consultation"
                  />
                </div>

                {/* Message input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-muted-text">YOUR INQUIRY *</label>
                  <textarea
                    required
                    rows="5"
                    value={form.message}
                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-background border border-card-border focus:border-accent text-foreground px-3.5 py-2.5 outline-none rounded-none transition-all resize-none"
                    placeholder="Explain details of your request..."
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-foreground text-background hover:bg-accent hover:text-white text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-500 rounded-none flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-100 disabled:text-zinc-400 border-none"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      TRANSMITTING...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      TRANSMIT INQUIRY
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </SmoothScroll>
  );
}
