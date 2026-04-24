"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, DataTable, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

export default function MatricsPage() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();

    const [categories, setCategories] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: "", display_order: "" });

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

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
    }, []);

    const fetchCategories = useCallback(async () => {
        setTableLoading(true);
        const params = new URLSearchParams({ page, limit: 10 });
        if (search) params.set("search", search);

        const result = await apiClient.get(`${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}?${params.toString()}`);

        if (result.success) {
            const data = result.data?.data;
            const arr = Array.isArray(data?.metric_categories) ? data.metric_categories
                : Array.isArray(data) ? data
                    : [];
            setCategories(arr);
            const total = data?.total_pages || data?.totalPages || 1;
            setTotalPages(total);
        } else {
            toast.error(result.error || "Failed to load metric categories.");
        }
        setTableLoading(false);
    }, [page, search]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setSearch(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const openModal = (category = null) => {
        if (category) {
            setEditingId(category.id);
            setFormData({ name: category.name || "", display_order: category.display_order ?? "" });
        } else {
            setEditingId(null);
            setFormData({ name: "", display_order: "" });
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
        if (!formData.name.trim()) {
            toast.error("Category name is required.");
            return;
        }
        setIsSaving(true);

        const payload = {
            name: formData.name.trim(),
            display_order: Number(formData.display_order) || 1,
        };

        const result = editingId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}/${editingId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT, payload);

        if (result.success) {
            toast.success(`${formData.name} ${editingId ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchCategories();
            closeModal();
        } else {
            toast.error(result.error || `Failed to ${editingId ? "update" : "create"} category.`);
        }
        setIsSaving(false);
    };

    const handleDelete = async (category) => {
        if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return;

        const result = await apiClient.delete(`${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}/${category.id}`);

        if (result.success) {
            toast.success(`${category.name} deleted!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchCategories();
        } else {
            toast.error(result.error || "Failed to delete category.");
        }
    };

    const columns = [

        {
            header: "Category Name",
            accessor: "name",
            render: (row) => (
                <span className="text-sm font-semibold text-gray-950">{row.name}</span>
            ),
        },
        {
            header: "Display Order",
            accessor: "display_order",
            align: "center",
            render: (row) => (
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gray-50 border border-gray-100 text-xs font-bold text-gray-600">
                    {row.display_order}
                </span>
            ),
        },
        {
            header: "Actions",
            accessor: "actions",
            align: "right",
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => router.push(`/matrics/${row.id}`)}
                        title="View Definitions"
                        className="h-8 px-3 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-gray-950 transition-all flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                    </button>
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
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Configuration</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Metric Categories</h1>
                    <p className="text-[14px] text-gray-400 font-normal">Manage metric categories and their definitions.</p>
                </div>
                <Button
                    onClick={() => openModal()}
                    icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    }
                >
                    Add Category
                </Button>
            </div>

            {/* Search + Table */}
            <div ref={tableRef} className="px-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative w-full max-w-sm group">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-950 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-950 outline-none transition-all focus:border-gray-200 shadow-sm"
                        />
                    </div>
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
                        data={categories}
                        emptyMessage="No metric categories found. Click 'Add Category' to create one."
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
                                    {editingId ? "Edit Category" : "Add Category"}
                                </h3>
                                <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">
                                    {editingId ? "Update category details" : "Create a new metric category"}
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
                            <Input
                                label="Category Name"
                                placeholder="e.g. Batting"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <Input
                                label="Display Order"
                                type="number"
                                placeholder="e.g. 1"
                                required
                                min={1}
                                value={formData.display_order}
                                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                            />
                            <div className="pt-2">
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? "SAVING..." : editingId ? "SAVE CHANGES" : "CREATE CATEGORY"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
