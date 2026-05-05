"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { DataTable } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import apiClient from "@/lib/apiClient";

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending", color: "bg-amber-500" },
    { value: "approved", label: "Approved", color: "bg-emerald-500" },
    { value: "rejected", label: "Rejected", color: "bg-red-500" },
];

export default function ApprovalsPage() {
    const { theme } = useTheme();

    // Change Requests state
    const [changeRequests, setChangeRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [isProcessing, setIsProcessing] = useState({});

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, []);

    useEffect(() => {
        fetchChangeRequests();
    }, [statusFilter]);

    const fetchChangeRequests = useCallback(async () => {
        setLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/all?status=${statusFilter}`
        );
        if (result.success) {
            const arr = result.data?.data || (Array.isArray(result.data) ? result.data : []);
            setChangeRequests(Array.isArray(arr) ? arr : []);
        } else {
            toast.error(result.error || "Failed to load change requests.");
        }
        setLoading(false);
    }, [statusFilter]);

    const handleProcessRequest = async (requestId, status) => {
        setIsProcessing(prev => ({ ...prev, [requestId]: true }));

        const result = await apiClient.post(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/process/${requestId}`,
            { status }
        );

        if (result.success) {
            toast.success(`Change request ${status === "approved" ? "approved" : "rejected"} successfully!`, {
                style: {
                    background: status === "approved" ? '#f0fdf4' : '#fef2f2',
                    color: status === "approved" ? '#166534' : '#991b1b',
                    borderRadius: '16px',
                    border: status === "approved" ? '1px solid #bbf7d0' : '1px solid #fecaca'
                },
            });
            await fetchChangeRequests();
        } else {
            toast.error(result.error || `Failed to ${status === "approved" ? "approve" : "reject"} change request.`);
        }

        setIsProcessing(prev => ({ ...prev, [requestId]: false }));
    };



    const getStatusBadge = (status) => {
        const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${statusConfig.color}`}>
                {status === "pending" && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
                {status === "approved" && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
                {status === "rejected" && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
                {statusConfig.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div ref={pageRef} className="space-y-6 opacity-0">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Change Management</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Approvals</h1>
                    <p className="text-[14px] text-gray-400 font-normal">Review and process change requests</p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setStatusFilter(option.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ${statusFilter === option.value
                                ? "text-white shadow-md"
                                : "text-gray-400 bg-white border border-gray-100 hover:text-gray-950 hover:border-gray-200"
                                }`}
                            style={statusFilter === option.value ? { backgroundColor: theme.primary_color } : {}}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div ref={contentRef} className="px-4">
                {loading ? (
                    <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <DataTable
                        columns={[
                            {
                                header: "#",
                                accessor: "index",
                                render: (row) => <span className="text-xs font-black text-gray-300">{row.index}</span>
                            },

                            {
                                header: "Metric Value",
                                accessor: "metric_value",
                                render: (row) => (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-950">{row.original.proposed_value}</span>
                                        {row.original.original_value && (
                                            <span className="text-xs text-gray-400 line-through">{row.original.original_value}</span>
                                        )}
                                    </div>
                                )
                            },
                            {
                                header: "Match",
                                accessor: "match_id",
                                render: (row) => (
                                    <span className="text-xs text-gray-600">
                                        Match #{row.original.metric_value?.match_id || "—"}
                                    </span>
                                )
                            },
                            {
                                header: "Player",
                                accessor: "person_id",
                                render: (row) => (
                                    <span className="text-xs text-gray-600">
                                        Player #{row.original.metric_value?.person_id || "—"}
                                    </span>
                                )
                            },

                            {
                                header: "Date",
                                accessor: "submitted_at",
                                render: (row) => (
                                    <span className="text-xs text-gray-500 font-medium">
                                        {formatDate(row.original.submitted_at)}
                                    </span>
                                )
                            },
                            {
                                header: "Status",
                                accessor: "status",
                                align: "center",
                                render: (row) => getStatusBadge(row.original.status)
                            },
                            {
                                header: "Actions",
                                accessor: "actions",
                                align: "center",
                                render: (row) => {
                                    const isPending = row.original.status === "pending";
                                    const isProcessingRow = isProcessing[row.original.id];

                                    if (!isPending) {
                                        return <span className="text-xs text-gray-400">—</span>;
                                    }

                                    return (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleProcessRequest(row.original.id, "approved")}
                                                disabled={isProcessingRow}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
                                            >
                                                {isProcessingRow ? (
                                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleProcessRequest(row.original.id, "rejected")}
                                                disabled={isProcessingRow}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
                                            >
                                                {isProcessingRow ? (
                                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                Reject
                                            </button>
                                        </div>
                                    );
                                }
                            },

                        ]}
                        data={changeRequests.map((request, idx) => ({ ...request, index: idx + 1, original: request }))}
                        emptyMessage={`No ${statusFilter} change requests found.`}
                        itemsPerPage={10}
                    />
                )}
            </div>
        </div>
    );
}
