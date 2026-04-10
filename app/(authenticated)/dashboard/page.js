"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useTheme } from "@/components/ThemeContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

// Dummy Data
const matchData = [
  { month: "Jan", played: 12, won: 8, lost: 4 },
  { month: "Feb", played: 15, won: 10, lost: 5 },
  { month: "Mar", played: 18, won: 14, lost: 4 },
  { month: "Apr", played: 20, won: 13, lost: 7 },
  { month: "May", played: 22, won: 17, lost: 5 },
  { month: "Jun", played: 25, won: 19, lost: 6 },
];

const editionData = [
  { name: "Edition 1", teams: 8, matches: 28, players: 176 },
  { name: "Edition 2", teams: 10, matches: 45, players: 220 },
  { name: "Edition 3", teams: 12, matches: 66, players: 264 },
  { name: "Edition 4", teams: 10, matches: 45, players: 230 },
];

const roleDistribution = [
  { name: "IP Owner", value: 3 },
  { name: "Data Entry", value: 8 },
  { name: "Analyst", value: 5 },
  { name: "Viewer", value: 12 },
];

const playerScoreData = [
  { round: "R1", avg: 42 },
  { round: "R2", avg: 55 },
  { round: "R3", avg: 48 },
  { round: "R4", avg: 63 },
  { round: "QF", avg: 71 },
  { round: "SF", avg: 68 },
  { round: "F", avg: 85 },
];

const userActivityData = [
  { day: "Mon", logins: 24, actions: 87 },
  { day: "Tue", logins: 31, actions: 112 },
  { day: "Wed", logins: 28, actions: 95 },
  { day: "Thu", logins: 35, actions: 134 },
  { day: "Fri", logins: 42, actions: 158 },
  { day: "Sat", logins: 18, actions: 62 },
  { day: "Sun", logins: 12, actions: 41 },
];

const STAT_CARDS = [
  { label: "Total IPs", value: "4", sub: "+1 this month", icon: "🏆" },
  { label: "Active Editions", value: "3", sub: "2 upcoming", icon: "📅" },
  { label: "Total Users", value: "28", sub: "+5 this week", icon: "👥" },
  { label: "Matches Played", value: "112", sub: "Season total", icon: "⚡" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-lg text-xs">
        <p className="font-bold text-gray-950 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { theme } = useTheme();
  const pageRef = useRef(null);
  const statsRef = useRef([]);
  const chartsRef = useRef([]);

  const PIE_COLORS = [theme.primaryColor, theme.secondaryColor, "#94a3b8", "#cbd5e1"];

  useEffect(() => {
    const tl = gsap.timeline();

    // Page fade in
    tl.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });

    // Stat cards stagger
    tl.fromTo(statsRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" },
      "-=0.2"
    );

    // Charts stagger
    tl.fromTo(chartsRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: "power3.out" },
      "-=0.3"
    );
  }, []);

  return (
    <div ref={pageRef} className="space-y-6 opacity-0">
      {/* Header */}
      <div className="px-4">
        <div className="flex items-center space-x-2 mb-1">
          <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Overview</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Dashboard</h1>
        <p className="text-[14px] text-gray-400 font-normal">Tournament performance at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        {STAT_CARDS.map((card, i) => (
          <div
            key={i}
            ref={el => statsRef.current[i] = el}
            className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <div className="h-8 w-8 rounded-xl flex items-center justify-center opacity-10"
                style={{ backgroundColor: theme.primaryColor }} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-950">{card.value}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">{card.label}</p>
            </div>
            <p className="text-[11px] text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
        {/* Match Results - Area Chart */}
        <div ref={el => chartsRef.current[0] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Match Results</p>
          <p className="text-sm font-semibold text-gray-950 mb-4">Won vs Lost per Month</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={matchData}>
              <defs>
                <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={theme.primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.secondaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={theme.secondaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="won" stroke={theme.primaryColor} strokeWidth={2} fill="url(#wonGrad)" name="Won" />
              <Area type="monotone" dataKey="lost" stroke={theme.secondaryColor} strokeWidth={2} fill="url(#lostGrad)" name="Lost" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Edition Stats - Bar Chart */}
        <div ref={el => chartsRef.current[1] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Edition Stats</p>
          <p className="text-sm font-semibold text-gray-950 mb-4">Teams & Matches per Edition</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={editionData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="teams" fill={theme.primaryColor} radius={[4, 4, 0, 0]} name="Teams" />
              <Bar dataKey="matches" fill={theme.secondaryColor} radius={[4, 4, 0, 0]} name="Matches" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
        {/* Role Distribution - Pie */}
        <div ref={el => chartsRef.current[2] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">User Roles</p>
          <p className="text-sm font-semibold text-gray-950 mb-4">Role Distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {roleDistribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {roleDistribution.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] font-semibold text-gray-400">{r.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Player Avg Score - Line */}
        <div ref={el => chartsRef.current[3] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Performance</p>
          <p className="text-sm font-semibold text-gray-950 mb-4">Avg Score by Round</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={playerScoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="round" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="avg" stroke={theme.primaryColor} strokeWidth={2.5} dot={{ fill: theme.primaryColor, r: 4 }} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity - Bar */}
        <div ref={el => chartsRef.current[4] = el} className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Activity</p>
          <p className="text-sm font-semibold text-gray-950 mb-4">Weekly User Logins</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="logins" fill={theme.primaryColor} radius={[4, 4, 0, 0]} name="Logins" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
