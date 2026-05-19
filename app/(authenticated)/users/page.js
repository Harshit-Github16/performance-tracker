"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { DataTable, Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { hasPermission } from "@/lib/permissions";

const SkeletonRow = () => (
    <tr className="border-b border-gray-50">
        {[1, 2, 3, 4].map((i) => (
            <td key={i} className="px-6 py-4">
                <div className="h-4 bg-gray-100 rounded-lg animate-pulse" style={{ width: `${[50, 60, 35, 25][i - 1]}%` }} />
            </td>
        ))}
    </tr>
);

export default function UsersPage() {
    const { theme } = useTheme();
    const { user, activeIp, loading } = useAuth();
    const canView = hasPermission("users:view", user);
    const canAdd = hasPermission("users:add", user);
    const canEdit = hasPermission("users:edit", user);
    const canDelete = hasPermission("users:del", user);

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [formData, setFormData] = useState({ full_name: "", email: "", role_id: "", is_active: true });

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const tableRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(tableRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.15 });
    }, []);

    useEffect(() => {
        // Wait for auth to finish loading, then fetch users if activeIp is available
        if (!loading && activeIp?.id) {
            // Clear any stale user data when activeIp changes
            setUsers([]);
            fetchUsers();
        } else if (!loading && !activeIp?.id) {
            // Auth loaded but no activeIp - stop loading state
            setTableLoading(false);
        }
    }, [activeIp?.id, loading]); // Depend on both activeIp.id and loading state

    const fetchUsers = async () => {
        setTableLoading(true);
        const propertyId = activeIp?.id;
        const endpoint = propertyId
            ? `${process.env.NEXT_PUBLIC_USERS_ENDPOINT}?property_id=${propertyId}`
            : process.env.NEXT_PUBLIC_USERS_ENDPOINT;

        const result = await apiClient.get(endpoint);
        if (result.success) {
            const arr = Array.isArray(result.data?.data)
                ? result.data.data
                : Array.isArray(result.data)
                    ? result.data
                    : [];

            const list = arr.map((item) => ({
                access_id: item.access_id,
                is_active: item.is_active,
                full_name: item.user?.full_name ?? "",
                email: item.user?.email ?? "",
                role_name: item.role?.name ?? "—",
                role_id: item.role?.id ?? "",
            }));
            setUsers(list);
        } else {
            toast.error(result.error || "Failed to load users.");
        }
        setTableLoading(false);
    };

    const fetchRoles = async () => {
        setRolesLoading(true);
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
            // Only set default role if in add mode (no editingUserId)
            if (arr.length > 0 && !editingUserId) {
                setFormData(prev => ({ ...prev, role_id: arr[0].id }));
            }
        }
        setRolesLoading(false);
    };

    const openModal = async (user = null) => {
        if (user) {
            // Edit mode - first fetch roles and prepare data, then open modal
            setEditingUserId(user.access_id);
            await fetchRoles();
            setFormData({
                full_name: user.full_name,
                email: user.email,
                role_id: user.role_id || "",
                is_active: user.is_active
            });
        } else {
            // Add mode - fetch roles and reset form
            setEditingUserId(null);
            setFormData({ full_name: "", email: "", role_id: "", is_active: true });
            await fetchRoles();
        }

        // Open modal only after data is ready
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
        if (!activeIp?.id) {
            toast.error("No active property selected.");
            setIsSaving(false);
            return;
        }
        const payload = {
            full_name: formData.full_name,
            email: formData.email,
            role_id: Number(formData.role_id),
            property_id: activeIp.id,
            is_active: formData.is_active
        };

        const result = editingUserId
            ? await apiClient.put(`${process.env.NEXT_PUBLIC_USERS_ENDPOINT}/${editingUserId}`, payload)
            : await apiClient.post(process.env.NEXT_PUBLIC_USERS_ENDPOINT, payload);

        if (result.success) {
            toast.success(`${formData.full_name} ${editingUserId ? 'updated' : 'added'} successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchUsers();
            closeModal();
        } else {
            toast.error(result.error || `Failed to ${editingUserId ? 'update' : 'add'} user.`);
        }
        setIsSaving(false);
    };

    const handleDeleteUser = async (accessId, fullName) => {
        const result = await apiClient.delete(
            `${process.env.NEXT_PUBLIC_USERS_ENDPOINT}/${accessId}`,
            { property_id: activeIp?.id }
        );
        if (result.success) {
            setUsers(prev => prev.filter(u => u.access_id !== accessId));
            toast.success(`${fullName} removed successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
        } else {
            toast.error(result.error || "Failed to delete user.");
        }
    };

    const columns = [
        {
            header: "Name",
            render: (u) => (
                <div className="flex items-center gap-3">
                    <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ backgroundColor: theme.primary_color }}
                    >
                        {u.full_name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U"}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-950">{u.full_name}</span>
                        <span className="text-xs text-gray-400">{u.email}</span>
                    </div>
                </div>
            ),
        },
        {
            header: "Email",
            render: (u) => <span className="text-sm text-gray-500">{u.email}</span>,
        },
        {
            header: "Role",
            render: (u) => (
                <span className="inline-flex items-center bg-gray-50 text-gray-500 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-widest border border-gray-100/30">
                    {u.role_name}
                </span>
            ),
        },
        {
            header: "Status",
            align: "center",
            render: (u) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-[0.15em] ${u.is_active ? "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                    <span className="relative flex h-1.5 w-1.5">
                        {u.is_active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animationDuration: '3s' }} />}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${u.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                    </span>
                    {u.is_active ? "Active" : "Inactive"}
                </span>
            ),
        },
        {
            header: "Actions",
            align: "center",
            render: (u) => (
                <div className="flex items-center justify-center space-x-2">
                    <button
                        onClick={() => canEdit && openModal(u)}
                        disabled={!canEdit}
                        className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-400"
                        title={canEdit ? "Edit user" : "You don't have permission to edit users"}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => canDelete && handleDeleteUser(u.access_id, u.full_name)}
                        disabled={!canDelete}
                        className="h-8 w-8 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-400"
                        title={canDelete ? "Delete user" : "You don't have permission to delete users"}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div ref={pageRef} className="space-y-6">
            {!canView ? (
                <div className="w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-widest mb-2">Access Denied</h3>
                        <p className="text-xs text-gray-400">You don&apos;t have permission to view users.</p>
                    </div>
                </div>
            ) : (
                <>
                    <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primary_color }} />
                                <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Management</span>
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Users</h1>
                            <p className="text-[14px] text-gray-400 font-normal tracking-wide">Manage users and their access across properties.</p>
                        </div>
                        <Button
                            onClick={canAdd ? openModal : undefined}
                            disabled={!canAdd}
                            title={!canAdd ? "You don't have permission to add users" : undefined}
                            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                        >
                            Add User
                        </Button>
                    </div>

                    <div ref={tableRef}>
                        {!activeIp?.id ? (
                            <div className="w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] p-12">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-950 uppercase tracking-widest mb-2">No Property Selected</h3>
                                    <p className="text-xs text-gray-400">Please select a property to view and manage users.</p>
                                </div>
                            </div>
                        ) : tableLoading ? (
                            <div className="w-full bg-white rounded-2xl border border-gray-100/50 shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                                    <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />
                                    <div className="h-4 w-40 bg-gray-100 rounded-lg animate-pulse" />
                                </div>
                                <div className="border-b border-gray-50 px-6 py-2 flex gap-6">
                                    {["Name", "Email", "Role", "Status"].map((h) => (
                                        <div key={h} className="h-3 bg-gray-100 rounded animate-pulse flex-1" />
                                    ))}
                                </div>
                                <table className="w-full">
                                    <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
                                </table>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={users}
                                emptyMessage="No users found. Click 'Add User' to create one."
                            />
                        )}
                    </div>

                    {isModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                            <div ref={modalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-950 uppercase tracking-tight">{editingUserId ? "Edit User" : "Add User"}</h3>
                                        <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">{editingUserId ? "Update User Details" : "New User Registration"}</p>
                                    </div>
                                    <button onClick={closeModal} className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-950 transition-all active:scale-95">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <form onSubmit={handleSave} className="p-8 space-y-6">
                                    <Input label="Full Name" placeholder="e.g. John Doe" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                                    <Input label="Email Address" type="email" placeholder="user@example.com" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Role</label>
                                        <select
                                            value={formData.role_id}
                                            onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all"
                                            required
                                        >
                                            {rolesLoading
                                                ? <option>Loading...</option>
                                                : roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div className="flex flex-col space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status</label>
                                        <div className="flex items-center gap-6 py-4">
                                            {[
                                                { label: "Active", value: true },
                                                { label: "Inactive", value: false }
                                            ].map((status) => (
                                                <label key={status.label} className="flex items-center gap-2 cursor-pointer group">
                                                    <div
                                                        onClick={() => setFormData({ ...formData, is_active: status.value })}
                                                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${formData.is_active === status.value ? "border-gray-950" : "border-gray-200"}`}
                                                    >
                                                        {formData.is_active === status.value && <div className="h-2 w-2 rounded-full bg-gray-950" />}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-950 transition-colors">{status.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button type="submit" disabled={isSaving} className="w-full">
                                            {isSaving ? "SAVING..." : editingUserId ? "UPDATE USER" : "ADD USER"}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
