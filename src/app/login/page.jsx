"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, X, Eye, EyeOff, Mail } from "lucide-react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // If user is already logged in, redirect away
  useEffect(() => {
    if (user && !loading) {
      router.push(redirectUrl);
    }
  }, [user, loading, redirectUrl, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. Basic presence validation
    if (!email.trim() || !password.trim()) {
      setError("Email and Password are required");
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    // 3. Password length validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // 4. Registration validation checks
    if (authTab === "signup") {
      if (!fullName.trim()) {
        setError("Full Name is required");
        return;
      }
      if (!phone.trim()) {
        setError("Phone Number is required");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setSubmitting(true);

    try {
      if (authTab === "signin") {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) throw signInErr;
      } else {
        const { data, error: signUpErr } = await signUp(email, password, {
          full_name: fullName.trim(),
          phone: phone.trim()
        });
        if (signUpErr) throw signUpErr;

        if (data && !data.session) {
          setVerificationSent(true);
          setSubmitting(false);
          return;
        }
      }
      router.push(redirectUrl);
    } catch (err) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white px-4 md:px-8 py-16 md:py-24 font-sans select-none">
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
      <div className="relative z-50 w-full max-w-md border border-zinc-900 bg-zinc-950 p-8 space-y-6 shadow-2xl">
        
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
            {verificationSent ? "VERIFY EMAIL" : (authTab === "signin" ? "SIGN IN" : "SIGN UP")}
          </h1>
          <p className="text-[11px] text-zinc-500 tracking-wider">
            {verificationSent 
              ? "Confirm your email address to activate your account."
              : "Sign in or create an account to finalize your order details securely."}
          </p>
        </div>

        {verificationSent ? (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800">
                <Mail className="w-6 h-6 text-accent animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 leading-relaxed">
                We've sent a verification link to:
              </p>
              <p className="text-sm font-bold text-white tracking-wider break-all">
                {email}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed pt-2">
                Please check your inbox (and spam folder) and click the link to activate your account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerificationSent(false);
                setAuthTab("signin");
                setPassword("");
                setConfirmPassword("");
                setError(null);
              }}
              className="w-full py-3.5 bg-white hover:bg-accent text-black hover:text-white text-xs font-bold tracking-widest uppercase transition-all duration-300 rounded-none"
            >
              BACK TO SIGN IN
            </button>
          </div>
        ) : (
          <>
            {/* Tab Selector */}
            <div className="flex border-b border-zinc-900 text-xs font-bold tracking-widest font-sans">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signin");
                  setError(null);
                  setPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
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
                  setPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
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
                  suppressHydrationWarning
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="custom-input text-xs tracking-wider py-2.5 px-3 pr-10"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1 bg-transparent border-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authTab === "signup" && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="custom-input text-xs tracking-wider py-2.5 px-3 pr-10"
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1 bg-transparent border-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

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
          </>
        )}

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
