"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import gsap from "gsap";
import { initialTheme } from "@/config/theme";
import { Button, Input } from "@/components/UI";
import ThreeBackground from "@/components/ThreeBackground";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [availableIps, setAvailableIps] = useState([]);
  const [step, setStep] = useState("login"); // 'login' | 'ip-selection' | 'forgot-password' | 'reset-password'
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  const router = useRouter();
  const { theme, updateTheme } = useTheme();
  const { login, user, loading, updateUserIps } = useAuth();

  const cardRef = useRef(null);
  const formRef = useRef(null);
  const containerRef = useRef(null);

  // Check for reset token in URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        setResetToken(token);
        setStep("reset-password");
      }
    }
  }, []);

  // Already logged in → restore theme & redirect (only if active_ip is already set)
  useEffect(() => {
    if (loading) return;
    if (user) {
      const savedIp = localStorage.getItem("active_ip");
      if (savedIp) {
        // Has active IP = fully logged in session, restore and redirect
        const ip = JSON.parse(savedIp);
        if (ip?.primary_color) {
          updateTheme({
            primary_color: ip.primary_color,
            secondary_color: ip.secondary_color || initialTheme.secondary_color,
            tournamentName: ip.name,
          });
        }
        router.replace("/dashboard");
      } else if (user.role === "super_admin") {
        // Super admin has no active_ip but is still valid
        router.replace("/dashboard");
      }
      // Admin without active_ip = needs property selection, don't redirect
    } else {
      // Not logged in - show entrance animation
      const tl = gsap.timeline();
      tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1 })
        .fromTo(cardRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.5");
    }
  }, [user, loading]);

  // Select an IP, apply its theme, save to localStorage, go to dashboard
  const selectIPAndRedirect = (ip) => {
    if (ip) {
      localStorage.setItem("active_ip", JSON.stringify(ip));
      updateTheme({
        primary_color: ip.primary_color || initialTheme.primary_color,
        secondary_color: ip.secondary_color || initialTheme.secondary_color,
        tournamentName: ip.name,
      });
    } else {
      localStorage.removeItem("active_ip");
    }
    gsap.to(cardRef.current, {
      y: -40, opacity: 0, filter: "blur(20px)", duration: 0.8, ease: "power4.inOut",
      onComplete: () => router.push("/dashboard"),
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please enter email and password."); return; }

    setIsLoading(true);
    const result = await login(email, password);

    if (!result.success) {
      toast.error(result.error);
      setIsLoading(false);
      gsap.fromTo(cardRef.current, { x: -10 }, { x: 0, duration: 0.3, ease: "elastic.out(1, 0.3)", repeat: 2 });
      return;
    }

    toast.success("Login successful!", {
      style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
    });

    if (result.user.role === "super_admin") {
      selectIPAndRedirect(null);
      return;
    }

    // Admin → fetch assigned properties
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_MY_PROPERTIES_ENDPOINT}`,
        { headers: { Authorization: `Bearer ${result.token}` } }
      );

      const data = await res.json();
      const items = Array.isArray(data.data) ? data.data : [];
      const ips = items.map((item) => item.property);

      // permissions is a flat array of code strings: ["users:add", "editions:view", ...]
      const permCodes = new Set();
      items.forEach(item => {
        if (Array.isArray(item.permissions)) {
          item.permissions.forEach(code => permCodes.add(code));
        }
      });
      localStorage.setItem("user_permissions", JSON.stringify([...permCodes]));

      // Save ips into context & localStorage so navbar dropdown works
      updateUserIps(ips);

      if (ips.length === 0) {
        // No properties assigned — show blocked page
        gsap.to(cardRef.current, {
          y: -40, opacity: 0, filter: "blur(20px)", duration: 0.8, ease: "power4.inOut",
          onComplete: () => router.push("/no-access"),
        });
      } else if (ips.length === 1) {
        selectIPAndRedirect(ips[0]);
      } else {
        // Show property selection screen
        setAvailableIps(ips);
        gsap.to(formRef.current, {
          x: -20, opacity: 0, duration: 0.4,
          onComplete: () => {
            setStep("ip-selection");
            setIsLoading(false);
            gsap.fromTo(formRef.current, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 });
          },
        });
      }
    } catch {
      selectIPAndRedirect(null);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center p-6 bg-[#fafafa] relative overflow-hidden">
      <ThreeBackground />

      <div ref={cardRef} className="w-full max-w-md bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.04)] border border-white/50 p-8 md:p-10 relative z-10 overflow-hidden">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6">

          </div>
          <h1 className="text-2xl font-semibold text-gray-950 uppercase tracking-tight text-center leading-tight mb-2">
            Performance Tracker
          </h1>
          <div className="flex items-center space-x-2">
            <div className="h-[1.5px] w-4 bg-gray-200"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.3em]">Administrator Portal</span>
            <div className="h-[1.5px] w-4 bg-gray-200"></div>
          </div>
        </div>

        <div ref={formRef}>
          {/* Step 1 - Login form */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
              {/* Password with show/hide */}
              <div className="flex flex-col space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Password</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-gray-950/5 focus:border-gray-950 pr-12 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#f9fafb_inset]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="pt-4">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "SIGNING IN..." : "SIGN IN"}
                </Button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    gsap.to(formRef.current, {
                      x: -20, opacity: 0, duration: 0.3, ease: "power2.in",
                      onComplete: () => {
                        setStep("forgot-password");
                        gsap.fromTo(formRef.current, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
                      }
                    });
                  }}
                  className="text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* Step 2 - Property selection */}
          {step === "ip-selection" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Select Active Property</h2>
                <p className="text-xs text-gray-300">Choose a property to continue.</p>
              </div>

              <div className="space-y-3">
                {availableIps.map((ip) => (
                  <button
                    key={ip.id}
                    onClick={() => selectIPAndRedirect(ip)}
                    className="w-full flex items-center justify-between p-4 bg-white/50 border border-gray-100 rounded-xl hover:border-gray-950 hover:bg-white transition-all group backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {ip.logo
                          ? <img src={ip.logo} alt={ip.name} className="w-full h-full object-contain p-1" />
                          : <span className="text-[10px] font-bold text-gray-300 uppercase">{ip.name?.slice(0, 2)}</span>}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-gray-950 uppercase tracking-tight">{ip.name}</span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">{ip.sport?.name || ip.code}</span>
                      </div>
                    </div>
                    {/* Color swatches */}
                    <div className="flex items-center gap-2">
                      {ip.primary_color && (
                        <div className="h-4 w-4 rounded-full border border-gray-100" style={{ backgroundColor: ip.primary_color }} />
                      )}
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Step 3 - Forgot Password */}
          {step === "forgot-password" && (
            <ForgotPasswordForm
              formRef={formRef}
              cardRef={cardRef}
              onBack={() => {
                gsap.to(formRef.current, {
                  x: 20, opacity: 0, duration: 0.3, ease: "power2.in",
                  onComplete: () => {
                    setStep("login");
                    gsap.fromTo(formRef.current, { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
                  }
                });
              }}
            />
          )}

          {/* Step 4 - Reset Password (from email link) */}
          {step === "reset-password" && (
            <ResetPasswordForm
              token={resetToken}
              onSuccess={() => {
                setResetToken(null);
                // Clear token from URL
                window.history.replaceState({}, "", "/login");
                gsap.to(formRef.current, {
                  x: -20, opacity: 0, duration: 0.3, ease: "power2.in",
                  onComplete: () => {
                    setStep("login");
                    gsap.fromTo(formRef.current, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
                  }
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordForm({ formRef, onBack }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email address."); return; }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_FORGOT_PASSWORD_ENDPOINT}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (res.ok && data.status === 1) {
        setSent(true);
        toast.success(data.message || "Reset link sent! Check your inbox.", {
          style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
        });
      } else {
        toast.error(data.message || "Failed to send reset link.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-gray-950 uppercase tracking-widest">Check Your Inbox</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            A password reset link has been sent to <span className="font-semibold text-gray-700">{email}</span>. Follow the instructions in the email to reset your password.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors flex items-center gap-1.5 mx-auto"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-gray-950 uppercase tracking-widest">Forgot Password</h2>
        <p className="text-xs text-gray-400">Enter your email and we'll send you a reset link.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Email Address"
          type="email"
          autoFocus
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "SENDING..." : "Send Reset Link"}
        </Button>
      </form>
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors flex items-center gap-1.5 mx-auto"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

function ResetPasswordForm({ token, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_RESET_PASSWORD_ENDPOINT}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: newPassword }),
        }
      );
      const data = await res.json();
      if (res.ok && data.status === 1) {
        toast.success(data.message || "Password reset successfully! Please sign in.", {
          style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
        });
        onSuccess();
      } else {
        toast.error(data.message || "Failed to reset password. Link may have expired.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-1">
        <h2 className="text-sm font-bold text-gray-950 uppercase tracking-widest">Reset Password</h2>
        <p className="text-xs text-gray-400">Enter your new password below.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="flex flex-col space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              placeholder="••••••••"
              required
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-5 py-4 pr-12 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-gray-950/5 focus:border-gray-950"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 transition-colors">
              {showNew
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-5 py-4 pr-12 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-gray-950/5 focus:border-gray-950"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-950 transition-colors">
              {showConfirm
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Match indicator */}
        {confirmPassword && (
          <p className={`text-[10px] font-bold uppercase tracking-widest px-1 ${newPassword === confirmPassword ? "text-emerald-500" : "text-red-400"}`}>
            {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
          </p>
        )}

        <div className="pt-2">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "RESETTING..." : "Reset Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
