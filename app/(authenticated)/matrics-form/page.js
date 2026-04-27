"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function MatricsFormPage() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();

    const [metricTree, setMetricTree] = useState(null);
    const [activeIp, setActiveIp] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [userPermissions, setUserPermissions] = useState([]);
    const [isIpOwner, setIsIpOwner] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [debugInfo, setDebugInfo] = useState("");

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const formRef = useRef(null);

    useEffect(() => {
        // Super admin should not access matrics-form page UNLESS they entered as manager
        const enteredAsManager = localStorage.getItem("entered_as_manager") === "true";

        if (user && user.role === "super_admin" && !enteredAsManager) {
            // Super admin in normal mode - redirect to category management
            router.push("/matrics");
            return;
        }
    }, [user, router]);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(formRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });

        // Load user permissions first
        const perms = JSON.parse(localStorage.getItem("user_permissions") || "[]");
        setUserPermissions(perms);

        // Check if user is IP Owner
        const ipOwner = JSON.parse(localStorage.getItem("is_ip_owner") || "false");
        setIsIpOwner(ipOwner);

        // Load active IP and metric tree
        const savedIp = localStorage.getItem("active_ip");

        if (savedIp) {
            const ip = JSON.parse(savedIp);
            setActiveIp(ip);

            // Load metric tree for this property
            const metricTrees = localStorage.getItem("metric_trees");

            if (metricTrees) {
                const trees = JSON.parse(metricTrees);
                const tree = trees[ip.id];

                if (tree) {
                    // Check if tree has a nested 'tree' property or if it's directly the array
                    const treeData = tree.tree || tree;
                    setMetricTree(treeData);
                    // Initialize form data with empty values
                    initializeFormData(treeData);
                } else {
                    // Tree not found in localStorage, fetch from API
                    fetchMetricTree(ip);
                }
            } else {
                // No metric trees in localStorage, fetch from API
                fetchMetricTree(ip);
            }
        }
    }, []);

    const fetchMetricTree = async (ip) => {
        const sportId = ip.sport_id || ip.sport?.id;
        if (!sportId) {
            console.error("No sport ID found for property");
            return;
        }

        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}/get-tree/${sportId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const result = await response.json();
                const treeData = result.data || result;

                if (Array.isArray(treeData)) {
                    console.log("✅ Fetched metric tree from API:", treeData);
                    setMetricTree(treeData);
                    initializeFormData(treeData);
                } else {
                    console.error("Invalid tree data format:", treeData);
                }
            } else {
                console.error("Failed to fetch metric tree:", response.status);
            }
        } catch (error) {
            console.error("Error fetching metric tree:", error);
        }
    };

    const initializeFormData = (tree) => {
        const initialData = {};
        if (Array.isArray(tree)) {
            tree.forEach(category => {
                if (Array.isArray(category.metric_definitions)) {
                    category.metric_definitions.forEach(def => {
                        initialData[def.key_name] = getDefaultValue(def.data_type);
                    });
                }
            });
        }
        setFormData(initialData);
    };
    console.log("metricTreemetricTree", metricTree)
    const getDefaultValue = (dataType) => {
        switch (dataType) {
            case "integer":
            case "float":
                return "";
            case "boolean":
                return false;
            case "string":
            default:
                return "";
        }
    };

    const hasPermission = (permission) => {
        // Super admin has all permissions
        if (user?.role === "super_admin") return true;
        // IP Owner has all permissions
        if (isIpOwner) return true;
        return userPermissions.includes(permission);
    };

    const canEditField = (definition) => {
        // Super admin can edit everything
        if (user?.role === "super_admin") return true;
        // IP Owner can edit everything
        if (isIpOwner) return true;
        // Check if user has data_entry:add or data_entry:edit permission
        return hasPermission("data_entry:add") || hasPermission("data_entry:edit");
    };

    const canViewPage = () => {
        // TEMPORARY: Always return true for debugging
        return true;

        // Super admin can view everything
        if (user?.role === "super_admin") return true;
        // IP Owner can view everything
        if (isIpOwner) return true;
        // Check if user has data_entry:view permission
        return hasPermission("data_entry:view");
    };

    const handleInputChange = (keyName, value, dataType) => {
        let processedValue = value;

        if (dataType === "integer") {
            processedValue = value === "" ? "" : parseInt(value) || 0;
        } else if (dataType === "float") {
            processedValue = value === "" ? "" : parseFloat(value) || 0;
        } else if (dataType === "boolean") {
            processedValue = value;
        }

        setFormData(prev => ({
            ...prev,
            [keyName]: processedValue
        }));

        // Clear error for this field
        if (fieldErrors[keyName]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[keyName];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields and collect errors
        const errors = {};
        let hasError = false;

        if (metricTree && Array.isArray(metricTree)) {
            metricTree.forEach(category => {
                if (Array.isArray(category.metric_definitions)) {
                    category.metric_definitions.forEach(def => {
                        if (def.is_required && (formData[def.key_name] === "" || formData[def.key_name] === null || formData[def.key_name] === undefined)) {
                            errors[def.key_name] = `${def.label} is required`;
                            hasError = true;
                        }
                    });
                }
            });
        }

        if (hasError) {
            setFieldErrors(errors);
            toast.error("Please fill all required fields");
            return;
        }

        setIsSaving(true);

        // TODO: Replace with actual API endpoint
        console.log("Form Data to Submit:", formData);

        // Simulate API call
        setTimeout(() => {
            toast.success("Metrics saved successfully!", {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            setIsSaving(false);
        }, 1000);
    };

    const renderField = (definition) => {

        const { key_name, label, data_type, is_required } = definition;
        const isDisabled = !canEditField(definition);

        switch (data_type) {
            case "integer":
            case "float":
                return (
                    <div key={key_name} className="relative">
                        <Input
                            label={label}
                            type="number"
                            step={data_type === "float" ? "0.01" : "1"}
                            placeholder={`Enter ${label.toLowerCase()}`}
                            required={is_required && !isDisabled}
                            value={formData[key_name] || ""}
                            onChange={(e) => handleInputChange(key_name, e.target.value, data_type)}
                            disabled={isDisabled}
                            className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                        />
                        {isDisabled && (
                            <div className="absolute top-0 right-0 mt-1 mr-1">
                                <div className="bg-red-50 border border-red-100 rounded-lg px-2 py-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">No Access</span>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "boolean":
                return (
                    <div key={key_name} className="flex flex-col space-y-2 relative">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                            {label} {is_required && !isDisabled && <span className="text-red-400">*</span>}
                        </label>
                        <div className={`flex items-center h-[52px] px-5 bg-gray-50 border border-gray-100 rounded-xl ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                            <label className={`flex items-center gap-3 ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"} group/check`}>
                                <div
                                    onClick={() => !isDisabled && handleInputChange(key_name, !formData[key_name], data_type)}
                                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"} ${formData[key_name] ? "border-gray-950 bg-gray-950" : "border-gray-200 hover:border-gray-400"}`}
                                >
                                    {formData[key_name] && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className={`text-sm font-semibold text-gray-600 ${!isDisabled && "group-hover/check:text-gray-950"} transition-colors`}>
                                    {formData[key_name] ? "Yes" : "No"}
                                </span>
                            </label>
                        </div>
                        {isDisabled && (
                            <div className="absolute top-0 right-0 mt-1 mr-1">
                                <div className="bg-red-50 border border-red-100 rounded-lg px-2 py-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">No Access</span>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "string":
            default:
                return (
                    <div key={key_name} className="relative">
                        <Input
                            label={label}
                            type="text"
                            placeholder={`Enter ${label.toLowerCase()}`}
                            required={is_required && !isDisabled}
                            value={formData[key_name] || ""}
                            onChange={(e) => handleInputChange(key_name, e.target.value, data_type)}
                            disabled={isDisabled}
                            className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                        />
                        {isDisabled && (
                            <div className="absolute top-0 right-0 mt-1 mr-1">
                                <div className="bg-red-50 border border-red-100 rounded-lg px-2 py-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">No Access</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    if (!metricTree) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-gray-300">
                    <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-widest">Loading Metrics...</span>
                </div>
            </div>
        );
    }

    // Check if user has permission to view this page
    if (!canViewPage()) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <div className="h-20 w-20 rounded-2xl bg-red-50 flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-950 uppercase tracking-tight mb-2">Access Denied</h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            You don't have permission to view this page. Please contact your administrator to request access.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="mt-4 px-6 py-3 bg-gray-950 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={pageRef} className="space-y-6">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">
                            {activeIp?.name || "Property"}
                        </span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Metrics Form</h1>
                    <p className="text-[14px] text-gray-400 font-normal">Fill in the metrics for your property.</p>
                </div>
            </div>

            {/* Form */}
            <div ref={formRef} className="px-4">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100/50 shadow-sm p-8 space-y-8">
                    {Array.isArray(metricTree) && metricTree.map((category, catIndex) => {
                        // Skip categories without metric definitions
                        if (!Array.isArray(category.metric_definitions) || category.metric_definitions.length === 0) {
                            return null;
                        }

                        return (
                            <div key={catIndex} className="space-y-5">
                                {/* Category Header */}
                                <div className="pb-3 border-b border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-widest flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                                        {category.name}
                                    </h3>

                                </div>

                                {/* Category Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 ml-4">
                                    {category.metric_definitions.map(definition => (
                                        renderField(definition)
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Submit Button */}
                    <div className="pt-4 flex justify-end">
                        <Button
                            type="submit"
                            disabled={isSaving || !hasPermission("data_entry:add")}
                            className="min-w-[200px]"
                        >
                            {isSaving ? "SAVING..." : "SAVE METRICS"}
                        </Button>
                        {!hasPermission("data_entry:add") && (
                            <div className="ml-3 flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                No Permission to Save
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
