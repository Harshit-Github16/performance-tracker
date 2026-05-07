"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { initialTheme } from "@/config/theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  // Load persisted theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('elev8_theme');
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme);
        setTheme({ ...initialTheme, ...parsed });
      }
    } catch (e) {
      console.error("Failed to parse theme", e);
      localStorage.removeItem('elev8_theme');
    }
  }, []);

  const updateTheme = useCallback((newTheme) => {
    setTheme((prev) => {
      const updated = { ...prev, ...newTheme };
      try {
        localStorage.setItem('elev8_theme', JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save theme", e);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", theme.primary_color);
    root.style.setProperty("--secondary-color", theme.secondary_color);
    root.style.setProperty("--background-color", theme.backgroundColor);
    root.style.setProperty("--text-color", theme.textColor);
    root.style.setProperty("--tournament-name", `"${theme.tournamentName}"`);
  }, [theme]);

  const contextValue = useMemo(
    () => ({ theme, updateTheme }),
    [theme, updateTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
