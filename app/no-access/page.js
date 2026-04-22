"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { initialTheme } from "@/config/theme";
import { useTheme } from "@/components/ThemeContext";

export default function NoAccessPage() {
    const router = useRouter();
    const { logout } = useAuth();
    const { updateTheme } = useTheme();

    const handleLogout = () => {
        updateTheme(initialTheme);
        logout();
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-[family-name:var(--font-poppins)]">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.04)] p-10 flex flex-col items-center text-center">
                {/* Icon */}
                <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                {/* Title */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-[1.5px] w-4 bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Access Restricted</span>
                    <div className="h-[1.5px] w-4 bg-gray-200" />
                </div>
                <h1 className="text-xl font-semibold text-gray-950 uppercase tracking-tight mb-3">No Property Assigned</h1>
                <p className="text-sm text-gray-400 leading-relaxed mb-8">
                    Your account is not linked to any active property. Please contact your administrator to get access.
                </p>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gray-950 text-white text-xs font-semibold uppercase tracking-[0.15em] hover:bg-gray-800 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Back to Login
                </button>
            </div>
        </div>
    );
}
