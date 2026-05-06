"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, Legend,
  ComposedChart, Scatter
} from "recharts";

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const matchData = [
  { month: "Jan", won: 8, lost: 4, draw: 2 },
  { month: "Feb", won: 10, lost: 5, draw: 1 },
  { month: "Mar", won: 14, lost: 4, draw: 3 },
  { month: "Apr", won: 13, lost: 7, draw: 2 },
  { month: "May", won: 17, lost: 5, draw: 4 },
  { month: "Jun", won: 19, lost: 6, draw: 2 },
  { month: "Jul", won: 22, lost: 4, draw: 3 },
];

const editionData = [
  { name: "Ed 1", teams: 8, matches: 28, players: 176 },
  { name: "Ed 2", teams: 10, matches: 45, players: 220 },
  { name: "Ed 3", teams: 12, matches: 66, players: 264 },
  { name: "Ed 4", teams: 10, matches: 45, players: 230 },
  { name: "Ed 5", teams: 14, matches: 78, players: 308 },
];

const roleDistribution = [
  { name: "IP Owner", value: 3, fill: "" },
  { name: "Analyst", value: 5, fill: "" },
  { name: "Data Entry", value: 8, fill: "" },
  { name: "Viewer", value: 12, fill: "" },
  { name: "Manager", value: 6, fill: "" },
];

const performanceData = [
  { round: "R1", avg: 42, high: 78, low: 18 },
  { round: "R2", avg: 55, high: 91, low: 24 },
  { round: "R3", avg: 48, high: 85, low: 20 },
  { round: "R4", avg: 63, high: 98, low: 31 },
  { round: "QF", avg: 71, high: 105, low: 42 },
  { round: "SF", avg: 68, high: 112, low: 38 },
  { round: "F", avg: 85, high: 124, low: 55 },
];

const activityData = [
  { day: "Mon", logins: 24, actions: 87 },
  { day: "Tue", logins: 31, actions: 112 },
  { day: "Wed", logins: 28, actions: 95 },
  { day: "Thu", logins: 35, actions: 134 },
  { day: "Fri", logins: 42, actions: 158 },
  { day: "Sat", logins: 18, actions: 62 },
  { day: "Sun", logins: 12, actions: 41 },
];

const winRateData = [
  { name: "Win Rate", value: 72, fill: "" },
];

