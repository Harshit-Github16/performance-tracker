"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearTokenCache } from "@/lib/apiClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeIp, setActiveIpState] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage once
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const savedUser = localStorage.getItem("auth_user");
        const savedIp = localStorage.getItem("active_ip");

        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedIp) setActiveIpState(JSON.parse(savedIp));
      } catch (error) {
        console.error("Failed to parse auth data:", error);
        // Clear corrupted data
        localStorage.removeItem("auth_user");
        localStorage.removeItem("active_ip");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const setActiveIp = useCallback((ip) => {
    setActiveIpState(ip);
    if (ip) {
      localStorage.setItem("active_ip", JSON.stringify(ip));
    } else {
      localStorage.removeItem("active_ip");
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_LOGIN_ENDPOINT}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data?.message || "Invalid email or password." };
      }

      const token = data.data.token;
      const userData = data.data.user;

      const authenticatedUser = {
        id: userData.id,
        username: userData.full_name,
        email: userData.email,
        role: userData.is_super_admin ? "super_admin" : "admin",
        avatar_initials: userData.full_name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 3),
        ips: [],
      };

      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);

      return { success: true, user: authenticatedUser, token };
    } catch (error) {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const updateUserIps = useCallback((ips) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ips };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setActiveIpState(null);
    clearTokenCache();

    // Clear all auth-related data
    const keysToRemove = [
      "auth_user",
      "auth_token",
      "active_ip",
      "entered_as_manager",
      "elev8_theme",
      "user_permissions",
      "is_ip_owner",
      "metric_trees"
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));
    router.push("/login");
  }, [router]);

  const contextValue = useMemo(
    () => ({ user, activeIp, setActiveIp, login, logout, loading, updateUserIps }),
    [user, activeIp, setActiveIp, login, logout, loading, updateUserIps]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
