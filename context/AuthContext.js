"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearTokenCache } from "@/lib/apiClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Initialize from localStorage synchronously to avoid flash of empty state
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedUser = localStorage.getItem("auth_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activeIp, setActiveIpState] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedIp = localStorage.getItem("active_ip");
      return savedIp ? JSON.parse(savedIp) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user properties and permissions on mount (page refresh)
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("auth_token");
      const savedUser = localStorage.getItem("auth_user");

      // If no token or user, mark as not loading
      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);

        // Super admin doesn't need properties API call
        if (parsedUser.role === "super_admin") {
          setLoading(false);
          return;
        }

        // Fetch properties and permissions for admin users
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_MY_PROPERTIES_ENDPOINT}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          // If API fails (401, etc), clear auth and redirect to login
          if (response.status === 401) {
            logout();
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        const items = Array.isArray(data.data) ? data.data : [];
        const ips = items.map((item) => item.property);

        // Update user with IPs
        const updatedUser = { ...parsedUser, ips };
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Check if user is IP Owner (role_id: 2)
        const isIpOwner = items.some(item => item.role_id === 2);
        localStorage.setItem("is_ip_owner", JSON.stringify(isIpOwner));

        // Store user role name from first property
        const userRole = items[0]?.role?.name || items[0]?.role || "IP Admin";
        localStorage.setItem("user_role_name", userRole);

        // Extract and store permissions
        const permCodes = new Set();
        items.forEach(item => {
          if (Array.isArray(item.permissions)) {
            item.permissions.forEach(code => permCodes.add(code));
          }
        });
        localStorage.setItem("user_permissions", JSON.stringify([...permCodes]));

        // Fetch metric categories tree for each property
        const metricTreePromises = ips.map(async (ip) => {
          const sportId = ip.sport_id || ip.sport?.id;
          if (!sportId) return null;

          try {
            const treeRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT}/get-tree/${sportId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (treeRes.ok) {
              const treeData = await treeRes.json();
              return { propertyId: ip.id, sportId, tree: treeData.data || treeData };
            }
          } catch (err) {
            console.error(`Failed to fetch metric tree for sport ${sportId}:`, err);
          }
          return null;
        });

        const metricTrees = await Promise.all(metricTreePromises);
        const validTrees = metricTrees.filter(Boolean);

        // Store metric trees
        if (validTrees.length > 0) {
          const treesMap = {};
          validTrees.forEach(({ propertyId, sportId, tree }) => {
            treesMap[propertyId] = { sportId, tree };
          });
          localStorage.setItem("metric_trees", JSON.stringify(treesMap));
        }

      } catch (error) {
        console.error("Error initializing auth:", error);
      }

      setLoading(false);
    };

    initializeAuth();
  }, []); // Run only once on mount

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
      "user_role_name",
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
