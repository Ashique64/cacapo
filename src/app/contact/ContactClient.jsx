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
      <main className="bg-black text-white min-h-screen pt-24 select-none overflow-x-hidden font-sans">
        
        {/* HERO HEADER */}
        <section className="relative py-20 border-b border-zinc-900 overflow-hidden flex flex-col items-center justify-center text-center">
          {/* Ambient light glow */}
          <div className="absolute top-0 w-[50vw] h-[50vh] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-6 space-y-4 relative z-10">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] text-accent uppercase block">
              CLIENT SERVICES
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-white">
              CONNECT WITH <span className="text-accent">CACAPO</span>
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm tracking-wide font-light max-w-md mx-auto leading-relaxed">
              Inquiries regarding bespoke sizing orders, shipping tracking, or collection consultation.
            </p>
          </div>
        </section>

        {/* CONTENT SECTION: Grid layout */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Contact details (Lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-4">
              <h2 className="text-xs font-bold tracking-[0.3em] text-accent uppercase border-b border-zinc-900 pb-3">
                THE ATELIER HEADQUARTERS
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed text-justify">
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
                  detail: "+91 98460 00000"
                },
                {
                  icon: <MapPin className="w-4 h-4 text-accent" />,
                  title: "ATELIER SHOWROOM DESK",
                  detail: "Cacapo House, 4th Floor, Design District, Mumbai, India"
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-none shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                      {item.title}
                    </span>
                    <span className="block text-xs sm:text-sm text-zinc-300 font-medium font-mono">
                      {item.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Contact form (Lg: 7 cols) */}
          <div className="lg:col-span-7 bg-zinc-950/40 border border-zinc-900 p-8 sm:p-10 relative">
            {/* Structural corner details */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t border-l border-accent/40" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-accent/40" />

            {success ? (
              <div className="text-center py-16 space-y-6 animate-fadeIn">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto animate-pulse" />
                <div className="space-y-2">
                  <h3 className="text-sm font-bold tracking-widest text-white uppercase">MESSAGE TRANSMITTED</h3>
                  <p className="text-zinc-500 text-xs font-light tracking-wide max-w-sm mx-auto leading-relaxed">
                    Thank you. Your concierge request has been safely logged. A CACAPO advisor will contact you within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => setSuccess(false)}
                  className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 text-[10px] font-bold tracking-widest text-white hover:bg-white hover:text-black uppercase transition-all rounded-none cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs tracking-wider">
                <h3 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-900 pb-3 flex items-center gap-2">
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
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">YOUR NAME *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                      placeholder="e.g. ALESSANDRA"
                    />
                  </div>
                  
                  {/* Email input */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all font-mono"
                      placeholder="e.g. name@domain.com"
                    />
                  </div>
                </div>

                {/* Subject input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">SUBJECT *</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all"
                    placeholder="e.g. Order Tracking or Bespoke Sizing consultation"
                  />
                </div>

                {/* Message input */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500">YOUR INQUIRY *</label>
                  <textarea
                    required
                    rows="5"
                    value={form.message}
                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-accent text-white px-3.5 py-2.5 outline-none rounded-none transition-all resize-none"
                    placeholder="Explain details of your request..."
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-white text-black hover:bg-accent hover:text-white text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-500 rounded-none flex items-center justify-center gap-2 cursor-pointer disabled:bg-zinc-800 disabled:text-zinc-500 border-none"
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
