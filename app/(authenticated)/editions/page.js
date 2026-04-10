"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { DataTable, Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import apiClient from "@/lib/apiClient";

const STATUS_OPTIONS = ["upcoming", "active", "completed", "cancelled"];

const SkeletonRow = () => (
    <tr className="border-b border-gray-50">
        {[1, 2, 3, 4, 5].map((i) => (
            <td key={i} className="px-6 py-4">
                <div className="h-4 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${[55, 35, 35, 30, 25][i - 1]}%` }} />
            </td>
        ))}
    </tr>
);

export default function EditionsPage() {
    const { theme } = useTheme();

    const [editions, setEditions] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: "", start_date: "", end_date: "", status: "upcoming",
    });

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const tableRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(tableRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.15 });
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
            const arr = result.data?.data?.editions
                ?? result.data?.editions
                ?? [];
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
            });
        } else {
            setEditingId(null);
            setFormData({ name: "", start_date: "", end_date: "", status: "upcoming" });
        }
        setIsModalOpen(true);
        requestAnimationFrame(() => {
            if (modalRef.current) {
                gsap.fromTo(modalRef.current, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
            }
        });
    };

    const closeModal = () => {
        gsap.to(modalRef.current, {
            scale: 0.95, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => setIsModalOpen(false),
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const payload = {
            ...(editingId && { id: editingId }),
            property_id: activeIp?.id,
            name: formData.name,
            status: formData.status,
            ...(!editingId && {
                start_date: formData.start_date,
                end_date: formData.end_date,
            }),
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

    const statusBadge = (status) => {
        const map = {
            active: "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]",
            upcoming: "bg-blue-50 text-blue-600 border-blue-100",
            completed: "bg-gray-50 text-gray-400 border-gray-100",
            cancelled: "bg-red-50 text-red-500 border-red-100",
        };
        return map[status] || map.upcoming;
    };

    // Compute which status options are disabled based on dates
    const getDisabledStatuses = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = formData.start_date ? new Date(formData.start_date) : null;
        const end = formData.end_date ? new Date(formData.end_date) : null;
        const disabled = new Set();

        if (end && end < today) {
            // End date is in the past - upcoming not valid
            disabled.add("upcoming");
            disabled.add("active");
        } else if (start && start > today) {
            // Start date is in the future - active/completed not valid
            disabled.add("active");
            disabled.add("completed");
        } else if (start && start <= today && end && end >= today) {
            // Currently running - upcoming/completed not ideal but allow completed
            disabled.add("upcoming");
        }
        return disabled;
    };

    const columns = [
        {
            header: "Edition Name",
            render: (e) => (
                <span className="text-sm font-semibold text-gray-950">{e.name}</span>
            ),
        },
        {
            header: "Start Date",
            render: (e) => (
                <span className="text-sm text-gray-500">
                    {e.start_date ? new Date(e.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </span>
            ),
        },
        {
            header: "End Date",
            render: (e) => (
                <span className="text-sm text-gray-500">
                    {e.end_date ? new Date(e.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </span>
            ),
        },
        {
            header: "Status",
            render: (e) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-[0.15em] ${statusBadge(e.status)}`}>
                    {e.status === "active" && (
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDuration: '3s' }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                    )}
                    {e.status || "—"}
                </span>
            ),
        },
        {
            header: "Actions",
            align: "right",
            render: (e) => (
                <div className="flex items-center justify-end space-x-2">
                    <button
                        onClick={() => openModal(e)}
                        className="h-9 w-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-950 transition-all shadow-sm"
                        title="Edit Edition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div ref={pageRef} className="space-y-6">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Management</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Editions</h1>
                    <p className="text-[14px] text-gray-400 font-normal tracking-wide">Manage tournament editions and their schedules.</p>
                </div>
                <Button
                    onClick={() => openModal()}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                >
                    Add Edition
                </Button>
            </div>

            {/* Table */}
            <div ref={tableRef}>
                {tableLoading ? (
                    <div className="w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
                            <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                        <div className="border-b border-gray-50 px-6 py-2 flex gap-6">
                            {["Edition Name", "Start Date", "End Date", "Status", "Actions"].map((h) => (
                                <div key={h} className="h-3 bg-gray-100 rounded animate-pulse flex-1" />
                            ))}
                        </div>
                        <table className="w-full">
                            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
                        </table>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={editions}
                        emptyMessage="No editions found. Click 'Add Edition' to create one."
                    />
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={modalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-950 uppercase tracking-tight">
                                    {editingId ? "Edit Edition" : "Add Edition"}
                                </h3>
                                <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">
                                    {editingId ? "Update edition details" : "Create a new edition"}
                                </p>
                            </div>
                            <button onClick={closeModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all active:scale-95">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <Input
                                label="Edition Name"
                                placeholder="e.g. Edition 1"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />

                            {/* Dates only on create */}
                            {!editingId && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Start Date"
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value, end_date: "" })}
                                    />
                                    <Input
                                        label="End Date"
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        min={formData.start_date || undefined}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all capitalize"
                                >
                                    {STATUS_OPTIONS.map((s) => {
                                        const disabled = getDisabledStatuses().has(s);
                                        return (
                                            <option key={s} value={s} disabled={disabled} className="capitalize">
                                                {s}{disabled ? " (not available)" : ""}
                                            </option>
                                        );
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
