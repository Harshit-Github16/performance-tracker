"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import Card from "@/components/Card";

const hasPermission = (code) => {
    if (typeof window === "undefined") return false;
    const perms = JSON.parse(localStorage.getItem("user_permissions") || "[]");
    return perms.includes(code);
};

const STATUS_OPTIONS = ["upcoming", "active", "completed", "cancelled"];

const statusStyle = {
    active: { bg: "bg-emerald-500", text: "text-white" },
    upcoming: { bg: "bg-blue-500", text: "text-white" },
    completed: { bg: "bg-gray-400", text: "text-white" },
    cancelled: { bg: "bg-red-500", text: "text-white" },
};

const SkeletonCard = () => (
    <div className="rounded-2xl overflow-hidden bg-gray-100 animate-pulse" style={{ height: 220 }} />
);

export default function EditionsPage() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const canAdd = user?.role === "super_admin" || hasPermission("editions:add");
    const canEdit = user?.role === "super_admin" || hasPermission("editions:edit");

    const [editions, setEditions] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "", start_date: "", end_date: "", status: "upcoming", logo: null, logoPreview: null,
    });

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const cardsRef = useRef(null);
    const modalRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(cardsRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.15 });
        fetchEditions();
    }, []);

    const fetchEditions = async () => {
        setTableLoading(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const propertyId = activeIp?.id;
        const endpoint = propertyId
            ? `${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}?property_id=${propertyId}`
            : process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT;
        const result = await apiClient.get(endpoint);
        if (result.success) {
            const arr = result.data?.data?.editions ?? result.data?.editions ?? [];
            setEditions(arr);
        } else {
            toast.error(result.error || "Failed to load editions.");
        }
        setTableLoading(false);
    };

    const openModal = (edition = null) => {
        if (edition) {
            setEditingId(edition.id);
            setFormData({
                name: edition.name || "",
                start_date: edition.start_date?.slice(0, 10) || "",
                end_date: edition.end_date?.slice(0, 10) || "",
                status: edition.status || "upcoming",
                logo: null,
                logoPreview: edition.logo || null,
            });
        } else {
            setEditingId(null);
            setFormData({ name: "", start_date: "", end_date: "", status: "upcoming", logo: null, logoPreview: null });
        }
        setIsModalOpen(true);
        requestAnimationFrame(() => {
            if (modalRef.current)
                gsap.fromTo(modalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        });
    };

    const closeModal = () => {
        gsap.to(modalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsModalOpen(false),
        });
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) setFormData(prev => ({ ...prev, logo: file, logoPreview: URL.createObjectURL(file) }));
    };

    const handleDateChange = (field, value) => {
        const updated = { ...formData, [field]: value };
        if (field === "start_date") updated.end_date = "";
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = updated.start_date ? new Date(updated.start_date) : null;
        const end = updated.end_date ? new Date(updated.end_date) : null;
        const disabled = new Set();
        if (end && end < today) { disabled.add("upcoming"); disabled.add("active"); }
        else if (start && start > today) { disabled.add("active"); disabled.add("completed"); }
        else if (start && start <= today && end && end >= today) { disabled.add("upcoming"); }
        if (disabled.has(updated.status)) {
            const valid = STATUS_OPTIONS.find(s => !disabled.has(s));
            if (valid) updated.status = valid;
        }
        setFormData(updated);
    };

    const getDisabledStatuses = () => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = formData.start_date ? new Date(formData.start_date) : null;
        const end = formData.end_date ? new Date(formData.end_date) : null;
        const disabled = new Set();
        if (end && end < today) { disabled.add("upcoming"); disabled.add("active"); }
        else if (start && start > today) { disabled.add("active"); disabled.add("completed"); }
        else if (start && start <= today && end && end >= today) { disabled.add("upcoming"); }
        return disabled;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editingId && getDisabledStatuses().has(formData.status)) {
            toast.error(`Status "${formData.status}" is not valid for the selected dates.`);
            return;
        }
        setIsSaving(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");

        const payload = {
            ...(editingId && { id: editingId }),
            property_id: activeIp?.id,
            name: formData.name,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date,
            logo: formData.logoPreview || "",
        };

        const result = await apiClient.post(process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT, payload);
        if (result.success) {
            toast.success(`${formData.name} ${editingId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchEditions();
            closeModal();
        } else {
            toast.error(result.error || `Failed to ${editingId ? "update" : "create"} edition.`);
        }
        setIsSaving(false);
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div ref={pageRef} className="space-y-6">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Management</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Editions</h1>
                    <p className="text-[14px] text-gray-400 font-normal tracking-wide">Manage tournament editions and their schedules.</p>
                </div>
                <Button
                    // onClick={canAdd ? () => openModal() : undefined}
                    // onClick={canAdd ? () =>  : openModal()}
                    onClick={() => openModal()}
                    // disabled={!canAdd}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                >
                    Add Edition
                </Button>
            </div>

            {/* Cards Grid */}
            <div ref={cardsRef} className="px-4">
                {tableLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : editions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                        <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-sm font-semibold">No editions found. Click 'Add Edition' to create one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {editions.map((edition, i) => {
                            const st = statusStyle[edition.status] || statusStyle.upcoming;
                            return (
                                <div
                                    key={edition.id}
                                    className="group relative rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.10)] cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                                    style={{ height: 220 }}
                                    onClick={() => router.push(`/editions/${edition.id}`)}
                                >
                                    {/* Background - logo or gradient */}
                                    {edition.logo ? (
                                        <img src={edition.logo} alt={edition.name} className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                background: `linear-gradient(135deg, ${theme.primary_color}cc 0%, ${theme.secondary_color}99 100%)`,
                                            }}
                                        />
                                    )}

                                    {/* Dark overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                    {/* Status badge */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${st.bg} ${st.text}`}>
                                            {edition.status === "active" && (
                                                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" style={{ animationDuration: '2s' }} />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                                                </span>
                                            )}
                                            {edition.status}
                                        </span>
                                    </div>

                                    {/* Edit icon on hover */}
                                    {canEdit && (
                                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openModal(edition); }}
                                                className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all"
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        <h3 className="text-white font-bold text-base tracking-tight leading-tight mb-2 line-clamp-1">{edition.name}</h3>
                                        <div className="flex items-center gap-1.5 text-white/70 text-[11px] font-semibold">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span>{fmt(edition.start_date)}</span>
                                            <span className="text-white/40">→</span>
                                            <span>{fmt(edition.end_date)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={modalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-950 uppercase tracking-tight">{editingId ? "Edit Edition" : "Add Edition"}</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">{editingId ? "Update edition details" : "Create a new edition"}</p>
                            </div>
                            <button onClick={closeModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            <Input label="Edition Name" placeholder="e.g. Edition 1" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Edition Logo</label>
                                <div
                                    onClick={() => fileRef.current.click()}
                                    className="w-full h-28 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center bg-gray-50/30 hover:bg-white hover:border-gray-200 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <input type="file" ref={fileRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                                    {formData.logoPreview ? (
                                        <img src={formData.logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 mb-2 group-hover:text-gray-950 group-hover:scale-110 transition-all shadow-sm">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Upload Logo</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Start Date" type="date" required value={formData.start_date} onChange={(e) => handleDateChange("start_date", e.target.value)} />
                                <Input label="End Date" type="date" required value={formData.end_date} min={formData.start_date || undefined} onChange={(e) => handleDateChange("end_date", e.target.value)} />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
                                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all capitalize">
                                    {STATUS_OPTIONS.map((s) => {
                                        const disabled = getDisabledStatuses().has(s);
                                        return <option key={s} value={s} disabled={disabled} className="capitalize">{s}{disabled ? " (not available)" : ""}</option>;
                                    })}
                                </select>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? "SAVING..." : editingId ? "SAVE CHANGES" : "CREATE EDITION"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
