"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Header/Navbar";
import SmoothScroll from "@/components/providers/SmoothScroll";
import { supabase } from "@/lib/supabase";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const urlError = searchParams.get("error");
  const urlErrorDescription = searchParams.get("error_description");

  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "set_password" | "success" | "error" | "no_token"
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check initial state on mount without consuming tokens
  useEffect(() => {
    if (urlError) {
      setError(urlErrorDescription ? decodeURIComponent(urlErrorDescription) : "Invalid or expired link.");
      setStatus("error");
      return;
    }

    // Check hash for error or access token (implicit flow support)
    if (typeof window !== "undefined") {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const hashError = hashParams.get("error");
      const hashErrorDescription = hashParams.get("error_description");
      if (hashError) {
        setError(hashErrorDescription ? decodeURIComponent(hashErrorDescription) : "Invalid or expired link.");
        setStatus("error");
        return;
      }

      if (tokenHash || code || hashParams.get("access_token")) {
        setStatus("ready");
        return;
      }
    }

    if (tokenHash || code) {
      setStatus("ready");
      return;
    }

    // If no parameters at all, check if user already has an active session from recovery
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("set_password");
      } else {
        setStatus("no_token");
      }
    };
    checkExistingSession();
  }, [tokenHash, code, urlError, urlErrorDescription]);

  // User explicitly clicks "Proceed" - immune to automated email scanners
  const handleProceed = async () => {
    setVerifying(true);
    setError(null);

    try {
      if (tokenHash) {
        // Direct OTP token hash verification
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (verifyErr) throw verifyErr;
        setStatus("set_password");
      } else if (code) {
        // PKCE flow code exchange
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) throw exchangeErr;
        setStatus("set_password");
      } else if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || "";

        if (accessToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) throw setErr;
          setStatus("set_password");
        } else {
          throw new Error("No reset token found in URL.");
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("set_password");
        } else {
          throw new Error("No valid reset token found. Please request a new link.");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to verify reset link. The link may have expired.");
      setStatus("error");
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);

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
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      });
      if (updateErr) throw updateErr;

      // Sign out to clear recovery session and ensure clean sign-in
      await supabase.auth.signOut();

      setStatus("success");
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err) {
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-foreground px-4 md:px-8 py-16 md:py-24 font-sans select-none">
      <style>{`
        .custom-input {
          background-color: #ffffff;
          border: 1px solid #e5e0d8;
          color: #1a1a1a;
          padding: 0.75rem 1rem;
          width: 100%;
          outline: none;
          transition: all 0.3s ease;
          border-radius: 0px;
        }
        .custom-input::placeholder {
          color: #9ca3af;
        }
        .custom-input:focus {
          border-color: #FF4D4D;
          box-shadow: 0 0 8px rgba(255, 77, 77, 0.12);
        }
        .custom-input:disabled {
          background-color: #f9f8f6;
          color: #9ca3af;
        }
      `}</style>
      <div className="relative z-50 w-full max-w-md border border-card-border bg-white p-8 space-y-6 shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-text">
            CACAPO
          </span>
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-foreground">
            {status === "set_password"
              ? "SET NEW PASSWORD"
              : status === "success"
                ? "PASSWORD UPDATED"
                : status === "error" || status === "no_token"
                  ? "RESET PASSWORD"
                  : "CONFIRM RESET"}
          </h1>
          <p className="text-[11px] text-muted-text font-medium uppercase tracking-widest">
            {status === "set_password"
              ? "Define a new secure password for your account."
              : status === "success"
                ? "Your credentials have been securely updated."
                : status === "error" || status === "no_token"
                  ? "Security verification failed or link expired."
                  : "Click below to securely proceed to password reset."}
          </p>
        </div>

        {/* Loading state */}
        {status === "loading" && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-muted-text uppercase tracking-widest">Verifying request...</p>
          </div>
        )}

        {/* Step 1: Intermediary Confirmation Button (Immunizes against email scanner bots) */}
        {status === "ready" && (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[#f9f8f6] border border-card-border">
                <ShieldCheck className="w-8 h-8 text-foreground" />
              </div>
            </div>

            <p className="text-xs text-muted-text leading-relaxed">
              We received a request to reset your CACAPO account password. Click below to verify your request and set a new password.
            </p>

            {error && (
              <div className="p-3 border border-accent/20 bg-accent/5 text-accent text-xs tracking-wider leading-relaxed text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleProceed}
              disabled={verifying}
              className="w-full py-3.5 bg-foreground hover:bg-accent text-background text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 rounded-none border border-foreground hover:border-accent disabled:opacity-50 cursor-pointer"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> VERIFYING LINK...
                </>
              ) : (
                "PROCEED TO RESET PASSWORD"
              )}
            </button>

            <Link
              href="/login"
              className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-text hover:text-foreground transition-colors pt-2"
            >
              Back to Sign In
            </Link>
          </div>
        )}

        {/* Step 2: Set New Password Form */}
        {status === "set_password" && (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {error && (
              <div className="p-3 border border-accent/20 bg-accent/5 text-accent text-xs tracking-wider leading-relaxed text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-text">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="custom-input text-xs tracking-wider py-2.5 px-3 pr-10 disabled:opacity-50"
                  disabled={submitting}
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text hover:text-foreground transition-colors p-1 bg-transparent border-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-text">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="custom-input text-xs tracking-wider py-2.5 px-3 pr-10 disabled:opacity-50"
                  disabled={submitting}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text hover:text-foreground transition-colors p-1 bg-transparent border-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-foreground hover:bg-accent text-background text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 rounded-none border border-foreground hover:border-accent disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> UPDATING PASSWORD...
                </>
              ) : (
                "UPDATE PASSWORD"
              )}
            </button>
          </form>
        )}

        {/* Step 3: Success message */}
        {status === "success" && (
          <div className="space-y-6 py-6 text-center">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground tracking-wider">
                Password updated successfully!
              </p>
              <p className="text-xs text-muted-text leading-relaxed">
                Redirecting you to sign in with your new credentials...
              </p>
            </div>

            <Link
              href="/login"
              className="block w-full py-3.5 bg-foreground hover:bg-accent text-background text-xs font-bold tracking-widest uppercase transition-all duration-300 text-center rounded-none border border-foreground hover:border-accent"
            >
              SIGN IN NOW
            </Link>
          </div>
        )}

        {/* Step 4: Error or missing token */}
        {(status === "error" || status === "no_token") && (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border border-red-200">
                <AlertCircle className="w-8 h-8 text-accent" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground tracking-wider">
                {status === "no_token" ? "No Reset Link Found" : "Invalid or Expired Link"}
              </p>
              <p className="text-xs text-muted-text leading-relaxed">
                {error || "This password reset link is invalid or has expired. Please request a new link to reset your password."}
              </p>
            </div>

            <Link
              href="/login?tab=forgot"
              className="block w-full py-3.5 bg-foreground hover:bg-accent text-background text-xs font-bold tracking-widest uppercase transition-all duration-300 text-center rounded-none border border-foreground hover:border-accent"
            >
              REQUEST NEW LINK
            </Link>

            <Link
              href="/login"
              className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-text hover:text-foreground transition-colors pt-1"
            >
              Back to Sign In
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </SmoothScroll>
  );
}
