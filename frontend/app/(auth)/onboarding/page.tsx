"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, Building2, User, Palette, ChevronRight, ChevronLeft, Check, Upload } from "lucide-react";
import { THEMES, useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn, getInitials, stringToColor } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Create your workspace", icon: Building2, description: "Set up your team's hub" },
  { id: 2, title: "Your profile", icon: User, description: "How should teammates see you?" },
  { id: 3, title: "Pick your vibe", icon: Palette, description: "Choose your interface theme" },
];

const AVATAR_PRESETS = [
  { emoji: "🦊", bg: "#FF7A00" }, { emoji: "🐺", bg: "#6C63FF" }, { emoji: "🦋", bg: "#00D4AA" },
  { emoji: "🐉", bg: "#FF6B9D" }, { emoji: "⚡", bg: "#F59E0B" }, { emoji: "🚀", bg: "#4FC3F7" },
  { emoji: "🔥", bg: "#EF4444" }, { emoji: "🌊", bg: "#3B82F6" }, { emoji: "🌙", bg: "#8B5CF6" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { theme, setTheme, themes } = useTheme();

  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<{ emoji: string; bg: string } | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [isLoading, setIsLoading] = useState(false);

  async function handleComplete() {
    setIsLoading(true);
    // In real app: save to Supabase and set up workspace
    await new Promise((r) => setTimeout(r, 1000));
    setTheme(selectedTheme);
    router.push("/dashboard");
  }

  const canProceed = () => {
    if (step === 1) return mode === "create" ? workspaceName.trim().length >= 2 : inviteCode.trim().length >= 4;
    if (step === 2) return displayName.trim().length >= 2;
    return true;
  };

  const progressWidth = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-foreground">Synapse Lite</span>
      </div>

      {/* Step Indicator */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                step > s.id ? "accent-gradient text-white" :
                step === s.id ? "border-2 border-accent text-accent" :
                "border border-border text-muted-foreground"
              )}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 h-0.5 bg-border relative overflow-hidden rounded-full">
                  <motion.div
                    className="absolute left-0 top-0 h-full accent-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: step > s.id ? "100%" : "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="bg-surface border border-border rounded-2xl p-8"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                {(() => { const Icon = STEPS[step - 1].icon; return <Icon className="w-5 h-5 text-accent" />; })()}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{STEPS[step - 1].title}</h2>
                <p className="text-muted-foreground text-sm">{STEPS[step - 1].description}</p>
              </div>
            </div>

            {/* ── Step 1: Workspace ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setMode("create")}
                    className={cn("flex-1 py-2.5 text-sm font-medium transition-colors", mode === "create" ? "accent-gradient text-white" : "text-muted-foreground hover:text-foreground bg-surface")}
                  >
                    Create workspace
                  </button>
                  <button
                    onClick={() => setMode("join")}
                    className={cn("flex-1 py-2.5 text-sm font-medium transition-colors", mode === "join" ? "accent-gradient text-white" : "text-muted-foreground hover:text-foreground bg-surface")}
                  >
                    Join workspace
                  </button>
                </div>

                {mode === "create" ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Workspace name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="Acme Startup"
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                        autoFocus
                      />
                    </div>
                    {workspaceName && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        URL: <span className="text-accent">synapse.app/{workspaceName.toLowerCase().replace(/\s+/g, "-")}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Invite code</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ACME2025"
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm font-mono text-center tracking-widest"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Profile ── */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Avatar picker */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Choose an avatar</label>
                  <div className="grid grid-cols-9 gap-2">
                    {AVATAR_PRESETS.map((av) => (
                      <button
                        key={av.emoji}
                        onClick={() => setSelectedAvatar(av)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                          selectedAvatar?.emoji === av.emoji
                            ? "ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110"
                            : "hover:scale-105 opacity-70 hover:opacity-100"
                        )}
                        style={{ backgroundColor: av.bg + "33" }}
                      >
                        {av.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Display name</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{
                        backgroundColor: selectedAvatar ? selectedAvatar.bg + "33" : "hsl(var(--muted))",
                      }}
                    >
                      {selectedAvatar ? selectedAvatar.emoji : (displayName ? <span className="text-sm font-bold text-foreground">{getInitials(displayName)}</span> : <User className="w-5 h-5 text-muted-foreground" />)}
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Aryan Sharma"
                      className="flex-1 px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Theme ── */}
            {step === 3 && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTheme(t.id);
                        setTheme(t.id);
                      }}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all text-left",
                        selectedTheme === t.id ? "border-accent" : "border-border hover:border-muted-foreground"
                      )}
                      style={{ backgroundColor: t.preview.bg }}
                    >
                      {selectedTheme === t.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: t.preview.accent }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {/* Mini preview */}
                      <div className="mb-3">
                        <div className="w-8 h-8 rounded-lg mb-2" style={{ backgroundColor: t.preview.accent }} />
                        <div className="h-1.5 rounded w-2/3 mb-1" style={{ backgroundColor: t.preview.accent + "80" }} />
                        <div className="h-1.5 rounded w-1/2" style={{ backgroundColor: "#ffffff20" }} />
                      </div>
                      <p className="font-display font-semibold text-sm" style={{ color: t.preview.accent === "#00D4AA" ? t.preview.accent : t.id === "arctic" ? "#0D0D1A" : "#F0F0FF" }}>
                        {t.name}
                      </p>
                      <p className="text-xs mt-0.5 opacity-60" style={{ color: t.id === "arctic" ? "#6B7280" : "#ffffff" }}>
                        {t.description}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  You can change this anytime in Settings → Appearance
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.push("/login")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Back to login" : "Back"}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => step < STEPS.length ? setStep(step + 1) : handleComplete()}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <motion.button
              onClick={() => step < STEPS.length ? setStep(step + 1) : handleComplete()}
              disabled={!canProceed() || isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "accent-gradient text-white font-semibold text-sm",
                "hover:opacity-90 transition-all shadow-accent-glow",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step < STEPS.length ? (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Let&apos;s go! 🚀</>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
