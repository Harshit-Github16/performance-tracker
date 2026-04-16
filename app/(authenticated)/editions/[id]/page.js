"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import apiClient from "@/lib/apiClient";

const TABS = ["Matches", "Teams", "Players", "Edit Details"];

const DUMMY_MATCHES = [
    { id: 1, match_no: 1, round: "Group Stage", team1: "Mumbai Indians", team2: "Chennai Super Kings", venue: "Wankhede Stadium", scheduled_at: "2025-06-01T15:00:00Z", status: "completed" },
    { id: 2, match_no: 2, round: "Group Stage", team1: "Royal Challengers", team2: "Kolkata Knight Riders", venue: "Chinnaswamy Stadium", scheduled_at: "2025-06-03T19:30:00Z", status: "upcoming" },
    { id: 3, match_no: 3, round: "Quarter Final", team1: "Delhi Capitals", team2: "Rajasthan Royals", venue: "Arun Jaitley Stadium", scheduled_at: "2025-06-10T15:00:00Z", status: "live" },
];

const DUMMY_TEAMS = [
    { id: 1, name: "Mumbai Indians", short: "MI", color: "#004BA0", players: 22 },
    { id: 2, name: "Chennai Super Kings", short: "CSK", color: "#F9CD05", players: 20 },
    { id: 3, name: "Royal Challengers", short: "RCB", color: "#EC1C24", players: 21 },
    { id: 4, name: "Kolkata Knight Riders", short: "KKR", color: "#3A225D", players: 19 },
];

const DUMMY_PLAYERS = [
    { id: 1, name: "Rohit Sharma", role: "Batsman", runs: 542 },
    { id: 2, name: "MS Dhoni", role: "Wicket Keeper", runs: 310 },
    { id: 3, name: "Virat Kohli", role: "Batsman", runs: 741 },
    { id: 4, name: "Andre Russell", role: "All Rounder", runs: 452 },
    { id: 5, name: "Jasprit Bumrah", role: "Bowler", wickets: 22 },
    { id: 6, name: "Ravindra Jadeja", role: "All Rounder", wickets: 14 },
];

const STATUS_OPTIONS = ["upcoming", "active", "completed", "cancelled"];

const matchStatusStyle = {
    completed: "bg-gray-500 text-white",
    upcoming: "bg-blue-500 text-white",
    live: "bg-emerald-500 text-white",
};

const PLAYER_COLORS = ["#1e3a5f", "#3a1e5f", "#1e5f3a", "#5f3a1e", "#1e4a5f", "#4a1e5f"];

