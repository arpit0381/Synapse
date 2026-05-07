"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Wind, Flame, Check, Monitor, Type, LayoutTemplate, Palette, Loader2 } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  const { user, updateUser } = useAppStore();
  const [fontSize, setFontSize] = useState("Default");
  const [density, setDensity] = useState("Comfortable");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize from user data
  useEffect(() => {
    if (user?.appearance_settings) {
      setFontSize(user.appearance_settings.font_size || "Default");
      setDensity(user.appearance_settings.density || "Comfortable");
    }
  }, [user]);

  async function handleApply() {
    if (!user) return;
    setSaving(true);

    const appearance_settings = {
      font_size: fontSize,
      density: density,
    };

    try {
      const { profile } = await api.profiles.update(user.id, { appearance_settings });
      updateUser({ appearance_settings: profile.appearance_settings });
      setSaved(true);
      toast.success("Appearance preferences updated");
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl md:text-4xl tracking-tight flex items-center gap-3 text-foreground">
          <div className="p-2 md:p-2.5 rounded-2xl bg-accent/10">
            <Palette className="w-6 h-6 md:w-8 md:h-8 text-accent" />
          </div>
          Appearance
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-2 md:mt-3 px-1">Customize your visual experience and interface themes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Themes */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <section>
            <h3 className="font-bold text-[15px] mb-4 flex items-center gap-2 px-1">
              <Monitor className="w-4 h-4 text-accent" /> Interface Themes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THEME_CONFIG.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={cn("relative flex flex-col gap-4 p-5 rounded-[24px] border transition-all text-left group overflow-hidden",
                    theme === t.id ? "border-accent bg-accent/5 shadow-lg shadow-accent/10" : "border-border/60 bg-surface/50 hover:border-accent/40 hover:bg-muted/30")}>
                  {/* Preview swatch */}
                  <div className="w-full h-24 rounded-2xl overflow-hidden flex gap-2 p-2 shadow-inner group-hover:scale-[1.02] transition-transform" style={{ backgroundColor: t.preview.bg }}>
                    <div className="w-12 flex-shrink-0 rounded-xl" style={{ backgroundColor: t.preview.surface }} />
                    <div className="flex-1 rounded-xl flex flex-col gap-2 p-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-2 rounded-full" style={{ backgroundColor: i === 1 ? t.preview.accent : t.preview.surface, width: i === 1 ? "60%" : i === 2 ? "80%" : "40%", opacity: 0.6 }} />)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      {t.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-[11px] font-medium text-muted-foreground opacity-60">{t.desc}</p>
                    </div>
                  </div>
                  {theme === t.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/20">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Preferences */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-8 shadow-sm">
            {/* Font Size */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Type className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-[15px]">Typography</h3>
              </div>
              <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
                {FONT_SIZES.map(size => (
                  <button key={size} onClick={() => setFontSize(size)}
                    className={cn("flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                      fontSize === size ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground")}>
                    {size}
                  </button>
                ))}
              </div>
              <div className="mt-4 p-4 bg-background/50 border border-border/30 rounded-2xl">
                <p className={cn("text-foreground font-medium transition-all", fontSize === "Small" ? "text-xs" : fontSize === "Large" ? "text-lg" : "text-sm")}>
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </section>

            {/* Density */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <LayoutTemplate className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-[15px]">Interface Density</h3>
              </div>
              <div className="flex flex-col gap-2">
                {DENSITY_OPTIONS.map(d => (
                  <button key={d} onClick={() => setDensity(d)}
                    className={cn("flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all",
                      density === d ? "border-accent bg-accent/5 text-accent" : "border-border/40 bg-background/50 text-muted-foreground hover:text-foreground hover:border-accent/30")}>
                    {d}
                    {density === d && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </section>

            <div className="pt-4 border-t border-border/30">
              <button 
                disabled={saving}
                onClick={handleApply}
                className={cn("w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all btn-press",
                  saved ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "accent-gradient text-white shadow-xl shadow-accent/20",
                  saving && "opacity-80 cursor-wait")}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saved ? <><Check className="w-4 h-4" /> Preferences Saved</> : "Apply Changes"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
