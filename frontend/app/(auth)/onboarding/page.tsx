"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, Building2, User, Palette, ChevronRight, ChevronLeft, Check, Upload, AlertCircle } from "lucide-react";
import { THEMES, useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";

const STEPS = [
  { id: 1, title: "Create your workspace", icon: Building2, description: "Set up your team's hub" },
  { id: 2, title: "Your profile", icon: User, description: "How should teammates see you?" },
  { id: 3, title: "Pick your vibe", icon: Palette, description: "Choose your interface theme" },
  { id: 4, title: "Ready to go", icon: Zap, description: "Select a workspace to enter" },
];

const AVATAR_PRESETS = [
  { emoji: "🦊", bg: "#FF7A00" }, { emoji: "🐺", bg: "#6C63FF" }, { emoji: "🦋", bg: "#00D4AA" },
  { emoji: "🐉", bg: "#FF6B9D" }, { emoji: "⚡", bg: "#F59E0B" }, { emoji: "🚀", bg: "#4FC3F7" },
  { emoji: "🔥", bg: "#EF4444" }, { emoji: "🌊", bg: "#3B82F6" }, { emoji: "🌙", bg: "#8B5CF6" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { theme, setTheme, themes } = useTheme();
  const { user, workspaces, setWorkspaces, setCurrentWorkspace, updateUser } = useAppStore();

  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<{ emoji: string; bg: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSetup() {
    if (!user) {
      router.push("/login");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      // 1. Create or Join workspace
      if (mode === "create") {
        await api.workspaces.create({ name: workspaceName, owner_id: user.id });
      } else {
        await api.workspaces.join({ invite_code: inviteCode, user_id: user.id });
      }

      // 2. Refresh workspaces list
      const wsRes = await api.workspaces.list(user.id);
      setWorkspaces(wsRes.workspaces);

      // 3. Upload avatar or generate SVG
      let avatarUrl = "";
      if (selectedFile) {
        const sigRes = await api.profiles.getCloudinarySignature(user.id);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("api_key", sigRes.apiKey);
        formData.append("timestamp", sigRes.timestamp);
        formData.append("signature", sigRes.signature);
        formData.append("folder", sigRes.folder);
        
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dup3wsdib";
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Failed to upload image");
        
        avatarUrl = uploadData.secure_url;
      } else if (selectedAvatar) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="${selectedAvatar.bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="50">${selectedAvatar.emoji}</text></svg>`;
        avatarUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      }

      // 4. Update profile if needed
      if (displayName || avatarUrl) {
        const updatePayload: any = {};
        if (displayName) updatePayload.full_name = displayName;
        if (avatarUrl) updatePayload.avatar_url = avatarUrl;
        
        await api.profiles.update(user.id, updatePayload);
        updateUser({ name: displayName, avatar_url: avatarUrl });
      }

      setTheme(selectedTheme);
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to setup workspace");
    } finally {
      setIsLoading(false);
    }
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

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

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
                {/* Avatar picker / Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Choose an avatar or upload one</label>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative group">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border-2 border-dashed border-border group-hover:border-accent/50 transition-colors overflow-hidden relative cursor-pointer"
                        style={{
                          backgroundColor: previewUrl ? "transparent" : (selectedAvatar ? selectedAvatar.bg + "33" : "hsl(var(--muted))"),
                        }}
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                      >
                        {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : selectedAvatar ? (
                          selectedAvatar.emoji
                        ) : (
                          <Upload className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const isImage = file.type.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            if (!isImage) {
                              toast.error("Please select a valid image file");
                              e.target.value = "";
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error("Image is too large. Please select an image under 10MB.");
                              e.target.value = "";
                              return;
                            }
                            setSelectedFile(file);
                            setPreviewUrl(URL.createObjectURL(file));
                            setSelectedAvatar(null);
                          }
                        }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">Or pick a preset:</p>
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_PRESETS.map((av) => (
                          <button
                            key={av.emoji}
                            onClick={() => { setSelectedAvatar(av); setSelectedFile(null); setPreviewUrl(null); }}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all",
                              selectedAvatar?.emoji === av.emoji && !previewUrl
                                ? "ring-2 ring-accent ring-offset-1 ring-offset-surface scale-110"
                                : "hover:scale-105 opacity-70 hover:opacity-100"
                            )}
                            style={{ backgroundColor: av.bg + "33" }}
                          >
                            {av.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Display name</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                      style={{
                        backgroundColor: previewUrl ? "transparent" : (selectedAvatar ? selectedAvatar.bg + "33" : "hsl(var(--muted))"),
                      }}
                    >
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : selectedAvatar ? (
                        selectedAvatar.emoji 
                      ) : (
                        displayName ? <span className="text-sm font-bold text-foreground">{getInitials(displayName)}</span> : <User className="w-5 h-5 text-muted-foreground" />
                      )}
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
            {/* ── Step 4: Workspace List ── */}
            {step === 4 && (
              <div className="space-y-3">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspace(ws);
                      router.push("/dashboard");
                    }}
                    className="group w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-200 hover:bg-muted/60 border border-transparent hover:border-border/50"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-sm bg-muted text-muted-foreground group-hover:bg-accent/20 group-hover:text-accent">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] truncate font-display tracking-tight text-foreground font-semibold">
                        {ws.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click to enter workspace
                      </p>
                    </div>
                  </button>
                ))}
                {workspaces.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No workspaces found.</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => step > 1 && step < 4 ? setStep(step - 1) : router.push("/login")}
            className={cn(
              "flex items-center gap-1.5 text-sm transition-colors",
              step === 4 ? "invisible" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Back to login" : "Back"}
          </button>

          {step < 4 && (
            <div className="flex items-center gap-3">
              {step < 3 && (
                <button
                  onClick={() => setStep(step + 1)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              )}
              <motion.button
                onClick={() => step < 3 ? setStep(step + 1) : handleSetup()}
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
                ) : step < 3 ? (
                  <>Continue <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Complete Setup <ChevronRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
