"use client";

import { useEffect, useRef, useState, } from "react";
import gsap from "gsap";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";




const ChartCard = ({ title, subtitle, children, refEl, className = "" }) => (
  <div ref={refEl} className={`bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 ${className}`}>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-0.5">{subtitle}</p>
    <p className="text-sm font-bold text-gray-950 mb-5">{title}</p>
    {children}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { theme } = useTheme();
  const { user, activeIp, loading: authLoading } = useAuth();
  const pageRef = useRef(null);
  const statsRef = useRef([]);
  const chartsRef = useRef([]);

  const [editions, setEditions] = useState([]);
  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showIpDashboard, setShowIpDashboard] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [adminDashboardData, setAdminDashboardData] = useState(null);

  const P = theme.primary_color;
  const S = theme.secondary_color;

  const PIE_COLORS = [P, S, `${P}`, `${S}`, `${P}`];

  const isSuperAdmin = user?.role === "super_admin";
  const enteredAsManager = typeof window !== "undefined" && localStorage.getItem("entered_as_manager") === "true";
  const showSuperAdminDashboard = isSuperAdmin && !enteredAsManager;

  // Initialize on mount - wait for AuthContext to load
  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (authLoading) {

      return;
    }

    if (mounted) return; // Already initialized

    setMounted(true);

    // Check if super admin without entered_as_manager
    if (showSuperAdminDashboard) {
      fetchAdminDashboard();
      return;
    }

    // IMPORTANT: Always check localStorage first for immediate state
    const storedIp = localStorage.getItem("active_ip");
    const parsedStoredIp = storedIp ? JSON.parse(storedIp) : null;

    // Use stored IP if available, otherwise wait for AuthContext
    const currentActiveIp = parsedStoredIp || activeIp;



    const shouldShowIpDashboard = !!currentActiveIp;
    setShowIpDashboard(shouldShowIpDashboard);

    if (shouldShowIpDashboard) {
      fetchEditions();
    }
  }, [authLoading, activeIp, mounted, showSuperAdminDashboard]);

  // Update when activeIp changes from AuthContext
  useEffect(() => {
    if (!mounted) return;

    // Check if activeIp changed and we need to update
    const storedIp = localStorage.getItem("active_ip");
    const parsedStoredIp = storedIp ? JSON.parse(storedIp) : null;
    const currentActiveIp = activeIp || parsedStoredIp;

    const shouldShowIpDashboard = !!currentActiveIp;



    // Only update if state actually changed
    if (shouldShowIpDashboard !== showIpDashboard) {
      setShowIpDashboard(shouldShowIpDashboard);

      if (shouldShowIpDashboard && editions.length === 0) {
        fetchEditions();
      }
    }
  }, [activeIp, mounted, showIpDashboard, editions.length]);

  useEffect(() => {

    if (showIpDashboard && selectedEditionId) {
      fetchDashboardData();
    }
  }, [selectedEditionId, showIpDashboard]);

  const fetchEditions = async () => {
    // Get activeIp from AuthContext or localStorage
    const storedIp = localStorage.getItem("active_ip");
    const currentActiveIp = storedIp ? JSON.parse(storedIp) : activeIp;



    if (!currentActiveIp?.id) {

      return;
    }


    const result = await apiClient.get(
      `${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}?property_id=${currentActiveIp.id}`
    );



    if (result.success) {
      const editionsData = result.data?.data?.editions || result.data?.editions || result.data?.data || [];

      setEditions(Array.isArray(editionsData) ? editionsData : []);

      // Auto-select first edition if available
      if (editionsData.length > 0) {

        setSelectedEditionId(editionsData[0].id);
      } else {

      }
    } else {

      toast.error("Failed to load editions");
    }
  };

  const fetchDashboardData = async () => {
    if (!selectedEditionId) {

      return;
    }


    setLoading(true);
    const result = await apiClient.get(
      `${process.env.NEXT_PUBLIC_ANALYTICS_IP_DASHBOARD_ENDPOINT}?edition_id=${selectedEditionId}`
    );

    if (result.success) {

      setDashboardData(result.data?.data || result.data);
    } else {

      toast.error(result.error || "Failed to load dashboard data");
    }
    setLoading(false);
  };

  const fetchAdminDashboard = async () => {
    setLoading(true);
    const result = await apiClient.get(
      `${process.env.NEXT_PUBLIC_ANALYTICS_ADMIN_DASHBOARD_ENDPOINT}`
    );

    if (result.success) {
      setAdminDashboardData(result.data?.data || result.data);
    } else {
      toast.error(result.error || "Failed to load admin dashboard data");
    }
    setLoading(false);
  };

  const STAT_CARDS = [
    { label: "Total IPs", value: "4", sub: "+1 this month", icon: "🏆", trend: 25, color: P },
    { label: "Active Editions", value: "3", sub: "2 upcoming", icon: "📅", trend: 0, color: "#f59e0b" },
    { label: "Total Users", value: "28", sub: "+5 this week", icon: "👥", trend: 18, color: "#10b981" },
    { label: "Matches Played", value: "112", sub: "Season total", icon: "⚡", trend: 12, color: "#6366f1" },
  ];

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    tl.fromTo(statsRef.current,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" }, "-=0.2");
    tl.fromTo(chartsRef.current,
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.1, ease: "power3.out" }, "-=0.3");
  }, []);

  return (
    <div ref={pageRef} className="space-y-6 opacity-0">

      {/* Header */}
      <div className="px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="h-1 w-6 rounded-full" style={{ backgroundColor: P }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-400">Overview</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Dashboard</h1>
            <p className="text-[13px] text-gray-400">
              {showSuperAdminDashboard ? "Global system overview." : "Tournament performance at a glance."}
            </p>
          </div>

          {/* Edition Selector - Shows when IP is selected */}
          {showIpDashboard && editions.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Edition:</label>
              <select
                value={selectedEditionId}
                onChange={(e) => setSelectedEditionId(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all"
                style={{ focusRingColor: P }}
              >
                {editions.map((edition) => (
                  <option key={edition.id} value={edition.id}>
                    {edition.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Super Admin Dashboard */}
      {showSuperAdminDashboard && (
        <>
          {/* Loading State */}
          {loading && (
            <div className="px-4">
              <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 mb-3" style={{ color: P }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-semibold text-gray-400">Loading admin dashboard...</p>
              </div>
            </div>
          )}

          {/* No Data State */}
          {!loading && !adminDashboardData && (
            <div className="px-4">
              <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-950 mb-1">No Dashboard Data</p>
                <p className="text-xs text-gray-400">Admin dashboard data is not available yet.</p>
              </div>
            </div>
          )}

          {/* Admin Dashboard Content */}
          {!loading && adminDashboardData && (
            <>
              {/* System Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-4">
                {[
                  { label: "Total Properties", value: adminDashboardData.system_overview?.total_properties, icon: "🏢", color: P },
                  { label: "Total Users", value: adminDashboardData.system_overview?.total_users, icon: "👥", color: "#10b981" },
                  { label: "Total Editions", value: adminDashboardData.system_overview?.total_editions, icon: "📅", color: "#f59e0b" },
                  { label: "Active Editions", value: adminDashboardData.system_overview?.active_editions, icon: "✅", color: "#6366f1" },
                  { label: "Pending Approvals", value: adminDashboardData.system_overview?.pending_approvals, icon: "⏳", color: "#ec4899" },
                ].map((stat, i) => (
                  <div key={i} ref={el => statsRef.current[i] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ backgroundColor: stat.color }} />
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${stat.color}15` }}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-3xl font-black text-gray-950 tracking-tight">{stat.value?.toLocaleString() || 0}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mt-1 leading-tight">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Change Request Queue & Data Quality */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4">
                {/* Change Request Queue */}
                <div ref={el => chartsRef.current[0] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Change Request Queue</h3>
                    <p className="text-xs text-gray-400 mt-1">Approval workflow status</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Pending", value: adminDashboardData.change_request_queue?.pending, color: "#f59e0b" },
                      { label: "Approved Today", value: adminDashboardData.change_request_queue?.approved_today, color: "#10b981" },
                      { label: "Rejected Today", value: adminDashboardData.change_request_queue?.rejected_today, color: "#ef4444" },
                      { label: "This Week Total", value: adminDashboardData.change_request_queue?.this_week_total, color: P },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                          <span className="text-lg font-black text-gray-950">{item.value?.toLocaleString() || 0}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min((item.value / Math.max(adminDashboardData.change_request_queue?.this_week_total || 1, 1)) * 100, 100)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Quality Metrics */}
                <div ref={el => chartsRef.current[1] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Data Quality</h3>
                    <p className="text-xs text-gray-400 mt-1">Metric values & approval rates</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Total Metrics value",
                        value: adminDashboardData.data_quality?.total_metric_values,
                        color: "#6366f1",
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        )
                      },
                      {
                        label: "Approved",
                        value: adminDashboardData.data_quality?.approved_metric_values,
                        color: "#10b981",
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )
                      },
                      {
                        label: "Approval Rate",
                        value: `${adminDashboardData.data_quality?.approval_rate_percent || 0}%`,
                        color: "#f59e0b",
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )
                      },
                      {
                        label: "Audit Events (24h)",
                        value: adminDashboardData.data_quality?.audit_events_last_24h,
                        color: "#8b5cf6",
                        icon: (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        )
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 text-center relative overflow-hidden">
                        <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full opacity-[0.08]" style={{ backgroundColor: item.color }} />
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-3 text-white" style={{ backgroundColor: item.color }}>
                          {item.icon}
                        </div>
                        <p className="text-2xl font-black text-gray-950">{item.value}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users by Role & Metric Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4">
                {/* Users by Role */}
                <div ref={el => chartsRef.current[2] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Users by Role</h3>
                    <p className="text-xs text-gray-400 mt-1">Role distribution across system</p>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {adminDashboardData.user_access?.users_by_role?.map((role, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                            {role.count}
                          </div>
                          <span className="text-xs font-semibold text-gray-700 capitalize">{role.role}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400">{role.count} users</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metric Health */}
                <div ref={el => chartsRef.current[3] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Metric Health</h3>
                    <p className="text-xs text-gray-400 mt-1">Categories, definitions & values</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Total Categories", value: adminDashboardData.metric_health?.total_categories, color: P },
                      { label: "Total Definitions", value: adminDashboardData.metric_health?.total_definitions, color: "#6366f1" },
                      { label: "Unused Definitions", value: adminDashboardData.metric_health?.unused_definitions, color: "#ef4444" },
                      { label: "Approved Values", value: adminDashboardData.metric_health?.approved_values, color: "#10b981" },
                      { label: "Pending Values", value: adminDashboardData.metric_health?.pending_values, color: "#f59e0b" },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                          <span className="text-lg font-black text-gray-950">{item.value?.toLocaleString() || 0}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min((item.value / 50) * 100, 100)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Audit Feed */}
              <div className="px-4">
                <div ref={el => chartsRef.current[4] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Recent Audit Feed</h3>
                    <p className="text-xs text-gray-400 mt-1">Latest system activities</p>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {adminDashboardData.recent_audit_feed?.map((audit, i) => (
                      <div key={audit.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                          {audit.actor?.full_name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-950">{audit.actor?.full_name}</span>
                            <span className="text-[10px] text-gray-400">{new Date(audit.rec_created).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{audit.action_type.replace(/_/g, " ")}</p>
                          {audit.new_value?.value && (
                            <span className="inline-block px-2 py-1 bg-white rounded text-[10px] font-bold text-gray-700 border border-gray-200">
                              Value: {audit.new_value.value}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Loading State - IP Dashboard */}
      {!showSuperAdminDashboard && showIpDashboard && loading && (
        <div className="px-4">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center">
            <svg className="animate-spin h-8 w-8 mb-3" style={{ color: P }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-semibold text-gray-400">Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* No Editions State - IP Dashboard */}
      {!showSuperAdminDashboard && showIpDashboard && !loading && editions.length === 0 && (
        <div className="px-4">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-950 mb-1">No Editions Found</p>
            <p className="text-xs text-gray-400">Please create an edition for this IP to view dashboard data.</p>
          </div>
        </div>
      )}

      {/* No Dashboard Data State - IP Dashboard */}
      {!showSuperAdminDashboard && showIpDashboard && !loading && editions.length > 0 && selectedEditionId && !dashboardData && (
        <div className="px-4">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-950 mb-1">No Dashboard Data</p>
            <p className="text-xs text-gray-400">Dashboard data is not available for this edition yet.</p>
          </div>
        </div>
      )}

      {/* Dashboard Content - Shows when IP is selected (NOT for super admin) */}
      {!showSuperAdminDashboard && showIpDashboard && !loading && dashboardData && (
        <>
          {/* Property & Edition Info */}
          <div className="px-4">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Property</p>
                  <h2 className="text-2xl font-black text-gray-950">{dashboardData.property || "—"}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Edition</p>
                  <h3 className="text-xl font-bold text-gray-700">{dashboardData.edition || "—"}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4">
            {dashboardData.metrics?.slice(0, 8).map((metric, i) => {
              const icons = ["🏆", "👥", "📍", "⚡", "📅", "💼", "👔", "🎯"];
              const colors = [P, "#f59e0b", "#10b981", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
              return (
                <div key={i} ref={el => statsRef.current[i] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ backgroundColor: colors[i % colors.length] }} />
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${colors[i % colors.length]}15` }}>
                    {icons[i % icons.length]}
                  </div>
                  <div>
                    <p className="text-3xl font-black text-gray-950 tracking-tight">{metric.value?.toLocaleString() || 0}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mt-1 leading-tight">{metric.metric}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4">
            {/* Raid & Tackle Stats */}
            <ChartCard title="Raid & Tackle Statistics" subtitle="Performance" refEl={el => chartsRef.current[0] = el}>
              <div className="space-y-4">
                {dashboardData.metrics?.filter(m =>
                  m.metric.includes("Raid") || m.metric.includes("Tackle")
                ).slice(0, 6).map((metric, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-gray-600">{metric.metric}</span>
                      <span className="text-sm font-black text-gray-950">{metric.value?.toLocaleString() || 0}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((metric.value / 100) * 100, 100)}%`,
                          backgroundColor: i % 2 === 0 ? P : S
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Special Achievements */}
            <ChartCard title="Special Achievements" subtitle="Highlights" refEl={el => chartsRef.current[1] = el}>
              <div className="grid grid-cols-2 gap-3">
                {dashboardData.metrics?.filter(m =>
                  m.metric.includes("Super") || m.metric.includes("High 5")
                ).map((metric, i) => {
                  const achievementColors = [P, S, "#f59e0b", "#10b981"];
                  return (
                    <div key={i} className="flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: `${achievementColors[i % achievementColors.length]}10` }}>
                      <span className="text-2xl font-black" style={{ color: achievementColors[i % achievementColors.length] }}>
                        {metric.value || 0}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider text-center mt-1 leading-tight">
                        {metric.metric.replace("No. of ", "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Cards Distribution */}
            <ChartCard title="Disciplinary Cards" subtitle="Match Conduct" refEl={el => chartsRef.current[2] = el}>
              <div className="space-y-4">
                {dashboardData.metrics?.filter(m => m.metric.includes("Card")).map((metric, i) => {
                  const cardColors = ["#10b981", "#f59e0b", "#ef4444"];
                  const cardIcons = ["🟢", "🟡", "🔴"];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${cardColors[i]}15` }}>
                        {cardIcons[i]}
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-gray-600">{metric.metric}</p>
                        <p className="text-xl font-black text-gray-950">{metric.value || 0}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {/* Staff & Financial Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4">
            {/* Staff Distribution */}
            <ChartCard title="Staff Distribution" subtitle="Team Personnel" refEl={el => chartsRef.current[3] = el}>
              <div className="space-y-3">
                {dashboardData.metrics?.filter(m =>
                  m.metric.includes("Officials") ||
                  m.metric.includes("Coaches") ||
                  m.metric.includes("Managers") ||
                  m.metric.includes("Physiotherapists")
                ).map((metric, i) => {
                  const staffIcons = ["👔", "🎓", "📋", "⚕️"];
                  const staffColors = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: `${staffColors[i]}15` }}>
                          {staffIcons[i]}
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{metric.metric.replace("No. of ", "")}</span>
                      </div>
                      <span className="text-lg font-black text-gray-950">{metric.value || 0}</span>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Prize Money & Contributions */}
            <ChartCard title="Financial Overview" subtitle="Prize Money & Contributions" refEl={el => chartsRef.current[4] = el}>
              <div className="space-y-3">
                {dashboardData.metrics?.filter(m =>
                  m.metric.includes("Prize Money") || m.metric.includes("Contribution")
                ).map((metric, i) => {
                  const isTopPrize = i === 0;
                  const prizeColors = ["#f59e0b", "#94a3b8", "#cd7f32", "#10b981", "#6366f1"];
                  const prizeIcons = ["🥇", "🥈", "🥉", "💰", "💵"];
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: `${prizeColors[i % prizeColors.length]}10` }}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${prizeColors[i % prizeColors.length]}20` }}>
                          {prizeIcons[i % prizeIcons.length]}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{metric.metric}</p>
                          <p className="text-lg font-black" style={{ color: prizeColors[i % prizeColors.length] }}>
                            ₹{metric.value?.toLocaleString() || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {/* Additional Metrics Table */}
          <div className="px-4">
            <ChartCard title="All Metrics Overview" subtitle="Complete Statistics" refEl={el => chartsRef.current[5] = el}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardData.metrics?.map((metric, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-xs font-medium text-gray-600 flex-1">{metric.metric}</span>
                    <span className="text-sm font-black text-gray-950 ml-2">
                      {metric.metric.includes("Money") || metric.metric.includes("Contribution")
                        ? `₹${metric.value?.toLocaleString() || 0}`
                        : metric.value?.toLocaleString() || 0
                      }
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}


    </div>
  );
}