export default function EditionDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { theme } = useTheme();

    const [activeTab, setActiveTab] = useState("Matches");
    const [edition, setEdition] = useState(null);
    const [matches, setMatches] = useState(DUMMY_MATCHES);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [editingMatchId, setEditingMatchId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [matchForm, setMatchForm] = useState({
        match_no: "", round: "", team1_id: "", team2_id: "",
        scheduled_at: "", actual_start_time: "", actual_end_time: "", venue: "",
    });

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const contentRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });
        fetchEdition();
        fetchMatches();
    }, [id]);

    const fetchEdition = async () => {
        const result = await apiClient.get(`${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}/${id}`);
        if (result.success) setEdition(result.data?.data || result.data);
    };

    const fetchMatches = async () => {
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}?property_id=${activeIp?.id}&edition_id=${id}`
        );
        if (result.success) {
            const arr = result.data?.data?.matches || result.data?.matches || [];
            if (arr.length > 0) setMatches(arr);
        }
    };

    const switchTab = (tab) => {
        gsap.to(contentRef.current, {
            y: -8, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => {
                setActiveTab(tab);
                gsap.fromTo(contentRef.current, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" });
            }
        });
    };

    const openMatchModal = (match = null) => {
        if (match) {
            setEditingMatchId(match.id);
            setMatchForm({
                match_no: match.match_no || "",
                round: match.round || "",
                team1_id: match.team1_id || "",
                team2_id: match.team2_id || "",
                scheduled_at: match.scheduled_at?.slice(0, 16) || "",
                actual_start_time: match.actual_start_time?.slice(0, 16) || "",
                actual_end_time: match.actual_end_time?.slice(0, 16) || "",
                venue: match.venue || "",
            });
        } else {
            setEditingMatchId(null);
            setMatchForm({ match_no: "", round: "", team1_id: "", team2_id: "", scheduled_at: "", actual_start_time: "", actual_end_time: "", venue: "" });
        }
        setIsMatchModalOpen(true);
        requestAnimationFrame(() => {
            if (modalRef.current)
                gsap.fromTo(modalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeMatchModal = () => {
        gsap.to(modalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsMatchModalOpen(false),
        });
    };

    const handleSaveMatch = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const payload = {
            property_id: activeIp?.id,
            edition_id: Number(id),
            match_no: Number(matchForm.match_no),
            round: matchForm.round,
            team1_id: Number(matchForm.team1_id),
            team2_id: Number(matchForm.team2_id),
            scheduled_at: matchForm.scheduled_at ? new Date(matchForm.scheduled_at).toISOString() : undefined,
            actual_start_time: matchForm.actual_start_time ? new Date(matchForm.actual_start_time).toISOString() : undefined,
            actual_end_time: matchForm.actual_end_time ? new Date(matchForm.actual_end_time).toISOString() : undefined,
            venue: matchForm.venue,
        };
        const result = editingMatchId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}/${editingMatchId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_MATCHES_ENDPOINT, payload);
        if (result.success) {
            toast.success(`Match ${editingMatchId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchMatches();
            closeMatchModal();
        } else {
            toast.error(result.error || "Failed to save match.");
        }
        setIsSaving(false);
    };

    const handleDeleteMatch = async (matchId) => {
        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}/${matchId}`);
        if (result.success) {
            setMatches(prev => prev.filter(m => m.id !== matchId));
            toast.success("Match deleted!", { style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' } });
        } else {
            toast.error(result.error || "Failed to delete match.");
        }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    const fmtTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

    return (
        <div ref={pageRef} className="space-y-6 opacity-0">
            {/* Header + Tabs */}
            <div ref={headerRef} className="px-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button onClick={() => router.push("/editions")} className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors mb-3">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Back to Editions
                    </button>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Edition</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">{edition?.name || "Loading..."}</h1>
                    {edition && <p className="text-[14px] text-gray-400">{fmt(edition.start_date)} → {fmt(edition.end_date)}</p>}
                </div>
                <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm self-end">
                    {TABS.map((tab) => (
                        <button key={tab} onClick={() => switchTab(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${activeTab === tab ? "text-white shadow-md" : "text-gray-400 hover:text-gray-950"}`}
                            style={activeTab === tab ? { backgroundColor: theme.primary_color } : {}}
                        >{tab}</button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div ref={contentRef} className="px-4">

                {/* MATCHES */}
                {activeTab === "Matches" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={() => openMatchModal()} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Add Match</Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matches.map((match) => (
                                <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200">
                                    <div className="relative h-28 flex items-center px-5" style={{ background: `linear-gradient(135deg, ${theme.primary_color}18 0%, ${theme.secondary_color}18 100%)` }}>
                                        <div className="absolute top-2 right-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${matchStatusStyle[match.status] || matchStatusStyle.upcoming}`}>
                                                {match.status === "live" && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" /></span>}
                                                {match.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="flex-1 flex flex-col items-center">
                                                <div className="h-11 w-11 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: theme.primary_color }}>
                                                    {(match.team1 || "T1").slice(0, 2).toUpperCase()}
                                                </div>
                                                <p className="text-xs font-bold text-gray-700 mt-1.5 line-clamp-1 text-center w-full">{match.team1 || `Team ${match.team1_id}`}</p>
                                            </div>
                                            <span className="text-sm font-black text-gray-200">VS</span>
                                            <div className="flex-1 flex flex-col items-center">
                                                <div className="h-11 w-11 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: theme.secondary_color }}>
                                                    {(match.team2 || "T2").slice(0, 2).toUpperCase()}
                                                </div>
                                                <p className="text-xs font-bold text-gray-700 mt-1.5 line-clamp-1 text-center w-full">{match.team2 || `Team ${match.team2_id}`}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{match.round}</span>
                                            <span className="text-[9px] text-gray-300">#{match.match_no}</span>
                                        </div>
                                        {match.venue && <div className="flex items-center gap-1 text-gray-400 text-[9px]"><svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg><span className="truncate">{match.venue}</span></div>}
                                        {match.scheduled_at && <div className="flex items-center gap-1 text-gray-400 text-[9px]"><svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>{fmtTime(match.scheduled_at)}</span></div>}
                                        <div className="flex gap-1.5 pt-1">
                                            <button onClick={() => openMatchModal(match)} className="flex-1 h-6 rounded-lg bg-gray-50 text-gray-500 text-[9px] font-bold uppercase hover:bg-gray-100 hover:text-gray-950 transition-all">Edit</button>
                                            <button onClick={() => handleDeleteMatch(match.id)} className="h-6 w-6 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TEAMS */}
                {activeTab === "Teams" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Add Team</Button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {DUMMY_TEAMS.map((team) => (
                                <div key={team.id} className="cursor-pointer hover:scale-[1.04] transition-transform duration-200">
                                    <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-sm">
                                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${team.color} 0%, ${team.color}88 100%)` }} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-white/20 font-black text-4xl tracking-tighter select-none">{team.short}</span>
                                        </div>
                                    </div>
                                    <div className="mt-1.5">
                                        <p className="text-xs font-bold text-gray-950 line-clamp-1">{team.name}</p>
                                        <p className="text-[9px] text-gray-400">{team.players} players</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PLAYERS */}
                {activeTab === "Players" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Add Player</Button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3">
                            {DUMMY_PLAYERS.map((player, i) => (
                                <div key={player.id} className="cursor-pointer hover:scale-[1.04] transition-transform duration-200">
                                    <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-sm">
                                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${PLAYER_COLORS[i % PLAYER_COLORS.length]} 0%, ${PLAYER_COLORS[i % PLAYER_COLORS.length]}88 100%)` }} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="h-10 w-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                                                <span className="text-white font-black text-base">{player.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-1.5">
                                        <p className="text-[10px] font-bold text-gray-950 line-clamp-1">{player.name}</p>
                                        <p className="text-[9px] text-gray-400">{player.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* EDIT DETAILS */}
                {activeTab === "Edit Details" && edition && (
                    <EditDetailsForm edition={edition} id={id} theme={theme} onSaved={fetchEdition} />
                )}
            </div>

            {/* Match Modal */}
            {isMatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={modalRef} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20 sticky top-0 bg-white">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingMatchId ? "Edit Match" : "Add Match"}</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Match Details</p>
                            </div>
                            <button onClick={closeMatchModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveMatch} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Match No" type="number" placeholder="1" required value={matchForm.match_no} onChange={(e) => setMatchForm({ ...matchForm, match_no: e.target.value })} />
                                <Input label="Round" placeholder="Group Stage" required value={matchForm.round} onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Team 1 ID" type="number" placeholder="3" required value={matchForm.team1_id} onChange={(e) => setMatchForm({ ...matchForm, team1_id: e.target.value })} />
                                <Input label="Team 2 ID" type="number" placeholder="4" required value={matchForm.team2_id} onChange={(e) => setMatchForm({ ...matchForm, team2_id: e.target.value })} />
                            </div>
                            <Input label="Venue" placeholder="Stadium A" value={matchForm.venue} onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })} />
                            <Input label="Scheduled At" type="datetime-local" value={matchForm.scheduled_at} onChange={(e) => setMatchForm({ ...matchForm, scheduled_at: e.target.value })} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Actual Start" type="datetime-local" value={matchForm.actual_start_time} onChange={(e) => setMatchForm({ ...matchForm, actual_start_time: e.target.value })} />
                                <Input label="Actual End" type="datetime-local" value={matchForm.actual_end_time} onChange={(e) => setMatchForm({ ...matchForm, actual_end_time: e.target.value })} />
                            </div>
                            <Button type="submit" disabled={isSaving} className="w-full">
                                {isSaving ? "SAVING..." : editingMatchId ? "SAVE CHANGES" : "CREATE MATCH"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Edit Details Form Component
function EditDetailsForm({ edition, id, theme, onSaved }) {
    const fileRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: edition.name || "",
        start_date: edition.start_date?.slice(0, 10) || "",
        end_date: edition.end_date?.slice(0, 10) || "",
        status: edition.status || "upcoming",
        logo: null,
        logoPreview: edition.logo || null,
    });

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) setFormData(prev => ({ ...prev, logo: file, logoPreview: URL.createObjectURL(file) }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const body = new FormData();
        body.append("id", id);
        body.append("property_id", activeIp?.id);
        body.append("name", formData.name);
        body.append("status", formData.status);
        body.append("start_date", formData.start_date);
        body.append("end_date", formData.end_date);
        if (formData.logo) body.append("logo", formData.logo);
        const result = await apiClient.post(process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT, body);
        if (result.success) {
            toast.success("Edition updated successfully!", {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            onSaved?.();
        } else {
            toast.error(result.error || "Failed to update edition.");
        }
        setIsSaving(false);
    };

    return (
        <div className="w-full max-w-3xl">
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100/50 shadow-sm p-8 space-y-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Edit Edition</p>
                <div className="grid grid-cols-2 gap-6">
                    <Input label="Edition Name" placeholder="e.g. Edition 1" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all capitalize">
                            {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                    </div>
                    <Input label="Start Date" type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                    <Input label="End Date" type="date" required value={formData.end_date} min={formData.start_date || undefined} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Edition Logo</label>
                    <div onClick={() => fileRef.current.click()} className="w-full h-32 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all cursor-pointer group relative overflow-hidden">
                        <input type="file" ref={fileRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                        {formData.logoPreview
                            ? <img src={formData.logoPreview} alt="Preview" className="w-full h-full object-cover" />
                            : <>
                                <div className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2 group-hover:text-gray-950 group-hover:scale-110 transition-all shadow-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Upload Logo</span>
                            </>
                        }
                    </div>
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? "SAVING..." : "SAVE CHANGES"}
                </Button>
            </form>
        </div>
    );
}
``