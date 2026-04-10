"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { initialTheme } from "@/config/theme";

export default function DashboardLayout({ children }) {
  const { theme, updateTheme } = useTheme();
  const { user, logout, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeIp, setActiveIp] = useState(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [enteredAsManager, setEnteredAsManager] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedIp = localStorage.getItem("active_ip");
    if (savedIp) {
      const ip = JSON.parse(savedIp);
      setActiveIp(ip);
      if (ip?.primaryColor) {
        updateTheme({
          primaryColor: ip.primaryColor,
          secondaryColor: ip.secondaryColor || "#f4f4f5",
          tournamentName: ip.name,
        });
      }
    }
    setEnteredAsManager(localStorage.getItem("entered_as_manager") === "true");
    setMounted(true);
  }, []);

  // Re-check enteredAsManager on route change
  useEffect(() => {
    setEnteredAsManager(localStorage.getItem("entered_as_manager") === "true");
  }, [pathname]);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading]);

  const handleLogout = () => {
    updateTheme(initialTheme);
    logout();
  };

  const handleSwitchToSuperAdmin = () => {
    localStorage.removeItem("entered_as_manager");
    localStorage.removeItem("active_ip");
    localStorage.removeItem("elev8_theme");
    setEnteredAsManager(false);
    setActiveIp(null);
    updateTheme(initialTheme);
    toast.success("Switched to Super Admin", {
      style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' }
    });
    router.push("/create-ip");
  };

  const navigation = [
    {
      name: "Dashboard", href: "/dashboard",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    {
      name: "Create IP", href: "/create-ip",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    },
    {
      name: "Roles & Permissions", href: "/roles-permissions",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    },
    {
      name: "Users", href: "/users",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
    {
      name: "Editions", href: "/editions",
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
  ];

  const filteredNav = navigation.filter(item => {
    if (item.name === "Create IP") return user?.role === "super_admin";
    if (item.name === "Users" || item.name === "Editions") return user?.role !== "super_admin";
    return true;
  });

  return (
    <div className="flex h-screen bg-[#fafafa] font-[family-name:var(--font-poppins)] text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isCollapsed ? "w-20" : "w-64"} bg-white border-r border-gray-100 hidden md:flex flex-col transition-all duration-300 relative z-30`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-10 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md border border-gray-100 flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:scale-110 transition-all duration-300 z-50 group"
          style={{ borderColor: `${theme.primaryColor}20` }}
        >
          <div className="absolute inset-0 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: theme.primaryColor }} />
          <svg className={`w-4 h-4 transition-transform duration-500 ease-out ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <div className="p-6 h-20 flex items-center border-b border-gray-100 overflow-hidden">
          <div className="flex items-center justify-center w-full px-2">
            <div className="h-10 w-full max-w-[120px] flex items-center justify-center">
              <img src={theme.logo} alt="Logo" className="h-full w-auto object-contain scale-125" />
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-8">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group relative ${isActive ? "text-white shadow-lg shadow-black/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                style={isActive ? { backgroundColor: theme.primaryColor } : {}}
              >
                <div className={`${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-900"}`}>{item.icon}</div>
                {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.name}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 text-white text-[10px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[100] whitespace-nowrap font-semibold uppercase tracking-widest shadow-xl" style={{ backgroundColor: theme.primaryColor }}>
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-semibold text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="ml-3 whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 z-20 shrink-0">
          <div className="flex items-center space-x-4 relative">
            {user?.role !== "super_admin" ? (
              <div className="flex items-center space-x-4">
                <div className="h-9 w-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center p-1.5 overflow-hidden shadow-sm">
                  {activeIp?.logo
                    ? <img src={activeIp.logo} alt="IP Logo" className="h-full w-full object-contain" />
                    : <div className="h-full w-full rounded-full bg-gray-100 flex items-center justify-center"><svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                  }
                </div>
                <div className="flex flex-col">
                  <div
                    className={`flex items-center space-x-2 ${user?.ips?.length > 1 ? 'cursor-pointer select-none' : ''}`}
                    onClick={() => user?.ips?.length > 1 && setIsSelectorOpen(!isSelectorOpen)}
                  >
                    <h2 className="text-[15px] font-bold text-gray-950 tracking-[0.05em] uppercase opacity-95 leading-none">{activeIp?.name || "Unknown IP"}</h2>
                    {user?.ips?.length > 1 && (
                      <div className="relative flex items-center justify-center">
                        <svg className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${isSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        {isSelectorOpen && (
                          <div className="absolute top-8 left-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-2 mb-1 border-b border-gray-50"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Switch Property</p></div>
                            {user.ips.map((ip) => (
                              <button key={ip.id} onClick={() => {
                                localStorage.setItem("active_ip", JSON.stringify(ip));
                                setActiveIp(ip);
                                setIsSelectorOpen(false);
                                if (ip?.primaryColor) updateTheme({ primaryColor: ip.primaryColor, secondaryColor: ip.secondaryColor || "#f4f4f5", tournamentName: ip.name });
                                toast.success(`Switched to ${ip.name}`, { style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' } });
                              }} className={`w-full flex items-center px-4 py-3 text-left transition-all hover:bg-gray-50 ${activeIp?.id === ip.id ? 'bg-gray-50/50' : ''}`}>
                                <div className="h-7 w-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center mr-3 text-[11px] font-bold text-gray-400">{ip.code?.substring(0, 2)}</div>
                                <div className="flex flex-col">
                                  <span className={`text-[13px] font-bold ${activeIp?.id === ip.id ? 'text-gray-950' : 'text-gray-600'}`}>{ip.name}</span>
                                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{ip.sport?.name || ip.sport}</span>
                                </div>
                                {activeIp?.id === ip.id && <div className="ml-auto h-2 w-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Property Manager</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col cursor-pointer" onClick={() => mounted && enteredAsManager && handleSwitchToSuperAdmin()}>
                <h2 className="text-[15px] font-bold text-gray-950 tracking-[0.08em] uppercase opacity-95 leading-none">Super Admin</h2>
                {mounted && enteredAsManager && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">Click to switch back</span>}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {mounted && user?.role === "super_admin" && enteredAsManager && (
              <button
                onClick={handleSwitchToSuperAdmin}
                className="relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] overflow-hidden"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <span className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(135deg, #fff 0%, transparent 60%)" }} />
                <svg className="w-3.5 h-3.5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                <span className="relative z-10">Switch to Super Admin</span>
              </button>
            )}
            <div className="flex flex-col items-end mr-1">
              <span className="text-[13px] font-bold text-gray-950 uppercase tracking-tight leading-none">{user?.username || "Admin"}</span>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.1em] mt-1">{user?.role === "super_admin" ? "Role: Super Admin" : "Role: IP Admin"}</span>
            </div>
            <div className="h-10 w-10 rounded-full border border-gray-100 bg-gray-50 flex items-center justify-center p-1 cursor-pointer hover:bg-gray-100 transition-all shadow-sm">
              <div className="h-full w-full rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: theme.primaryColor }}>
                {user?.avatar_initials || "AD"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:px-10 md:py-6 bg-[#fafafa] relative">
          <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="w-full h-full relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