const topTeams = [
  { name: "Team Alpha", wins: 18, points: 36, nrr: "+1.24" },
  { name: "Royal CB", wins: 15, points: 30, nrr: "+0.87" },
  { name: "Mumbai XI", wins: 13, points: 26, nrr: "+0.41" },
  { name: "Super Kings", wins: 11, points: 22, nrr: "-0.12" },
  { name: "Delhi Dares", wins: 9, points: 18, nrr: "-0.55" },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-xl text-xs min-w-[120px]">
      {label && <p className="font-bold text-gray-950 mb-2 uppercase tracking-widest text-[10px]">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500 font-medium">{p.name}:</span>
          <span className="font-bold text-gray-950">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, trend, color, index, refEl }) => (
  <div ref={refEl} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-4 relative overflow-hidden">
    <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.06]" style={{ backgroundColor: color }} />
    <div className="flex items-start justify-between">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${color}15` }}>
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-3xl font-black text-gray-950 tracking-tight">{value}</p>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-0.5">{label}</p>
    </div>
    <p className="text-[11px] text-gray-400 font-medium">{sub}</p>
  </div>
);

// ─── Chart Card ───────────────────────────────────────────────────────────────

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
  const { user } = useAuth();
  const pageRef = useRef(null);
  const statsRef = useRef([]);
  const chartsRef = useRef([]);

  const [editions, setEditions] = useState([]);
  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showIpDashboard, setShowIpDashboard] = useState(false);

  const P = theme.primary_color;
  const S = theme.secondary_color;

  const PIE_COLORS = [P, S, `${P}80`, `${S}80`, `${P}40`];

  useEffect(() => {
    // Check if active IP is selected
    const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
    const shouldShowIpDashboard = !!activeIp;
    setShowIpDashboard(shouldShowIpDashboard);

    if (shouldShowIpDashboard) {
      fetchEditions();
    }
  }, [user]);

  useEffect(() => {
    if (showIpDashboard && selectedEditionId) {
      fetchDashboardData();
    }
  }, [selectedEditionId, showIpDashboard]);

  const fetchEditions = async () => {
    const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
    if (!activeIp) return;

    const result = await apiClient.get(
      `${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}?property_id=${activeIp.id}`
    );

    if (result.success) {
      const editionsData = result.data?.data?.editions || result.data?.editions || result.data?.data || [];
      setEditions(Array.isArray(editionsData) ? editionsData : []);

      // Auto-select first edition if available
      if (editionsData.length > 0) {
        setSelectedEditionId(editionsData[0].id);
      }
    }
  };

  const fetchDashboardData = async () => {
    if (!selectedEditionId) return;

    setLoading(true);
    const result = await apiClient.get(
      `${process.env.NEXT_PUBLIC_ANALYTICS_IP_DASHBOARD_ENDPOINT}?edition_id=${selectedEditionId}`
    );

    if (result.success) {
      setDashboardData(result.data?.data || result.data);
      console.log("Dashboard Data:", result.data?.data || result.data);
    } else {
      toast.error(result.error || "Failed to load dashboard data");
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
            <p className="text-[13px] text-gray-400">Tournament performance at a glance.</p>
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

      {/* Loading State */}
      {showIpDashboard && loading && (
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

      {/* Dashboard Content - Shows when IP is selected */}
      {showIpDashboard && !loading && dashboardData && (
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

      {/* Super Admin Dashboard - Shows only when NO IP is selected */}
      {!showIpDashboard && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4">
            {STAT_CARDS.map((c, i) => (
              <StatCard key={i} {...c} index={i} refEl={el => statsRef.current[i] = el} />
            ))}
          </div>

          {/* Row 1 — Area + Composed */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 px-4">

            {/* Match Results — Stacked Area */}
            <ChartCard title="Won vs Lost per Month" subtitle="Match Results" refEl={el => chartsRef.current[0] = el} className="lg:col-span-3">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={matchData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={P} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={P} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={S} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={S} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDraw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={`${P}60`} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={`${P}60`} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="won" stroke={P} strokeWidth={2.5} fill="url(#gWon)" name="Won" dot={false} activeDot={{ r: 5, fill: P }} />
                  <Area type="monotone" dataKey="lost" stroke={S} strokeWidth={2} fill="url(#gLost)" name="Lost" dot={false} activeDot={{ r: 5, fill: S }} />
                  <Area type="monotone" dataKey="draw" stroke={`${P}60`} strokeWidth={1.5} fill="url(#gDraw)" name="Draw" dot={false} activeDot={{ r: 4, fill: `${P}60` }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3">
                {[["Won", P], ["Lost", S], ["Draw", `${P}60`]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-[11px] font-semibold text-gray-400">{l}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Win Rate — Radial */}
            <ChartCard title="Overall Win Rate" subtitle="Season Stats" refEl={el => chartsRef.current[1] = el} className="lg:col-span-2">
              <div className="flex flex-col items-center justify-center h-[220px] relative">
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" startAngle={220} endAngle={-40} data={[{ name: "Win Rate", value: 72, fill: P }, { name: "bg", value: 100, fill: "#f1f5f9" }]}>
                    <RadialBar dataKey="value" cornerRadius={8} background={false} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-gray-950">72%</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Win Rate</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[["72", "Wins", P], ["21", "Losses", S], ["7", "Draws", `${P}60`]].map(([v, l, c]) => (
                  <div key={l} className="flex flex-col items-center p-2 rounded-xl" style={{ backgroundColor: `${c}10` }}>
                    <span className="text-lg font-black" style={{ color: c }}>{v}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{l}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Row 2 — Bar + Line + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4">

            {/* Edition Stats — Grouped Bar */}
            <ChartCard title="Teams & Matches per Edition" subtitle="Edition Stats" refEl={el => chartsRef.current[2] = el} className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={editionData} barGap={3} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="teams" fill={P} radius={[6, 6, 0, 0]} name="Teams" maxBarSize={28} />
                  <Bar dataKey="matches" fill={`${P}60`} radius={[6, 6, 0, 0]} name="Matches" maxBarSize={28} />
                  <Bar dataKey="players" fill={S} radius={[6, 6, 0, 0]} name="Players" maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3">
                {[["Teams", P], ["Matches", `${P}60`], ["Players", S]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-[11px] font-semibold text-gray-400">{l}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Role Distribution — Donut */}
            <ChartCard title="Role Distribution" subtitle="User Roles" refEl={el => chartsRef.current[3] = el}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {roleDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {roleDistribution.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] font-semibold text-gray-500">{r.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-950">{r.value}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Row 3 — Performance + Activity + Top Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4">

            {/* Avg Score by Round — Composed */}
            <ChartCard title="Avg Score by Round" subtitle="Performance" refEl={el => chartsRef.current[4] = el}>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={performanceData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={P} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={P} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="round" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="avg" fill="url(#gScore)" stroke="none" />
                  <Line type="monotone" dataKey="avg" stroke={P} strokeWidth={2.5} dot={{ fill: P, r: 4, strokeWidth: 0 }} name="Avg" activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="high" stroke={S} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="High" />
                  <Line type="monotone" dataKey="low" stroke={`${P}60`} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Low" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3">
                {[["Avg", P], ["High", S], ["Low", `${P}60`]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-[11px] font-semibold text-gray-400">{l}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Weekly Activity — Stacked Bar */}
            <ChartCard title="Weekly User Activity" subtitle="Activity" refEl={el => chartsRef.current[5] = el}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="actions" fill={`${P}30`} radius={[6, 6, 0, 0]} name="Actions" maxBarSize={32} stackId="a" />
                  <Bar dataKey="logins" fill={P} radius={[6, 6, 0, 0]} name="Logins" maxBarSize={32} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3">
                {[["Logins", P], ["Actions", `${P}30`]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-[11px] font-semibold text-gray-400">{l}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Top Teams — Mini Leaderboard */}
            <ChartCard title="Top Teams" subtitle="Leaderboard" refEl={el => chartsRef.current[6] = el}>
              <div className="space-y-3">
                {topTeams.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-[11px] font-black w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-gray-950 truncate">{t.name}</span>
                        <span className="text-[11px] font-black text-gray-950 ml-2">{t.points}pts</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(t.wins / 20) * 100}%`, backgroundColor: i === 0 ? P : `${P}70` }}
                        />
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold w-12 text-right ${t.nrr.startsWith("+") ? "text-emerald-500" : "text-red-400"}`}>
                      {t.nrr}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">NRR</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Run Rate</span>
              </div>
            </ChartCard>
          </div>

        </>
      )}

    </div>
  );
}
