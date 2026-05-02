"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Wind, Flame, Check, Monitor, Type, LayoutTemplate } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const THEME_CONFIG = [
  { id: "obsidian" as Theme, name: "Obsidian", desc: "Deep dark with violet accents", icon: <Moon className="w-5 h-5" />, preview: { bg: "#0A0A0F", surface: "#111118", accent: "#6C63FF" } },
  { id: "aurora" as Theme, name: "Aurora", desc: "Dark teal with emerald glow", icon: <Wind className="w-5 h-5" />, preview: { bg: "#070D12", surface: "#0D1B24", accent: "#00D4AA" } },
  { id: "ember" as Theme, name: "Ember", desc: "Warm dark with burning orange", icon: <Flame className="w-5 h-5" />, preview: { bg: "#0F0900", surface: "#1A1200", accent: "#FF7A00" } },
  { id: "arctic" as Theme, name: "Arctic", desc: "Clean light with indigo accents", icon: <Sun className="w-5 h-5" />, preview: { bg: "#F8F9FF", surface: "#FFFFFF", accent: "#4F46E5" } },
];

const FONT_SIZES = ["Small", "Default", "Large"];
const DENSITY_OPTIONS = ["Comfortable", "Compact", "Cozy"];

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState("Default");
  const [density, setDensity] = useState("Comfortable");
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <h1 className="font-display font-bold text-xl text-foreground mb-6">Appearance</h1>

      {/* Theme Selection */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Theme</h2>
        <div className="grid grid-cols-2 gap-3">
          {THEME_CONFIG.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={cn("relative flex flex-col gap-3 p-4 rounded-xl border transition-all text-left",
                theme === t.id ? "border-accent bg-accent/5 shadow-accent-glow" : "border-border bg-surface hover:border-accent/40 hover:bg-muted/30")}>
              {/* Preview swatch */}
              <div className="w-full h-16 rounded-lg overflow-hidden flex gap-1 p-1" style={{ backgroundColor: t.preview.bg }}>
                <div className="w-8 flex-shrink-0 rounded" style={{ backgroundColor: t.preview.surface }} />
                <div className="flex-1 rounded flex flex-col gap-1 p-1">
                  {[1, 2, 3].map(i => <div key={i} className="h-1.5 rounded-full" style={{ backgroundColor: i === 1 ? t.preview.accent : t.preview.surface, width: i === 1 ? "60%" : i === 2 ? "80%" : "40%" }} />)}
                </div>
                <div className="w-3 h-3 rounded-full self-start mt-0.5 flex-shrink-0" style={{ backgroundColor: t.preview.accent }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">{t.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </div>
              {theme === t.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Font Size */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Font Size</h2>
        </div>
        <div className="flex gap-2">
          {FONT_SIZES.map(size => (
            <button key={size} onClick={() => setFontSize(size)}
              className={cn("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                fontSize === size ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted-foreground hover:text-foreground hover:border-accent/30")}>
              {size}
            </button>
          ))}
        </div>
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <p className={cn("text-foreground leading-relaxed", fontSize === "Small" ? "text-xs" : fontSize === "Large" ? "text-base" : "text-sm")}>
            Preview: The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </section>

      {/* Density */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Chat Density</h2>
        </div>
        <div className="flex gap-2">
          {DENSITY_OPTIONS.map(d => (
            <button key={d} onClick={() => setDensity(d)}
              className={cn("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                density === d ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted-foreground hover:text-foreground hover:border-accent/30")}>
              {d}
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <motion.button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
            saved ? "bg-green-500/20 text-green-400 border border-green-500/30" : "accent-gradient text-white shadow-accent-glow")}>
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Preferences"}
        </motion.button>
      </div>
    </div>
  );
}
