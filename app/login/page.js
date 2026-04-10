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
  const [availableIps, setAvailableIps] = useState([]);
  const [step, setStep] = useState("login"); // 'login' | 'ip-selection'
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { theme, updateTheme } = useTheme();
  const { login, user, loading, updateUserIps } = useAuth();

  const cardRef = useRef(null);
  const formRef = useRef(null);
  const containerRef = useRef(null);

  // Already logged in → restore theme & redirect (only if active_ip is already set)
  useEffect(() => {
    if (loading) return;
    if (user) {
      const savedIp = localStorage.getItem("active_ip");
      if (savedIp) {
        // Has active IP = fully logged in session, restore and redirect
        const ip = JSON.parse(savedIp);
        if (ip?.primaryColor) {
          updateTheme({
            primaryColor: ip.primaryColor,
            secondaryColor: ip.secondaryColor || initialTheme.secondaryColor,
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
        primaryColor: ip.primaryColor || initialTheme.primaryColor,
        secondaryColor: ip.secondaryColor || initialTheme.secondaryColor,
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
      // Response: { data: [ { role, property: {...} }, ... ] }
      const ips = Array.isArray(data.data) ? data.data.map((item) => item.property) : [];

      // Save ips into context & localStorage so navbar dropdown works
      updateUserIps(ips);

      if (ips.length === 0) {
        selectIPAndRedirect(null);
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
          <div className="h-20 w-44 bg-white/50 rounded-2xl p-4 mb-6 flex items-center justify-center border border-gray-100/50 backdrop-blur-sm">
            <img src={theme.logo} alt="Logo" className="w-full h-auto object-contain scale-110" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-950 uppercase tracking-tight text-center leading-tight mb-2">
            Elev8 India Tournaments
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
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="pt-4">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "SIGNING IN..." : "SIGN IN"}
                </Button>
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
                      {ip.primaryColor && (
                        <div className="h-4 w-4 rounded-full border border-gray-100" style={{ backgroundColor: ip.primaryColor }} />
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
        </div>
      </div>
    </div>
  );
}
