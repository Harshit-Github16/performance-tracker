"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { initialTheme } from "@/config/theme";
import secureStorage from "@/lib/secureStorage";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    const loadTheme = () => {
      let loadedTheme = { ...initialTheme };

      try {
        const savedTheme = localStorage.getItem('elev8_theme');
        if (savedTheme) {
          const parsed = JSON.parse(savedTheme);
          const { primary_color, secondary_color, ...themeWithoutColors } = parsed;
          loadedTheme = { ...loadedTheme, ...themeWithoutColors };

          if (primary_color || secondary_color) {
            localStorage.setItem('elev8_theme', JSON.stringify(themeWithoutColors));
          }
        }
      } catch (e) {
        console.error("Failed to load custom theme:", e);
        localStorage.removeItem('elev8_theme');
      }

      try {
        const propertyColors = secureStorage.getItem('property_colors');
        if (propertyColors) {
          loadedTheme = { ...loadedTheme, ...propertyColors };
        }
      } catch (e) {
        console.error("Failed to parse property colors:", e);
      }

      setTheme(loadedTheme);
    };

    loadTheme();

    const handleColorsUpdate = (event) => {
      setTheme((prev) => ({ ...prev, ...event.detail }));
    };

    window.addEventListener('property-colors-updated', handleColorsUpdate);

    return () => {
      window.removeEventListener('property-colors-updated', handleColorsUpdate);
    };
  }, []);

  const updateTheme = useCallback((newTheme) => {
    setTheme((prev) => {
      const updated = { ...prev, ...newTheme };
      try {
        const { primary_color, secondary_color, ...themeWithoutColors } = updated;
        localStorage.setItem('elev8_theme', JSON.stringify(themeWithoutColors));
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
