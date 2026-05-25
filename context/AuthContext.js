"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearTokenCache } from "@/lib/apiClient";
import secureStorage from "@/lib/secureStorage";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeIp, setActiveIpState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    try {
      const savedUser = secureStorage.getItem("auth_user");
      if (savedUser) setUser(savedUser);
    } catch (e) {
      console.error("Failed to load user:", e);
    }

    try {
      const savedIp = secureStorage.getItem("active_ip");
      if (savedIp) setActiveIpState(savedIp);
    } catch (e) {
      console.error("Failed to load active IP:", e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initializeAuth = async () => {
      const token = secureStorage.getItem("auth_token");
      const savedUser = secureStorage.getItem("auth_user");

      if (!token || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        const parsedUser = savedUser;

        const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}${process.env.NEXT_PUBLIC_MY_PROPERTIES_ENDPOINT}`;

        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          if (response.status === 401) {
            logout();
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        const items = Array.isArray(data.data) ? data.data : [];
        const ips = items.map((item) => item.property).filter(Boolean);

        const updatedUser = { ...parsedUser, ips };
        secureStorage.setItem("auth_user", updatedUser);
        setUser(updatedUser);

        const isIpOwner = items.some(item => item.role_id === 2);
        secureStorage.setItem("is_ip_owner", isIpOwner);

        const userRole = items[0]?.role?.name || items[0]?.role || "IP Admin";
        secureStorage.setItem("user_role_name", userRole);

        const firstProperty = items[0]?.property;
        const primaryColor = firstProperty?.primary_color || items[0]?.primary_color;
        const secondaryColor = firstProperty?.secondary_color || items[0]?.secondary_color;

        if (primaryColor || secondaryColor) {
          const themeColors = {
            primary_color: primaryColor || "#ea2e2e",
            secondary_color: secondaryColor || "#c6d8e2"
          };

          secureStorage.setItem("property_colors", themeColors);
          window.dispatchEvent(new CustomEvent('property-colors-updated', { detail: themeColors }));
        }

        const permCodes = new Set();
        items.forEach(item => {
          if (Array.isArray(item.permissions)) {
            item.permissions.forEach(code => permCodes.add(code));
          }
        });
        secureStorage.setItem("user_permissions", [...permCodes]);

        const metricTreePromises = ips.map(async (ip) => {
          if (!ip) return null;
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
            console.error(`Metric tree fetch failed for sport ${sportId}:`, err);
          }
          return null;
        });

        const metricTrees = await Promise.all(metricTreePromises);
        const validTrees = metricTrees.filter(Boolean);

        if (validTrees.length > 0) {
          const treesMap = {};
          validTrees.forEach(({ propertyId, sportId, tree }) => {
            treesMap[propertyId] = { sportId, tree };
          });
          secureStorage.setItem("metric_trees", treesMap);
        }
} catch (error) {
        console.error("Auth initialization error:", error);
      }

      setLoading(false);
    };

    initializeAuth();
  }, [mounted]);

  const setActiveIp = useCallback((ip) => {
    setActiveIpState(ip);
    if (ip) {
      secureStorage.setItem("active_ip", ip);
    } else {
      secureStorage.removeItem("active_ip");
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

      secureStorage.setItem("auth_token", token);
      secureStorage.setItem("auth_user", authenticatedUser);
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
      secureStorage.setItem("auth_user", updated);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setActiveIpState(null);
    clearTokenCache();

    const keysToRemove = [
      "auth_user",
      "auth_token",
      "active_ip",
      "entered_as_manager",
      "elev8_theme",
      "user_permissions",
      "is_ip_owner",
      "user_role_name",
      "metric_trees",
      "property_colors"
    ];

    keysToRemove.forEach(key => secureStorage.removeItem(key));
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
