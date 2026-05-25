"use client";

import { useAuth } from "@/context/AuthContext";
import secureStorage from "@/lib/secureStorage";

export default function AccessGuard({ permission, children }) {
    const { user } = useAuth();

    if (user?.role === "super_admin") return children;

    if (!permission) return children;

    const userPermissions = typeof window !== "undefined"
        ? secureStorage.getItem("user_permissions", [])
        : [];

    if (userPermissions.includes(permission)) return children;

    return (
        <div className="relative w-full h-full min-h-[60vh] overflow-hidden rounded-2xl">
            {}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 rounded-2xl" />

            {}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-950 uppercase tracking-widest">Access Denied</p>
                    <p className="text-xs text-gray-400 mt-1">You don&apos;t have permission to view this page.</p>
                </div>
            </div>

            {}
            <div className="opacity-20 pointer-events-none select-none">
                {children}
            </div>
        </div>
    );
}
