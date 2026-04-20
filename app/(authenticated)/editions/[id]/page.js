"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import apiClient from "@/lib/apiClient";

const TABS = ["Matches", "Teams", "Person", "Edit Details"];

// Matches loaded from API now

// Teams loaded from API now

const ROLE_OPTIONS = ["PLAYER", "OFFICIAL", "COACH", "MANAGER"];

const ROLE_COLORS = {
    PLAYER: "#1e3a5f",
    OFFICIAL: "#3a1e5f",
    COACH: "#1e5f3a",
    MANAGER: "#5f3a1e",
};

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
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamsLoading, setTeamsLoading] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [teamForm, setTeamForm] = useState({ name: "", short_name: "", logo_url: "" });
    const teamModalRef = useRef(null);
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

    // Players state
    const [players, setPlayers] = useState([]);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [isSavingPlayer, setIsSavingPlayer] = useState(false);
    const [playerForm, setPlayerForm] = useState({ full_name: "", role: "PLAYER", external_id: "", source: "KADAMBA", team_id: "" });
    const playerModalRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });
        fetchEdition();
        fetchMatches();
        fetchTeams();
        fetchPlayers();
    }, [id]);

    const fetchEdition = async () => {
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}/${id}?property_id=${activeIp?.id}`
        );
        if (result.success) setEdition(result.data?.data || result.data);
    };

    const fetchMatches = async () => {
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}?property_id=${activeIp?.id}&edition_id=${id}`
        );
        if (result.success) {
            const arr = result.data?.data?.matches || result.data?.matches || result.data?.data || [];
            setMatches(Array.isArray(arr) ? arr : []);
        }
    };

    const fetchTeams = async () => {
        setTeamsLoading(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}?property_id=${activeIp?.id}`
        );
        if (result.success) {
            const arr = result.data?.data?.teams || result.data?.teams || result.data?.data || [];
            setTeams(Array.isArray(arr) ? arr : []);
        }
        setTeamsLoading(false);
    };

    const fetchPlayers = async () => {
        setPlayersLoading(true);
        const result = await apiClient.get(process.env.NEXT_PUBLIC_PERSONS_ENDPOINT);
        if (result.success) {
            const arr = result.data?.data?.persons
                || result.data?.persons
                || (Array.isArray(result.data?.data) ? result.data.data : null)
                || (Array.isArray(result.data) ? result.data : []);
            setPlayers(Array.isArray(arr) ? arr : []);
        }
        setPlayersLoading(false);
    };

    const openPlayerModal = (player = null) => {
        if (player) {
            setEditingPlayerId(player.id);
            setPlayerForm({
                full_name: player.full_name || "",
                role: player.role || "PLAYER",
                external_id: player.external_id || "",
                source: player.source || "manual",
                team_id: player.team_id ? String(player.team_id) : (player.team?.id ? String(player.team.id) : (player.edition_participants?.[0]?.team_id ? String(player.edition_participants[0].team_id) : "")),
            });
        } else {
            setEditingPlayerId(null);
            setPlayerForm({ full_name: "", role: "PLAYER", external_id: "", source: "KADAMBA", team_id: "" });
        }
        setIsPlayerModalOpen(true);
        requestAnimationFrame(() => {
            if (playerModalRef.current)
                gsap.fromTo(playerModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closePlayerModal = () => {
        gsap.to(playerModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsPlayerModalOpen(false),
        });
    };

    const handleSavePlayer = async (e) => {
        e.preventDefault();
        setIsSavingPlayer(true);
        const payload = {
            full_name: playerForm.full_name,
            role: playerForm.role,
            external_id: playerForm.external_id || undefined,
            source: playerForm.source || "manual",
            edition_id: Number(id),
            team_id: playerForm.role === "OFFICIAL" ? null : (playerForm.team_id ? Number(playerForm.team_id) : undefined),
        };
        const result = editingPlayerId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_PERSONS_ENDPOINT}/${editingPlayerId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_PERSONS_ENDPOINT, payload);
        if (result.success) {
            toast.success(`${playerForm.full_name} ${editingPlayerId ? "updated" : "registered"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchPlayers();
            closePlayerModal();
        } else {
            toast.error(result.error || "Failed to save player.");
        }
        setIsSavingPlayer(false);
    };

    const handleDeletePlayer = async (playerId, playerName) => {
        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_PERSONS_ENDPOINT}/${playerId}`);
        if (result.success) {
            setPlayers(prev => prev.filter(p => p.id !== playerId));
            toast.success(`${playerName} removed!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
        } else {
            toast.error(result.error || "Failed to delete player.");
        }
    };

    const openTeamModal = (team = null) => {
        if (team) {
            setEditingTeamId(team.id);
            setTeamForm({ name: team.name || "", short_name: team.short_name || "", logo_url: team.logo_url || "" });
        } else {
            setEditingTeamId(null);
            setTeamForm({ name: "", short_name: "", logo_url: "" });
        }
        setIsTeamModalOpen(true);
        requestAnimationFrame(() => {
            if (teamModalRef.current)
                gsap.fromTo(teamModalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeTeamModal = () => {
        gsap.to(teamModalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsTeamModalOpen(false),
        });
    };

    const handleSaveTeam = async (e) => {
        e.preventDefault();
        setIsSavingTeam(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const payload = {
            property_id: activeIp?.id,
            name: teamForm.name,
            short_name: teamForm.short_name,
            logo_url: teamForm.logo_url || "",
        };
        const result = editingTeamId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}/${editingTeamId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_TEAMS_ENDPOINT, payload);
        if (result.success) {
            toast.success(`${teamForm.name} ${editingTeamId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchTeams();
            closeTeamModal();
        } else {
            toast.error(result.error || "Failed to save team.");
        }
        setIsSavingTeam(false);
    };

    const handleDeleteTeam = async (teamId, teamName) => {
        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_TEAMS_ENDPOINT}/${teamId}`);
        if (result.success) {
            setTeams(prev => prev.filter(t => t.id !== teamId));
            toast.success(`${teamName} deleted!`, { style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' } });
        } else {
            toast.error(result.error || "Failed to delete team.");
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
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const result = await apiClient.delete(
            `${process.env.NEXT_PUBLIC_MATCHES_ENDPOINT}/${matchId}`,
            { property_id: activeIp?.id }
        );
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {matches.length === 0 ? (
                                <div className="col-span-3 flex flex-col items-center justify-center py-24 text-gray-300">
                                    <svg className="w-14 h-14 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-sm font-semibold text-gray-400">No matches yet</p>
                                    <p className="text-xs text-gray-300 mt-1">Click 'Add Match' to schedule one</p>
                                </div>
                            ) : matches.map((match) => {
                                // team1/team2 come as objects from API: { id, name, short_name }
                                const t1 = match.team1 || teams.find(t => t.id === match.team1_id);
                                const t2 = match.team2 || teams.find(t => t.id === match.team2_id);
                                const t1Name = (typeof t1 === "object" ? t1?.name : t1) || `Team ${match.team1_id}`;
                                const t2Name = (typeof t2 === "object" ? t2?.name : t2) || `Team ${match.team2_id}`;
                                const t1Short = (typeof t1 === "object" ? t1?.short_name : null) || String(t1Name).slice(0, 2).toUpperCase();
                                const t2Short = (typeof t2 === "object" ? t2?.short_name : null) || String(t2Name).slice(0, 2).toUpperCase();
                                return (
                                    <div key={match.id} className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
                                        {/* Header with gradient */}
                                        <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${theme.primary_color}12 0%, ${theme.secondary_color}12 100%)` }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">{match.round}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-400">#{match.match_no}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${matchStatusStyle[match.status] || matchStatusStyle.upcoming}`}>
                                                        {match.status === "live" && <span className="relative flex h-1.5 w-1.5 mr-0.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" /></span>}
                                                        {match.status || "upcoming"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm" style={{ backgroundColor: theme.primary_color }}>
                                                        {t1Short}
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-800 text-center line-clamp-1 w-full">{t1Name}</p>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
                                                    <span className="text-[9px] font-black text-gray-300">VS</span>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-sm" style={{ backgroundColor: theme.secondary_color }}>
                                                        {t2Short}
                                                    </div>
                                                    <p className="text-xs font-bold text-gray-800 text-center line-clamp-1 w-full">{t2Name}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Footer */}
                                        <div className="px-5 py-4 border-t border-gray-50 space-y-2.5">
                                            {match.venue && (
                                                <div className="flex items-center gap-2.5 text-gray-500">
                                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                                    <span className="text-sm font-medium truncate">{match.venue}</span>
                                                </div>
                                            )}
                                            {match.scheduled_at && (
                                                <div className="flex items-center gap-2.5 text-gray-500">
                                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <span className="text-sm font-medium">{fmtTime(match.scheduled_at)}</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-1">
                                                <button onClick={() => openMatchModal(match)} className="flex-1 h-9 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-gray-950 transition-all">Edit</button>
                                                <button onClick={() => handleDeleteMatch(match.id)} className="h-9 w-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TEAMS */}
                {activeTab === "Teams" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={() => openTeamModal()} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Add Team</Button>
                        </div>
                        {teamsLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                                        <div className="h-28 bg-gray-100" />
                                        <div className="px-4 py-3 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : teams.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-sm font-semibold">No teams yet. Click 'Add Team' to create one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {teams.map((team) => (
                                    <div key={team.id} className="group bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
                                        <div className="relative h-28 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${theme.primary_color} 0%, ${theme.secondary_color} 100%)` }}>
                                            <span className="text-white font-black text-3xl tracking-tight select-none opacity-90">
                                                {team.short_name || team.name?.slice(0, 2).toUpperCase()}
                                            </span>
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); openTeamModal(team); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all">
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id, team.name); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-all">
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-sm font-bold text-gray-950 truncate">{team.name}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mt-0.5">{team.short_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PLAYERS */}
                {activeTab === "Person" && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={() => openPlayerModal()} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}>Add Person</Button>
                        </div>
                        {playersLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                                        <div className="h-28 bg-gray-100" />
                                        <div className="px-4 py-3 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : players.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                <p className="text-sm font-semibold">No players yet. Click 'Add Player' to register one.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {players.map((player) => {
                                    const initials = player.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
                                    const bgColor = ROLE_COLORS[player.role] || "#1e3a5f";
                                    return (
                                        <div key={player.id} className="group bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-200">
                                            <div className="relative h-28 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}99 100%)` }}>
                                                <div className="h-14 w-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center">
                                                    <span className="text-white font-black text-lg">{initials}</span>
                                                </div>
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); openPlayerModal(player); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all">
                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id, player.full_name); }} className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-all">
                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="px-4 py-3">
                                                <p className="text-sm font-bold text-gray-950 truncate">{player.full_name}</p>
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mt-0.5">{player.role}</p>
                                                {player.external_id && <p className="text-[10px] text-gray-300 mt-1 font-medium">ID: {player.external_id}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team 1</label>
                                    <select required value={matchForm.team1_id} onChange={(e) => setMatchForm({ ...matchForm, team1_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                        <option value="">Select team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team 2</label>
                                    <select required value={matchForm.team2_id} onChange={(e) => setMatchForm({ ...matchForm, team2_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                        <option value="">Select team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
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

            {/* Player Modal */}
            {isPlayerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={playerModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingPlayerId ? "Edit Person" : "Register Person"}</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Person Details</p>
                            </div>
                            <button onClick={closePlayerModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSavePlayer} className="p-6 space-y-4">
                            <Input label="Full Name" placeholder="e.g. Virat Kohli" required value={playerForm.full_name} onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Role</label>
                                    <select required value={playerForm.role} onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Team</label>
                                    <select value={playerForm.team_id} onChange={(e) => setPlayerForm({ ...playerForm, team_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                        <option value="">No Team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <Input label="External ID" placeholder="e.g. P001 (optional)" value={playerForm.external_id} onChange={(e) => setPlayerForm({ ...playerForm, external_id: e.target.value })} />
                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Source</label>
                                <select value={playerForm.source} onChange={(e) => setPlayerForm({ ...playerForm, source: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all">
                                    <option value="KADAMBA">KADAMBA</option>
                                    <option value="SISPORT">SISPORT</option>
                                    <option value="VOTKBD">VOTKBD</option>
                                    <option value="STARSELEV8">STARSELEV8</option>
                                    <option value="YKS">YKS</option>
                                </select>
                            </div>
                            <Button type="submit" disabled={isSavingPlayer} className="w-full">
                                {isSavingPlayer ? "SAVING..." : editingPlayerId ? "SAVE CHANGES" : "REGISTER PLAYER"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Team Modal */}
            {isTeamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={teamModalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-950 uppercase tracking-tight">{editingTeamId ? "Edit Team" : "Add Team"}</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1 tracking-widest uppercase">Team Details</p>
                            </div>
                            <button onClick={closeTeamModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveTeam} className="p-6 space-y-4">
                            <Input label="Team Name" placeholder="e.g. Mumbai Indians" required value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
                            <Input label="Short Name" placeholder="e.g. MI" required value={teamForm.short_name} onChange={(e) => setTeamForm({ ...teamForm, short_name: e.target.value })} />
                            <Input label="Logo URL" placeholder="https://example.com/logo.png" value={teamForm.logo_url} onChange={(e) => setTeamForm({ ...teamForm, logo_url: e.target.value })} />
                            <Button type="submit" disabled={isSavingTeam} className="w-full">
                                {isSavingTeam ? "SAVING..." : editingTeamId ? "SAVE CHANGES" : "CREATE TEAM"}
                            </Button>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
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
        const payload = {
            id,
            property_id: activeIp?.id,
            name: formData.name,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date,
            logo: formData.logoPreview || "",
        };
        const result = await apiClient.post(process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT, payload);
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