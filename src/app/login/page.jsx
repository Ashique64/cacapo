"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, X, Eye, EyeOff, Mail } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import Navbar from "@/components/layout/Header/Navbar";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { supabase } from "@/lib/supabase";

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

  const type = searchParams.get("type");
  const [authTab, setAuthTab] = useState(type === "recovery" ? "recovery" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLockout = localStorage.getItem("login_lockout_until");
      if (storedLockout) {
        const remaining = Math.ceil((parseInt(storedLockout) - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutTime(remaining);
          setError(`Too many failed attempts. Locked out. Try again in ${remaining}s.`);
        } else {
          localStorage.removeItem("login_lockout_until");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (lockoutTime <= 0) return;
    const timer = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("login_lockout_until");
          setFailedAttempts(0);
          setError(null);
          return 0;
        }
        setError(`Too many failed attempts. Locked out. Try again in ${prev - 1}s.`);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime]);

  // If user is already logged in, redirect away (except when in recovery flow)
  useEffect(() => {
    const handleRedirect = async () => {
      if (user && !loading && authTab !== "recovery") {
        try {
          const { data: isAdmin } = await supabase
            .from("admin_users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (isAdmin) {
            router.push("/admin");
          } else {
            router.push(redirectUrl);
          }
        } catch (e) {
          router.push(redirectUrl);
        }
      }
    };
    handleRedirect();
  }, [user, loading, redirectUrl, router, authTab]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (lockoutTime > 0) {
      setError(`Too many failed attempts. Locked out. Try again in ${lockoutTime}s.`);
      return;
    }

    // 1. Forgot password request flow
    if (authTab === "forgot") {
      if (!email.trim()) {
        setError("Email Address is required");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address");
        return;
      }

      setSubmitting(true);
      try {
        const siteUrl = window.location.origin.includes("localhost")
          ? "https://cacapo.vercel.app"
          : window.location.origin;
        const resetRedirect = `${siteUrl}/login?type=recovery`;
        const { error: resetErr } = await useAuthStore.getState().resetPasswordForEmail(email.trim(), resetRedirect);
        if (resetErr) throw resetErr;
        setVerificationSent(true);
      } catch (err) {
        setError(err.message || "Failed to send reset link.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. Recovery update flow (new password)
    if (authTab === "recovery") {
      if (!password.trim() || !confirmPassword.trim()) {
        setError("Password and Confirm Password are required");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setSubmitting(true);
      try {
        const { error: updateErr } = await useAuthStore.getState().updatePassword(password);
        if (updateErr) throw updateErr;
        
        // Sign out user to clear recovery session and force login
        await useAuthStore.getState().signOut();
        
        setSuccessMessage("Password updated successfully! Redirecting to sign in...");
        setTimeout(() => {
          setAuthTab("signin");
          setSuccessMessage(null);
          setPassword("");
          setConfirmPassword("");
          router.push("/login");
        }, 2500);
      } catch (err) {
        setError(err.message || "Failed to update password.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 3. Regular Sign In / Sign Up flows
    // Basic presence validation
    if (!email.trim() || !password.trim()) {
      setError("Email and Password are required");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    // Password length validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Registration validation checks
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

        // Perform admin check to determine redirect destination
        const sessionUser = useAuthStore.getState().user;
        if (sessionUser) {
          const { data: isAdmin } = await supabase
            .from("admin_users")
            .select("role")
            .eq("id", sessionUser.id)
            .maybeSingle();

          if (isAdmin) {
            router.push("/admin");
            return;
          }
        }
      } else {
        const siteUrl = window.location.origin.includes("localhost")
          ? "https://cacapo.vercel.app"
          : window.location.origin;
        const emailRedirectTo = `${siteUrl}/login`;

        const { data, error: signUpErr } = await signUp(
          email, 
          password, 
          {
            full_name: fullName.trim(),
            phone: phone.trim()
          },
          emailRedirectTo
        );
        if (signUpErr) throw signUpErr;

        if (data && !data.session) {
          setVerificationSent(true);
          setSubmitting(false);
          return;
        }
      }
      router.push(redirectUrl);
    } catch (err) {
      if (authTab === "signin") {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          const lockoutUntil = Date.now() + 60 * 1000;
          localStorage.setItem("login_lockout_until", lockoutUntil.toString());
          setLockoutTime(60);
          setError("Too many failed attempts. You have been locked out for 60 seconds.");
        } else {
          setError(err.message || "Authentication failed. Please verify credentials.");
        }
      } else {
        setError(err.message || "Authentication failed. Please verify credentials.");
      }
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
            {verificationSent 
              ? (authTab === "forgot" ? "RESET LINK SENT" : "VERIFY EMAIL") 
              : (authTab === "signin" 
                ? "SIGN IN" 
                : authTab === "signup" 
                  ? "SIGN UP" 
                  : authTab === "forgot" 
                    ? "FORGOT PASSWORD" 
                    : "UPDATE PASSWORD")}
          </h1>
          <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">
            {verificationSent 
              ? (authTab === "forgot" ? "Please check your inbox to proceed." : "Confirm your email address to activate your account.")
              : (authTab === "forgot" 
                ? "Retrieve access to your premium Cacapo account." 
                : authTab === "recovery"
                  ? "Define a new secure password for your account."
                  : "Sign in or create an account to finalize your order details securely.")}
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
                {authTab === "forgot" ? "We've sent a password reset link to:" : "We've sent a verification link to:"}
              </p>
              <p className="text-sm font-bold text-white tracking-wider break-all">
                {email}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed pt-2">
                {authTab === "forgot" 
                  ? "Please check your inbox and click the link to reset your password." 
                  : "Please check your inbox (and spam folder) and click the link to activate your account."}
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
            {/* Tab Selector - Hide for recovery and forgot flows */}
            {authTab !== "forgot" && authTab !== "recovery" && (
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
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 border border-accent/20 bg-accent/5 text-accent text-xs tracking-wider leading-relaxed text-center font-medium">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 border border-green-500/20 bg-green-500/5 text-green-500 text-xs tracking-wider leading-relaxed text-center font-medium">
                  {successMessage}
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

              {/* Email field - shown in sign in, sign up, forgot, but not recovery */}
              {authTab !== "recovery" && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="custom-input text-xs tracking-wider py-2.5 px-3 disabled:opacity-50"
                    placeholder="e.g. customer@cacapo.com"
                    disabled={submitting || lockoutTime > 0}
                    suppressHydrationWarning
                  />
                </div>
              )}

              {/* Password field - shown in sign in, sign up, recovery, but not forgot */}
              {authTab !== "forgot" && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {authTab === "recovery" ? "New Password" : "Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="custom-input text-xs tracking-wider py-2.5 px-3 pr-10 disabled:opacity-50"
                      disabled={submitting || lockoutTime > 0}
                      placeholder={authTab === "recovery" ? "Min 6 characters" : "Minimum 6 characters"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1 bg-transparent border-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {authTab === "signin" && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("forgot");
                          setError(null);
                          setPassword("");
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors p-0 bg-transparent border-none cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password field - shown in sign up and recovery */}
              {(authTab === "signup" || authTab === "recovery") && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {authTab === "recovery" ? "Confirm New Password" : "Confirm Password"}
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
                disabled={submitting || lockoutTime > 0}
                className="w-full py-3.5 bg-white hover:bg-accent text-black hover:text-white text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 rounded-none disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:cursor-not-allowed cursor-pointer"
              >
                {lockoutTime > 0 ? (
                  `LOCKED OUT (${lockoutTime}S)`
                ) : submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> PROCESSING...
                  </>
                ) : (
                  authTab === "signin" 
                    ? "SIGN IN" 
                    : authTab === "signup" 
                      ? "CREATE ACCOUNT" 
                      : authTab === "forgot" 
                        ? "SEND RESET LINK" 
                        : "UPDATE PASSWORD"
                )}
              </button>

              {authTab === "forgot" && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signin");
                    setError(null);
                    setEmail("");
                  }}
                  className="w-full py-3 border border-zinc-800 hover:border-accent text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-none flex items-center justify-center gap-2 cursor-pointer bg-transparent"
                >
                  BACK TO SIGN IN
                </button>
              )}
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
