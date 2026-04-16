"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { initialTheme } from "@/config/theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  // Load persisted theme on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('elev8_theme');
      if (savedTheme) {
        setTheme({ ...initialTheme, ...JSON.parse(savedTheme) });
      }
    } catch (e) {
      console.error("Failed to parse theme", e);
    }
  }, []);

  const updateTheme = (newTheme) => {
    setTheme((prev) => {
      const updated = { ...prev, ...newTheme };
      localStorage.setItem('elev8_theme', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-color", theme.primary_color);
    root.style.setProperty("--secondary-color", theme.secondary_color);
    root.style.setProperty("--background-color", theme.backgroundColor);
    root.style.setProperty("--text-color", theme.textColor);
    root.style.setProperty("--tournament-name", `"${theme.tournamentName}"`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
