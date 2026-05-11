"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { DataTable } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending", color: "bg-amber-500" },
    { value: "approved", label: "Approved", color: "bg-emerald-500" },
    { value: "rejected", label: "Rejected", color: "bg-red-500" },
];

const hasPermission = (code) => {
    if (typeof window === "undefined") return false;
    const perms = JSON.parse(localStorage.getItem("user_permissions") || "[]");
    const isIpOwner = JSON.parse(localStorage.getItem("is_ip_owner") || "false");
    if (isIpOwner) return true;
    return perms.includes(code);
};

export default function ApprovalsPage() {
    const { theme } = useTheme();
    const { user } = useAuth();

    // Permission checks
    const canApprove = user?.role === "super_admin" || hasPermission("approvals:edit") || hasPermission("approvals:add");

    // Change Requests state
    const [changeRequests, setChangeRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [isProcessing, setIsProcessing] = useState({});

    // Editions state
    const [editions, setEditions] = useState([]);
    const [selectedEditionId, setSelectedEditionId] = useState("");
    const [editionsLoading, setEditionsLoading] = useState(false);

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });

        // Fetch editions on mount
        fetchEditions();
    }, []);

    useEffect(() => {
        if (selectedEditionId) {
            fetchChangeRequests();
        }
    }, [statusFilter, selectedEditionId]);

    const fetchEditions = async () => {
        setEditionsLoading(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");

        if (!activeIp?.id) {
            toast.error("No active IP found");
            setEditionsLoading(false);
            return;
        }

        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_EDITIONS_ENDPOINT}?property_id=${activeIp.id}`
        );

        if (result.success) {
            const editionsData = result.data?.data?.editions || result.data?.editions || result.data?.data || [];
            const editionsArray = Array.isArray(editionsData) ? editionsData : [];
            setEditions(editionsArray);

            // Auto-select first edition
            if (editionsArray.length > 0) {
                setSelectedEditionId(editionsArray[0].id);
            }
        } else {
            toast.error(result.error || "Failed to load editions");
        }
        setEditionsLoading(false);
    };

    const fetchChangeRequests = useCallback(async () => {
        if (!selectedEditionId) return;

        setLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/all?status=${statusFilter}&edition_id=${selectedEditionId}`
        );
        if (result.success) {
            const arr = result.data?.data || (Array.isArray(result.data) ? result.data : []);
            setChangeRequests(Array.isArray(arr) ? arr : []);
        } else {
            toast.error(result.error || "Failed to load change requests.");
        }
        setLoading(false);
    }, [statusFilter, selectedEditionId]);

    const handleProcessRequest = async (requestId, status) => {
        setIsProcessing(prev => ({ ...prev, [requestId]: true }));

        const result = await apiClient.post(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/process/${requestId}/${selectedEditionId}`,
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
            <div className="flex items-center justify-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${statusConfig.color}`} title={statusConfig.label}>
                    {status === "pending" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {status === "approved" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {status === "rejected" && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>
            </div>
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

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    {/* Edition Selector */}
                    {editions.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Edition:</label>
                            <select
                                value={selectedEditionId}
                                onChange={(e) => setSelectedEditionId(e.target.value)}
                                disabled={editionsLoading}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ focusRingColor: theme.primary_color }}
                            >
                                {editions.map((edition) => (
                                    <option key={edition.id} value={edition.id}>
                                        {edition.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

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
                                header: "Type",
                                accessor: "type",
                                render: (row) => (
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.original.type === "new_entry"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-purple-100 text-purple-700"
                                        }`}>
                                        {row.original.type === "new_entry" ? "New Entry" : "Correction"}
                                    </span>
                                )
                            },
                            {
                                header: "Value",
                                accessor: "metric_value",
                                render: (row) => (
                                    <div className="flex items-center gap-2">
                                        {row.original.original_value && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Original</span>
                                                <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
                                                    <span className="text-sm font-bold text-red-600">{row.original.original_value}</span>
                                                </div>
                                            </div>
                                        )}
                                        {row.original.original_value && (
                                            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        )}
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                {row.original.original_value ? "Changed" : "New"}
                                            </span>
                                            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <span className="text-sm font-bold text-emerald-600">{row.original.proposed_value}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                header: "Match",
                                accessor: "match_id",
                                render: (row) => {
                                    const match = row.original.metric_value?.match;
                                    if (!match) {
                                        return <span className="text-xs text-gray-400">—</span>;
                                    }
                                    return (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">
                                                Match #{match.match_no || "—"}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                Round: {match.round || "—"}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-medium">
                                                {match.team1?.name || "Team 1"} vs {match.team2?.name || "Team 2"}
                                            </span>
                                        </div>
                                    );
                                }
                            },
                            {
                                header: "Player",
                                accessor: "person_id",
                                render: (row) => (
                                    <span className="text-xs font-medium text-gray-600">
                                        Player #{row.original.metric_value?.person_id || "—"}
                                    </span>
                                )
                            },
                            {
                                header: "Metric Definition",
                                accessor: "metric_definition_id",
                                render: (row) => (
                                    <span className="text-xs text-gray-600">
                                        ID: {row.original.metric_value?.metric_definition_id || "—"}
                                    </span>
                                )
                            },
                            {
                                header: "Submitted By",
                                accessor: "submitter",
                                render: (row) => (
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-gray-700">
                                            {row.original.submitter?.full_name || "—"}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {row.original.submitter?.email || "—"}
                                        </span>
                                    </div>
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

                                    if (!canApprove) {
                                        return <span className="text-xs text-gray-400" title="You don't have permission to approve/reject">No Permission</span>;
                                    }

                                    return (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleProcessRequest(row.original.id, "approved")}
                                                disabled={isProcessingRow}
                                                className="h-8 w-8 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                                                title="Approve"
                                            >
                                                {isProcessingRow ? (
                                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleProcessRequest(row.original.id, "rejected")}
                                                disabled={isProcessingRow}
                                                className="h-8 w-8 rounded-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                                                title="Reject"
                                            >
                                                {isProcessingRow ? (
                                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
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
