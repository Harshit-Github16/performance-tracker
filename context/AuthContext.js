"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeIp, setActiveIpState] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("auth_user");
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedIp = localStorage.getItem("active_ip");
    if (savedIp) setActiveIpState(JSON.parse(savedIp));
    setLoading(false);
  }, []);

  const setActiveIp = (ip) => {
    setActiveIpState(ip);
    if (ip) localStorage.setItem("active_ip", JSON.stringify(ip));
    else localStorage.removeItem("active_ip");
  };

  const login = async (email, password) => {
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
  };

  const updateUserIps = (ips) => {
    setUser((prev) => {
      const updated = { ...prev, ips };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    setActiveIpState(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("active_ip");
    localStorage.removeItem("entered_as_manager");
    localStorage.removeItem("elev8_theme");
    localStorage.removeItem("user_permissions");
    localStorage.removeItem("is_ip_owner");
    localStorage.removeItem("metric_trees");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, activeIp, setActiveIp, login, logout, loading, updateUserIps }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
