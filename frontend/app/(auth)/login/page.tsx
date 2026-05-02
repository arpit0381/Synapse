"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

const FEATURES = [
  "Real-time team messaging",
  "Kanban task management",
  "AI-powered workspace summaries",
  "Built-in video calls & Focus Mode",
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAppStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await signInWithEmail(email, password);
      if (authError) throw new Error(authError.message);
      if (data.user) {
        setAuth(
          {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || email.split("@")[0],
            email: data.user.email!,
            status: "online",
          },
          data.session?.access_token || ""
        );
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message === "Invalid login credentials" ? "Wrong email or password. Try Demo Mode below." : message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) throw new Error(authError.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  function handleDemoMode() {
    setAuth(
      { id: "demo-user", name: "Aryan Sharma", email: "aryan@synapse.app", status: "online", status_message: "Shipping features 🚀" },
      "demo-token"
    );
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--surface)) 100%)" }}>
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }} />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shadow-accent-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Synapse Lite</span>
        </div>

        <div className="relative z-10">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="font-display text-4xl font-bold text-foreground leading-tight mb-4">
            Your team&apos;s<br />
            <span className="text-gradient">digital sanctum.</span>
          </motion.h2>
          <p className="text-muted-foreground mb-8 text-lg">Chat, plan, and ship — all in one place.</p>

          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {f}
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground relative z-10">© 2025 Synapse Lite. Built for startups & students.</p>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-foreground">Synapse Lite</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-7">Sign in to your workspace</p>

          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading} suppressHydrationWarning
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted hover:border-accent/30 transition-all mb-5 disabled:opacity-60">
            {googleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or</span><div className="h-px flex-1 bg-border" />
          </div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
              <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoComplete="email" suppressHydrationWarning
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/50 transition-colors" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <Link href="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input id="login-password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" suppressHydrationWarning
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/50 transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)} suppressHydrationWarning
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} suppressHydrationWarning
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl accent-gradient text-white text-sm font-semibold shadow-accent-glow disabled:opacity-60 transition-opacity">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </motion.button>
          </form>

          {/* Demo Mode */}
          <button onClick={handleDemoMode} suppressHydrationWarning
            className="w-full mt-3 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/30 hover:bg-muted/30 transition-all">
            ⚡ Try Demo Mode (no account needed)
          </button>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:underline font-medium">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
