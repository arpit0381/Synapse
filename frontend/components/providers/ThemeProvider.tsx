"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "obsidian" | "aurora" | "ember" | "arctic";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { id: Theme; name: string; description: string; preview: { bg: string; accent: string } }[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEMES = [
  {
    id: "obsidian" as Theme,
    name: "Obsidian",
    description: "Dark violet — focused & precise",
    preview: { bg: "#0A0A0F", accent: "#6C63FF" },
  },
  {
    id: "aurora" as Theme,
    name: "Aurora",
    description: "Dark teal — calm & refreshing",
    preview: { bg: "#070D12", accent: "#00D4AA" },
  },
  {
    id: "ember" as Theme,
    name: "Ember",
    description: "Dark orange — warm & energized",
    preview: { bg: "#0F0900", accent: "#FF7A00" },
  },
  {
    id: "arctic" as Theme,
    name: "Arctic",
    description: "Light indigo — clean & minimal",
    preview: { bg: "#F8F9FF", accent: "#4F46E5" },
  },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("obsidian");

  useEffect(() => {
    const stored = localStorage.getItem("synapse-theme") as Theme | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      applyTheme(stored);
      setThemeState(stored);
    }
  }, []);

  function applyTheme(newTheme: Theme) {
    const root = document.documentElement;
    // Remove all theme attributes
    root.removeAttribute("data-theme");
    // Set new theme (root CSS vars default to obsidian, so only set attr for others)
    if (newTheme !== "obsidian") {
      root.setAttribute("data-theme", newTheme);
    }
    localStorage.setItem("synapse-theme", newTheme);
  }

  function setTheme(newTheme: Theme) {
    applyTheme(newTheme);
    setThemeState(newTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
