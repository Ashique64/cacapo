"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import Navbar from "@/components/layout/Header/Navbar";
import SmoothScroll from "@/components/providers/SmoothScroll";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const closeDestination = (redirectUrl.startsWith("/checkout") || redirectUrl.startsWith("/account"))
    ? "/"
    : redirectUrl;

  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);

  const [authTab, setAuthTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // If user is already logged in, redirect away
  useEffect(() => {
    if (user && !loading) {
      router.push(redirectUrl);
    }
  }, [user, loading, redirectUrl, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and Password are required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (authTab === "signin") {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) throw signInErr;
      } else {
        if (!fullName.trim() || !phone.trim()) {
          throw new Error("Full Name and Phone Number are required for registration");
        }
        const { error: signUpErr } = await signUp(email, password, {
          full_name: fullName.trim(),
          phone: phone.trim()
        });
        if (signUpErr) throw signUpErr;
      }
      router.push(redirectUrl);
    } catch (err) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen h-screen md:overflow-hidden bg-black flex items-center justify-center text-white px-4 md:px-8 py-24 md:py-0 font-sans select-none">
      <style>{`
        .custom-input {
          background-color: #0c0c0e;
          border: 1px solid #27272a;
          color: white;
          padding: 0.75rem 1rem;
          width: 100%;
          outline: none;
          transition: all 0.3s ease;
          border-radius: 0px;
        }
        .custom-input:focus {
          border-color: #FF4D4D;
          box-shadow: 0 0 8px rgba(255, 77, 77, 0.15);
        }
      `}</style>
      <div className="relative w-full max-w-md border border-zinc-900 bg-zinc-950/40 p-8 space-y-6">
        
        {/* Close Button */}
        <Link
          href={closeDestination}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors flex items-center justify-center p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            CACAPO
          </span>
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white">
            {authTab === "signin" ? "SIGN IN" : "SIGN UP"}
          </h1>
          <p className="text-[11px] text-zinc-500 tracking-wider">
            Sign in or create an account to finalize your order details securely.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-900 text-xs font-bold tracking-widest font-sans">
          <button
            type="button"
            onClick={() => {
              setAuthTab("signin");
              setError(null);
            }}
            className={`w-1/2 py-3 text-center uppercase border-b transition-all duration-300 ${
              authTab === "signin" 
                ? "border-accent text-white" 
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab("signup");
              setError(null);
            }}
            className={`w-1/2 py-3 text-center uppercase border-b transition-all duration-300 ${
              authTab === "signup" 
                ? "border-accent text-white" 
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 border border-accent/20 bg-accent/5 text-accent text-xs tracking-wider leading-relaxed text-center font-medium">
              {error}
            </div>
          )}

          {authTab === "signup" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="custom-input text-xs tracking-wider py-2.5 px-3"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="custom-input text-xs tracking-wider py-2.5 px-3"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="custom-input text-xs tracking-wider py-2.5 px-3"
              placeholder="e.g. customer@cacapo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="custom-input text-xs tracking-wider py-2.5 px-3"
              placeholder="Minimum 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-white hover:bg-accent text-black hover:text-white text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 rounded-none disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> PROCESSING...
              </>
            ) : (
              authTab === "signin" ? "SIGN IN" : "CREATE ACCOUNT"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      }>
        <LoginContent />
      </Suspense>
    </SmoothScroll>
  );
}
