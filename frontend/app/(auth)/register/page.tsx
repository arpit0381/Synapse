"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, Loader2, AlertCircle, Check } from "lucide-react";
import { signUpWithEmail } from "@/lib/supabase";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

function getPasswordStrength(p: string): { score: number; label: string; color: string } {
  if (p.length === 0) return { score: 0, label: "", color: "" };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const levels = [
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-orange-500" },
    { label: "Good", color: "bg-yellow-500" },
    { label: "Strong", color: "bg-green-500" },
  ];
  return { score, ...levels[Math.max(0, score - 1)] };
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAppStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const { data, error: authError } = await signUpWithEmail(email, password, name);
      if (authError) throw new Error(authError.message);
      if (data.user) {
        // If email confirmation is enabled, Supabase won't return a session yet
        if (data.session) {
          setAuth({ id: data.user.id, name, email, status: "online" }, data.session.access_token);
          router.push("/onboarding");
        } else {
          setDone(true); // show "check your email" screen
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="font-display font-bold text-2xl text-foreground mb-2">Check your email!</h2>
          <p className="text-sm text-muted-foreground mb-6">We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account.</p>
          <Link href="/login" className="text-accent hover:underline text-sm font-medium">Back to Sign In</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shadow-accent-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">Synapse Lite</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground mb-7">Join your team workspace in seconds.</p>

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Full Name</label>
            <input id="register-name" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Aryan Sharma" autoComplete="name"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/50 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Work Email</label>
            <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" autoComplete="email"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/50 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input id="register-password" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" autoComplete="new-password"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/50 transition-colors" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={cn("flex-1 h-1.5 rounded-full transition-all", i <= strength.score ? strength.color : "bg-muted")} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{strength.label}</p>
              </div>
            )}
          </div>

          <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl accent-gradient text-white text-sm font-semibold shadow-accent-glow disabled:opacity-60 mt-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
          </motion.button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-3">
          By creating an account you agree to our{" "}
          <span className="text-accent cursor-pointer hover:underline">Terms</span> &amp;{" "}
          <span className="text-accent cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
