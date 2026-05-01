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

const TABS = ["Edit Approval", "New Approval"];

export default function ApprovalsPage() {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState("Edit Approval");

    // Edit Approval (Metric Values) state
    const [metricValues, setMetricValues] = useState([]);
    const [metricValuesLoading, setMetricValuesLoading] = useState(false);
    const [isProcessingMetric, setIsProcessingMetric] = useState({});

    // New Approval (Change Requests) state
    const [changeRequests, setChangeRequests] = useState([]);
    const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [isProcessingRequest, setIsProcessingRequest] = useState({});

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });
    }, []);

    useEffect(() => {
        if (activeTab === "Edit Approval") {
            fetchMetricValues();
        } else {
            fetchChangeRequests();
        }
    }, [activeTab, statusFilter]);

    const fetchMetricValues = useCallback(async () => {
        setMetricValuesLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}?is_approved=false`
        );
        if (result.success) {
            const data = result.data?.data;
            const arr = Array.isArray(data?.metric_values) ? data.metric_values
                : Array.isArray(data) ? data : [];
            setMetricValues(arr);
        } else {
            toast.error(result.error || "Failed to load metric values.");
        }
        setMetricValuesLoading(false);
    }, []);

    const fetchChangeRequests = useCallback(async () => {
        setChangeRequestsLoading(true);
        const result = await apiClient.get(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/all?status=${statusFilter}`
        );
        if (result.success) {
            const arr = result.data?.data?.change_requests
                || result.data?.change_requests
                || (Array.isArray(result.data?.data) ? result.data.data : null)
                || (Array.isArray(result.data) ? result.data : []);
            setChangeRequests(Array.isArray(arr) ? arr : []);
        } else {
            toast.error(result.error || "Failed to load change requests.");
        }
        setChangeRequestsLoading(false);
    }, [statusFilter]);

    const handleApproveMetricValue = async (metricValueId) => {
        setIsProcessingMetric(prev => ({ ...prev, [metricValueId]: true }));

        const result = await apiClient.post(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}/${metricValueId}/approve`
        );

        if (result.success) {
            toast.success("Metric value approved successfully!", {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchMetricValues();
        } else {
            toast.error(result.error || "Failed to approve metric value.");
        }

        setIsProcessingMetric(prev => ({ ...prev, [metricValueId]: false }));
    };

    const handleRejectMetricValue = async (metricValueId) => {
        setIsProcessingMetric(prev => ({ ...prev, [metricValueId]: true }));

        const result = await apiClient.delete(
            `${process.env.NEXT_PUBLIC_METRIC_VALUES_ENDPOINT}/${metricValueId}`
        );

        if (result.success) {
            toast.success("Metric value deleted successfully!", {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchMetricValues();
        } else {
            toast.error(result.error || "Failed to delete metric value.");
        }

        setIsProcessingMetric(prev => ({ ...prev, [metricValueId]: false }));
    };

    const handleProcessRequest = async (requestId, status) => {
        setIsProcessingRequest(prev => ({ ...prev, [requestId]: true }));

        const result = await apiClient.patch(
            `${process.env.NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT}/process/${requestId}`,
            { status }
        );

        if (result.success) {
            toast.success(`Request ${status} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchChangeRequests();
        } else {
            toast.error(result.error || `Failed to ${status} request.`);
        }

        setIsProcessingRequest(prev => ({ ...prev, [requestId]: false }));
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

    const switchTab = (tab) => {
        gsap.to(contentRef.current, {
            y: -8, opacity: 0, duration: 0.2, ease: "power2.in",
            onComplete: () => {
                setActiveTab(tab);
                gsap.fromTo(contentRef.current, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" });
            }
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

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => switchTab(tab)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${activeTab === tab ? "text-white shadow-md" : "text-gray-400 hover:text-gray-950"
                                }`}
                            style={activeTab === tab ? { backgroundColor: theme.primary_color } : {}}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div ref={contentRef} className="px-4">
                {/* Edit Approval Tab */}
                {activeTab === "Edit Approval" && (
                    <div className="space-y-4">
                        {metricValuesLoading ? (
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
                                    // {
                                    //     header: "Metric",
                                    //     accessor: "metric_definition_id",
                                    //     render: (row) => (
                                    //         <span className="text-sm font-semibold text-gray-950">
                                    //             Metric #{row.original.metric_definition_id}
                                    //         </span>
                                    //     )
                                    // },

                                    {
                                        header: "Match",
                                        accessor: "match_id",
                                        render: (row) => (
                                            <span className="text-xs text-gray-600">Match #{row.original.match_id}</span>
                                        )
                                    },
                                    {
                                        header: "Player",
                                        accessor: "person_id",
                                        render: (row) => (
                                            <span className="text-xs text-gray-600">Player #{row.original.person_id}</span>
                                        )
                                    },

                                    {
                                        header: "Date",
                                        accessor: "recorded_date",
                                        render: (row) => (
                                            <span className="text-xs text-gray-500">
                                                {row.original.recorded_date ? new Date(row.original.recorded_date).toLocaleDateString("en-IN") : "—"}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Value",
                                        accessor: "value_text",
                                        render: (row) => (
                                            <span className="text-sm font-bold text-gray-950">{row.original.value_text}</span>
                                        )
                                    },

                                    {
                                        header: "Actions",
                                        accessor: "actions",
                                        align: "center",
                                        render: (row) => (
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleApproveMetricValue(row.original.id)}
                                                    disabled={isProcessingMetric[row.original.id]}
                                                    className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isProcessingMetric[row.original.id] ? "..." : "Approve"}
                                                </button>
                                                <button
                                                    onClick={() => handleRejectMetricValue(row.original.id)}
                                                    disabled={isProcessingMetric[row.original.id]}
                                                    className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isProcessingMetric[row.original.id] ? (
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        )
                                    }
                                ]}
                                data={metricValues.map((mv, idx) => ({ ...mv, index: idx + 1, original: mv }))}
                                emptyMessage="No pending metric values found."
                                itemsPerPage={10}
                            />
                        )}
                    </div>
                )}

                {/* New Approval Tab */}
                {activeTab === "New Approval" && (
                    <div className="space-y-4">
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

                        {changeRequestsLoading ? (
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
                                        header: "Request ID",
                                        accessor: "id",
                                        render: (row) => (
                                            <span className="text-sm font-bold text-gray-950">#{row.original.id}</span>
                                        )
                                    },
                                    {
                                        header: "Type",
                                        accessor: "request_type",
                                        render: (row) => (
                                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                {row.original.request_type || "—"}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Description",
                                        accessor: "description",
                                        render: (row) => (
                                            <span className="text-sm text-gray-700 line-clamp-2">
                                                {row.original.description || "No description"}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Requested By",
                                        accessor: "requested_by",
                                        render: (row) => (
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: theme.primary_color }}>
                                                    {row.original.requested_by_name?.slice(0, 2).toUpperCase() || "??"}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-950">
                                                    {row.original.requested_by_name || `User ${row.original.requested_by}`}
                                                </span>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Date",
                                        accessor: "created_at",
                                        render: (row) => (
                                            <span className="text-xs text-gray-500 font-medium">
                                                {formatDate(row.original.created_at || row.original.rec_created)}
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
                                            if (row.original.status !== "pending") {
                                                return (
                                                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                                        {row.original.status === "approved" ? "Approved" : "Rejected"}
                                                    </span>
                                                );
                                            }

                                            return (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleProcessRequest(row.original.id, "approved")}
                                                        disabled={isProcessingRequest[row.original.id]}
                                                        className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessingRequest[row.original.id] ? "..." : "Approve"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleProcessRequest(row.original.id, "rejected")}
                                                        disabled={isProcessingRequest[row.original.id]}
                                                        className="h-8 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isProcessingRequest[row.original.id] ? "..." : "Reject"}
                                                    </button>
                                                </div>
                                            );
                                        }
                                    }
                                ]}
                                data={changeRequests.map((request, idx) => ({ ...request, index: idx + 1, original: request }))}
                                emptyMessage={`No ${statusFilter} change requests found.`}
                                itemsPerPage={10}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
