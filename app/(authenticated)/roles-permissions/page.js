"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import gsap from "gsap";
import { DataTable, Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";

// Permission modules - Sports Tournament IP Management System
const PERMISSION_MODULES = [
    {
        module: "IP Management",
        permissions: [
            "View IPs", "Create IP", "Edit IP", "Delete IP", "Activate/Deactivate IP", "All"
        ]
    },
    {
        module: "Tournament Management",
        permissions: [
            "Create Tournament", "Edit Tournament", "Delete Tournament",
            "Publish Tournament", "Archive Tournament", "All"
        ]
    },
    {
        module: "Team Management",
        permissions: [
            "Add Team", "Edit Team", "Remove Team",
            "Manage Squad", "Transfer Players", "All"
        ]
    },
    {
        module: "Match Management",
        permissions: [
            "Schedule Match", "Edit Match", "Cancel Match",
            "Update Live Score", "Manage Match Officials", "All"
        ]
    },
    {
        module: "Player Management",
        permissions: [
            "Add Player", "Edit Player", "Remove Player",
            "View Player Stats", "Manage Player Profile", "All"
        ]
    },
    {
        module: "Reports & Analytics",
        permissions: [
            "View Tournament Reports", "View Team Reports", "View Player Reports",
            "Export Data", "View Financial Reports", "All"
        ]
    },
    {
        module: "Admin & Access Control",
        permissions: [
            "Manage Admins", "Assign Roles", "View Audit Logs",
            "Manage Permissions", "All"
        ]
    }
];

const INITIAL_ROLES = [
    { id: 1, name: "Super Admin", status: "Active", permissions: {} },
    { id: 2, name: "IP Admin", status: "Active", permissions: {} },
    { id: 3, name: "Tournament Manager", status: "Active", permissions: {} },
    { id: 4, name: "Match Official", status: "Active", permissions: {} },
    { id: 5, name: "Analyst", status: "Active", permissions: {} },
    { id: 6, name: "Viewer", status: "Active", permissions: {} },
];

export default function RolesPermissionsPage() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const router = useRouter();

    const [roles, setRoles] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [view, setView] = useState("list");
    const [editingRole, setEditingRole] = useState(null);

    // Form state
    const [roleName, setRoleName] = useState("");
    const [accessType, setAccessType] = useState("");
    const [roleStatus, setRoleStatus] = useState("Active");
    const [selectedPerms, setSelectedPerms] = useState({});

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const contentRef = useRef(null);

    // Role-based access
    useEffect(() => {
        if (user && user.role !== "super_admin" && user.role !== "admin") {
            router.push("/dashboard");
        }
    }, [user, router]);

    // Entrance animation
    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(contentRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.1 });
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setTableLoading(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const propertyId = activeIp?.id;
        const endpoint = propertyId
            ? `${process.env.NEXT_PUBLIC_ROLES_ENDPOINT}?property_id=${propertyId}`
            : process.env.NEXT_PUBLIC_ROLES_ENDPOINT;

        const result = await apiClient.get(endpoint);
        if (result.success) {
            const arr = Array.isArray(result.data?.data)
                ? result.data.data
                : Array.isArray(result.data)
                    ? result.data
                    : [];
            setRoles(arr);
        } else {
            toast.error(result.error || "Failed to load roles.");
        }
        setTableLoading(false);
    };

    // Animate view transitions
    const switchView = (newView, role = null) => {
        gsap.to(contentRef.current, {
            y: -12, opacity: 0, duration: 0.25, ease: "power2.in",
            onComplete: () => {
                setView(newView);
                setEditingRole(role);
                if (role) {
                    setRoleName(role.name);
                    setAccessType(role.accessType || "");
                    setRoleStatus(role.status);
                    setSelectedPerms(role.permissions || {});
                } else if (newView === "add") {
                    setRoleName(""); setAccessType(""); setRoleStatus("Active"); setSelectedPerms({});
                }
                gsap.fromTo(contentRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
            }
        });
    };

    const togglePerm = (module, perm) => {
        setSelectedPerms(prev => {
            const modulePerms = prev[module] || [];
            const allPerms = PERMISSION_MODULES.find(m => m.module === module)?.permissions.filter(p => p !== "All") || [];

            if (perm === "All") {
                // Toggle all permissions in module
                const allSelected = allPerms.every(p => modulePerms.includes(p));
                return { ...prev, [module]: allSelected ? [] : [...allPerms] };
            }

            const updated = modulePerms.includes(perm)
                ? modulePerms.filter(p => p !== perm)
                : [...modulePerms, perm];
            return { ...prev, [module]: updated };
        });
    };

    const isAllSelected = (module) => {
        const allPerms = PERMISSION_MODULES.find(m => m.module === module)?.permissions.filter(p => p !== "All") || [];
        const modulePerms = selectedPerms[module] || [];
        return allPerms.length > 0 && allPerms.every(p => modulePerms.includes(p));
    };

    const selectAll = () => {
        const all = {};
        PERMISSION_MODULES.forEach(m => {
            all[m.module] = m.permissions.filter(p => p !== "All");
        });
        setSelectedPerms(all);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!roleName.trim()) { toast.error("Role name is required."); return; }

        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const payload = {
            name: roleName,
            property_id: activeIp?.id,
        };

        const result = await apiClient.post(process.env.NEXT_PUBLIC_ROLES_ENDPOINT, payload);
        if (result.success) {
            toast.success(`${roleName} ${editingRole ? "updated" : "created"} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' }
            });
            await fetchRoles();
            switchView("list");
        } else {
            toast.error(result.error || "Failed to save role.");
        }
    };

    const handleDelete = async (id, name) => {
        setRoles(roles.filter(r => r.id !== id));
        toast.success(`${name} deleted!`, {
            style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' }
        });
    };

    // Table columns
    const columns = [
        {
            header: "Role Name",
            render: (role) => (
                <span className="text-sm font-semibold text-gray-950">{role.name}</span>
            )
        },
        {
            header: "Status",
            render: (role) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-[0.15em] leading-none
          ${role.status === "Active"
                        ? "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]"
                        : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                    <span className={`relative flex h-1.5 w-1.5 ${role.status === "Active" ? "" : "opacity-40"}`}>
                        {role.status === "Active" && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDuration: '3s' }}></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${role.status === "Active" ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                    </span>
                    {role.status}
                </span>
            )
        },
        {
            header: "Action",
            align: "right",
            render: (role) => (
                <div className="flex items-center justify-end space-x-2">
                    <button
                        onClick={() => switchView("edit", role)}
                        className="h-9 w-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-950 transition-all shadow-sm"
                        title="Edit Role"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => handleDelete(role.id, role.name)}
                        className="h-9 w-9 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                        title="Delete Role"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            )
        }
    ];



    return (
        <div ref={pageRef} className="space-y-6">
            {/* Header */}
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primaryColor }}></div>
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Access Control</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">
                        {view === "list" ? "Roles & Permissions" : view === "add" ? "Add Role" : "Edit Role"}
                    </h1>
                    <p className="text-[14px] text-gray-400 font-normal tracking-wide">
                        {view === "list" ? "Manage access roles and their permission sets." : "Configure role details and module permissions."}
                    </p>
                </div>

                {view === "list" && (
                    <Button
                        onClick={() => switchView("add")}
                        icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                    >
                        Add Role
                    </Button>
                )}

                {view !== "list" && (
                    <button
                        onClick={() => switchView("list")}
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Roles
                    </button>
                )}
            </div>

            {/* Content */}
            <div ref={contentRef} className="px-4">
                {view === "list" && (
                    tableLoading ? (
                        <div className="w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                                <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
                                <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" />
                            </div>
                            <table className="w-full">
                                <tbody>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            {[60, 30, 20].map((w, j) => (
                                                <td key={j} className="px-6 py-4">
                                                    <div className="h-4 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${w}%` }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={roles}
                            emptyMessage="No roles found. Click 'Add Role' to create one."
                        />
                    )
                )}

                {(view === "add" || view === "edit") && (
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Top fields */}
                        <div className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <Input
                                    label="Role Name"
                                    placeholder="Enter Role Name"
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Access Type"
                                    placeholder="Select Access Type"
                                    value={accessType}
                                    onChange={(e) => setAccessType(e.target.value)}
                                />
                                <div className="flex flex-col space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
                                    <div className="flex items-center gap-6 py-4">
                                        {["Active", "Inactive"].map((s) => (
                                            <label key={s} className="flex items-center gap-2 cursor-pointer group">
                                                <div
                                                    onClick={() => setRoleStatus(s)}
                                                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${roleStatus === s ? "border-gray-950" : "border-gray-200"}`}
                                                >
                                                    {roleStatus === s && <div className="h-2 w-2 rounded-full bg-gray-950"></div>}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-950 transition-colors">{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Permissions table */}
                        <div className="bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden">
                            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Permissions</span>
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-gray-950 transition-all"
                                >
                                    Select All
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="px-8 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest w-56">Module</th>
                                            <th className="px-8 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest">Permissions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {PERMISSION_MODULES.map((mod, idx) => {
                                            const modulePerms = selectedPerms[mod.module] || [];
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="px-8 py-5 align-top">
                                                        <span className="text-sm font-bold text-gray-950">{mod.module}</span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex flex-wrap gap-3">
                                                            {mod.permissions.map((perm) => {
                                                                const checked = perm === "All" ? isAllSelected(mod.module) : modulePerms.includes(perm);
                                                                return (
                                                                    <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                                                                        <div
                                                                            onClick={() => togglePerm(mod.module, perm)}
                                                                            className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0
                                        ${checked ? "border-gray-950 bg-gray-950" : "border-gray-200 hover:border-gray-400"}`}
                                                                        >
                                                                            {checked && (
                                                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-950 transition-colors whitespace-nowrap">{perm}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-8 py-6 border-t border-gray-50 flex justify-end">
                                <Button type="submit">
                                    {editingRole ? "Save Changes" : "Submit"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
