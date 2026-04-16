"use client";

import { useAuth } from "@/context/AuthContext";

export default function AccessGuard({ permission, children }) {
    const { user } = useAuth();

    // Super admin always has access
    if (user?.role === "super_admin") return children;

    // No permission required - allow
    if (!permission) return children;

    // Check user permissions from localStorage
    const userPermissions = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("user_permissions") || "[]")
        : [];

    if (userPermissions.includes(permission)) return children;

    // Access Denied UI
    return (
        <div className="relative w-full h-full min-h-[60vh] overflow-hidden rounded-2xl">
            {/* Blurred background placeholder */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 rounded-2xl" />

            {/* Lock icon + message */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-950 uppercase tracking-widest">Access Denied</p>
                    <p className="text-xs text-gray-400 mt-1">You don't have permission to view this page.</p>
                </div>
            </div>

            {/* Faded content behind blur */}
            <div className="opacity-20 pointer-events-none select-none">
                {children}
            </div>
        </div>
    );
}
