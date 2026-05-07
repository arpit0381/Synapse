"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, Key, Smartphone, LogOut, Check, AlertTriangle, Loader2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePassword } from "@/lib/supabase";
import { toast } from "sonner";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      
      setSaved(true);
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl md:text-4xl tracking-tight flex items-center gap-3 text-foreground">
          <div className="p-2 md:p-2.5 rounded-2xl bg-accent/10">
            <Shield className="w-6 h-6 md:w-8 md:h-8 text-accent" />
          </div>
          Security Settings
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-2 md:mt-3 px-1">Manage your account security and authentication methods</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-7 space-y-6 md:space-y-8">
          {/* Change Password */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="font-bold text-[15px] flex items-center gap-2 border-b border-border/30 pb-4">
              <Key className="w-4 h-4 text-accent" /> Change Password
            </h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground opacity-50" />
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Min. 6 characters"
                    className="w-full bg-background/50 border border-border/40 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block opacity-70">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground opacity-50" />
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Repeat new password"
                    className="w-full bg-background/50 border border-border/40 rounded-xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={saving || !newPassword}
                  className={cn("px-8 py-4 rounded-[18px] text-[13px] font-bold uppercase tracking-widest transition-all btn-press shadow-xl flex items-center gap-2",
                    saved ? "bg-green-500 text-white shadow-green-500/20" : "accent-gradient text-white shadow-accent/20",
                    saving && "opacity-80 cursor-wait")}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saved ? <><Check className="w-4 h-4" /> Password Updated</> : "Update Password"}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Sessions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="font-bold text-[15px] flex items-center gap-2 border-b border-border/30 pb-4">
              <Smartphone className="w-4 h-4 text-accent" /> Active Sessions
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-background/40 border border-border/30 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Current Session</p>
                    <p className="text-[11px] font-medium text-muted-foreground">Windows • Chrome • India</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full">Active</span>
              </div>
              
              <button className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 px-1">
                <LogOut className="w-3.5 h-3.5" /> Log out of all other sessions
              </button>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-5 space-y-6 md:space-y-8">
          {/* Two-Factor Auth */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[15px] flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" /> Two-Factor Auth
              </h3>
              <span className="px-2.5 py-1 bg-muted/30 text-muted-foreground text-[9px] font-black uppercase tracking-widest rounded-lg">Disabled</span>
            </div>
            
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
              Add an extra layer of security to your account. We will ask for a code each time you log in.
            </p>
            
            <button className="w-full py-3 bg-muted/40 border border-border/30 rounded-xl text-xs font-bold uppercase tracking-widest text-foreground hover:bg-muted/60 transition-all">
              Setup 2FA
            </button>
          </motion.div>

          {/* Account Deletion */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-red-500/5 border border-red-500/20 rounded-[24px] p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="font-bold text-[15px] text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </h3>
            
            <p className="text-xs font-medium text-red-500/60 leading-relaxed">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            
            <button className="w-full py-3 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all">
              Delete Account
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
