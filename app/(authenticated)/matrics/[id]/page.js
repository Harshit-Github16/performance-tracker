"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, DataTable, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import apiClient from "@/lib/apiClient";

const DATA_TYPES = ["integer", "float", "string", "boolean"];
const TARGET_LEVELS = ["match", "innings", "over", "player", "team"];

export default function MetricDefinitionsPage() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();
    const { id: categoryId } = useParams();

    const [category, setCategory] = useState(null);
    const [definitions, setDefinitions] = useState([]);
    const [sports, setSports] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const defaultForm = {
        sport_id: "",
        label: "",
        key_name: "",
        data_type: "integer",
        target_level: "match",
        is_required: false,
    };
    const [formData, setFormData] = useState(defaultForm);

    const [filterTargetLevel, setFilterTargetLevel] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const tableRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        if (user && user.role !== "super_admin") {
            router.push("/dashboard");
        }
    }, [user, router]);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(tableRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });
        fetchCategory();
        fetchSports();
    }, [categoryId]);

    const fetchCategory = async () => {
        const result = await apiClient.get(`${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}/${categoryId}`);
        if (result.success) {
            const data = result.data?.data || result.data;
            setCategory(data);
        }
    };

    const fetchSports = async () => {
        const result = await apiClient.get(process.env.NEXT_PUBLIC_SPORTS_ENDPOINT);
        if (result.success) {
            const arr = Array.isArray(result.data?.data?.data)
                ? result.data.data.data
                : Array.isArray(result.data?.data)
                    ? result.data.data
                    : Array.isArray(result.data)
                        ? result.data
                        : [];
            setSports(arr);
        }
    };

    const fetchDefinitions = useCallback(async () => {
        setTableLoading(true);
        const params = new URLSearchParams({ page, limit: 10, category_id: categoryId });
        if (filterTargetLevel) params.set("target_level", filterTargetLevel);
        if (search) params.set("search", search);

        const result = await apiClient.get(`${process.env.NEXT_PUBLIC_METRIC_DEFINITIONS_ENDPOINT}?${params.toString()}`);

        if (result.success) {
            const data = result.data?.data;
            console.log("datadatadatadatadata", data)
            const arr = Array.isArray(data?.metric_definitions) ? data.metric_definitions
                : Array.isArray(data) ? data
                    : [];
            setDefinitions(arr);
            const total = data?.total_pages || data?.totalPages || 1;
            setTotalPages(total);
        } else {
            toast.error(result.error || "Failed to load metric definitions.");
        }
        setTableLoading(false);
    }, [categoryId, page, filterTargetLevel, search]);

    useEffect(() => {
        fetchDefinitions();
    }, [fetchDefinitions]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setSearch(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const openModal = (def = null) => {
        if (def) {
            setEditingId(def.id);
            setFormData({
                sport_id: Array.isArray(def.sport_id) ? (def.sport_id[0] || "") : (def.sport_id || ""),
                label: def.label || "",
                key_name: def.key_name || "",
                data_type: def.data_type || "integer",
                target_level: def.target_level || "match",
                is_required: def.is_required ?? false,
            });
        } else {
            setEditingId(null);
            setFormData(defaultForm);
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

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.sport_id) {
            toast.error("Please select a sport.");
            return;
        }

        setIsSaving(true);
        const payload = {
            sport_id: [Number(formData.sport_id)],
            category_id: Number(categoryId),
            label: formData.label.trim(),
            key_name: formData.key_name.trim().toLowerCase().replace(/\s+/g, "_"),
            data_type: formData.data_type,
            target_level: formData.target_level,
            is_required: formData.is_required,
        };

        const result = editingId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_METRIC_DEFINITIONS_ENDPOINT}/${editingId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_METRIC_DEFINITIONS_ENDPOINT, payload);

        if (result.success) {
            toast.success(`${formData.label} ${editingId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchDefinitions();
            closeModal();
        } else {
            toast.error(result.error || `Failed to ${editingId ? "update" : "create"} definition.`);
        }
        setIsSaving(false);
    };

    const handleDelete = async (def) => {
        if (!confirm(`Delete "${def.label}"? This cannot be undone.`)) return;

        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_METRIC_DEFINITIONS_ENDPOINT}/${def.id}`);

        if (result.success) {
            toast.success(`${def.label} deleted!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchDefinitions();
        } else {
            toast.error(result.error || "Failed to delete definition.");
        }
    };

    const dataTypeBadge = {
        integer: "bg-blue-50 text-blue-600 border-blue-100",
        float: "bg-purple-50 text-purple-600 border-purple-100",
        string: "bg-amber-50 text-amber-600 border-amber-100",
        boolean: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };

    const levelBadge = {
        match: "bg-gray-100 text-gray-600",
        innings: "bg-indigo-50 text-indigo-600",
        over: "bg-orange-50 text-orange-600",
        player: "bg-pink-50 text-pink-600",
        team: "bg-teal-50 text-teal-600",
    };

    const columns = [
        {
            header: "Label",
            accessor: "label",
            render: (row) => (
                <div>
                    <p className="text-sm font-semibold text-gray-950">{row.label}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{row.key_name}</p>
                </div>
            ),
        },
        {
            header: "Data Type",
            accessor: "data_type",
            align: "center",
            render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${dataTypeBadge[row.data_type] || "bg-gray-50 text-gray-500 border-gray-100"}`}>
                    {row.data_type}
                </span>
            ),
        },
        {
            header: "Target Level",
            accessor: "target_level",
            align: "center",
            render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${levelBadge[row.target_level] || "bg-gray-50 text-gray-500"}`}>
                    {row.target_level}
                </span>
            ),
        },
        {
            header: "Required",
            accessor: "is_required",
            align: "center",
            render: (row) => (
                row.is_required
                    ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Yes</span>
                    : <span className="text-gray-300 text-xs font-bold">No</span>
            ),
        },
        {
            header: "Actions",
            accessor: "actions",
            align: "right",
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => openModal(row)}
                        title="Edit"
                        className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-950 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        title="Delete"
                        className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div ref={pageRef} className="space-y-6 opacity-0">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <button
                        onClick={() => router.push("/matrics")}
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors mb-3"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Categories
                    </button>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">
                            {category?.name || "Category"}
                        </span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Metric Definitions</h1>
                    <p className="text-[14px] text-gray-400 font-normal">Define metrics for this category.</p>
                </div>
                <Button
                    onClick={() => openModal()}
                    icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    }
                >
                    Add Definition
                </Button>
            </div>

            {/* Filters + Table */}
            <div ref={tableRef} className="px-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search definitions..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all focus:border-gray-200 shadow-sm w-64"
                        />
                    </div>
                    <select
                        value={filterTargetLevel}
                        onChange={(e) => { setFilterTargetLevel(e.target.value); setPage(1); }}
                        className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-600 outline-none focus:border-gray-200 shadow-sm"
                    >
                        <option value="">All Levels</option>
                        {TARGET_LEVELS.map(l => (
                            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                        ))}
                    </select>
                </div>

                {tableLoading ? (
                    <div className="bg-white rounded-2xl border border-gray-100/50 shadow-sm p-12 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={definitions}
                        emptyMessage="No metric definitions found. Click 'Add Definition' to create one."
                        itemsPerPage={10}
                    />
                )}

                {!tableLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 border border-gray-100 rounded-lg text-gray-400 flex items-center gap-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 border border-gray-100 rounded-lg text-gray-400 flex items-center gap-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            Next
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={modalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-950 uppercase tracking-tight">
                                    {editingId ? "Edit Definition" : "Add Definition"}
                                </h3>
                                <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">
                                    {editingId ? "Update metric definition" : "Create a new metric definition"}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-5">
                            {/* Sport Dropdown */}
                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Sport</label>
                                <select
                                    value={formData.sport_id}
                                    onChange={(e) => setFormData({ ...formData, sport_id: e.target.value })}
                                    required
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                >
                                    <option value="">Select Sport</option>
                                    {sports.map((sport) => (
                                        <option key={sport.id} value={sport.id}>
                                            {sport.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Label"
                                placeholder="e.g. Runs Scored"
                                required
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            />

                            <Input
                                label="Key Name"
                                placeholder="e.g. runs_scored"
                                required
                                value={formData.key_name}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    key_name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                                })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Data Type</label>
                                    <select
                                        value={formData.data_type}
                                        onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                    >
                                        {DATA_TYPES.map(t => (
                                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Target Level</label>
                                    <select
                                        value={formData.target_level}
                                        onChange={(e) => setFormData({ ...formData, target_level: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                    >
                                        {TARGET_LEVELS.map(l => (
                                            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Required</label>
                                <div className="flex items-center h-[52px] px-5 bg-gray-50 border border-gray-100 rounded-xl">
                                    <label className="flex items-center gap-3 cursor-pointer group/check">
                                        <div
                                            onClick={() => setFormData(prev => ({ ...prev, is_required: !prev.is_required }))}
                                            className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${formData.is_required ? "border-gray-950 bg-gray-950" : "border-gray-200 hover:border-gray-400"}`}
                                        >
                                            {formData.is_required && (
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-600 group-hover/check:text-gray-950 transition-colors">
                                            {formData.is_required ? "Yes — this metric is required" : "No — optional metric"}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? "SAVING..." : editingId ? "SAVE CHANGES" : "CREATE DEFINITION"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
