"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import { DataTable, Button, Input } from "@/components/UI";
import { useTheme } from "@/components/ThemeContext";
import apiClient from "@/lib/apiClient";

const ROLES = [
    { id: 1, name: "Super Admin" },
    { id: 2, name: "IP Admin" },
    { id: 3, name: "Tournament Manager" },
    { id: 4, name: "Analyst" },
];

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

    const [users, setUsers] = useState([]);
    const [tableLoading, setTableLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ full_name: "", email: "", role_id: 3 });

    const pageRef = useRef(null);
    const headerRef = useRef(null);
    const tableRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(pageRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        gsap.fromTo(headerRef.current, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        gsap.fromTo(tableRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.15 });
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setTableLoading(true);
        const activeIp = JSON.parse(localStorage.getItem("active_ip") || "null");
        const propertyId = activeIp?.id;
        const endpoint = propertyId
            ? `${process.env.NEXT_PUBLIC_USERS_ENDPOINT}?property_id=${propertyId}`
            : process.env.NEXT_PUBLIC_USERS_ENDPOINT;

        const result = await apiClient.get(endpoint);
        if (result.success) {
            // API response: { status, statusCode, data: [...] }
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
            }));
            setUsers(list);
        } else {
            toast.error(result.error || "Failed to load users.");
        }
        setTableLoading(false);
    };

    const openModal = () => {
        setFormData({ full_name: "", email: "", role_id: 3 });
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
        };
        const result = await apiClient.post(process.env.NEXT_PUBLIC_USERS_ENDPOINT, payload);
        if (result.success) {
            toast.success(`${formData.full_name} added successfully!`, {
                style: { background: '#f0fdf4', color: '#166534', borderRadius: '16px', border: '1px solid #bbf7d0' },
            });
            await fetchUsers();
            closeModal();
        } else {
            toast.error(result.error || "Failed to add user.");
        }
        setIsSaving(false);
    };

    const columns = [
        {
            header: "Name",
            render: (u) => (
                <div className="flex items-center gap-3">
                    <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ backgroundColor: theme.primaryColor }}
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
    ];

    return (
        <div ref={pageRef} className="space-y-6">
            <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <div className="h-1 w-6 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                        <span className="text-[12px] font-semibold uppercase tracking-[0.4em] text-gray-400">Management</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-950 tracking-tight leading-none mb-1">Users</h1>
                    <p className="text-[14px] text-gray-400 font-normal tracking-wide">Manage users and their access across properties.</p>
                </div>
                <Button
                    onClick={openModal}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                >
                    Add User
                </Button>
            </div>

            <div ref={tableRef}>
                {tableLoading ? (
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/20 backdrop-blur-[20px] animate-in fade-in duration-200">
                    <div ref={modalRef} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100/50 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-950 uppercase tracking-tight">Add User</h3>
                                <p className="text-xs text-gray-400 font-bold mt-1.5 tracking-widest uppercase">New User Registration</p>
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
                                >
                                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-2">
                                <Button type="submit" disabled={isSaving} className="w-full">
                                    {isSaving ? "SAVING..." : "ADD USER"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
