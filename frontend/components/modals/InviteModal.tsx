"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Link as LinkIcon, Users, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { cn, stringToColor } from "@/lib/utils";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { currentWorkspace } = useAppStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !currentWorkspace) return null;

  // The link that users will click to join directly
  const inviteLink = typeof window !== "undefined" 
    ? `${window.location.origin}/invite/${currentWorkspace.invite_code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          {/* Header Decoration */}
          <div className="h-28 bg-gradient-to-br from-[#4B39EF] via-[#3B28CC] to-[#6E5CF3] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border-4 border-surface"
            >
              <Users className="w-8 h-8 text-[#4B39EF]" />
            </motion.div>
            <div className="absolute top-4 right-14 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/30">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Unlimited Invites</span>
            </div>
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-10 pb-8 px-6 text-left">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Invite people to <span className="text-[#4B39EF]">{currentWorkspace.name}</span>
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mt-1">
                Share this link with your team members to give them instant access. No code entry required!
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Workspace Invite Link</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-[#4B39EF] transition-colors">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    readOnly
                    value={inviteLink}
                    className="w-full pl-10 pr-24 py-3.5 bg-background border border-border/60 focus:border-[#4B39EF] rounded-xl font-mono text-[13px] outline-none transition-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#4B39EF] hover:bg-[#3B28CC] text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">Copied</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">Copy</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3">
                <div className="mt-0.5">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-[12px] leading-relaxed text-muted-foreground">
                  Anyone with this link can join as a member. You can deactivate this link anytime in workspace settings.
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl font-bold text-[14px] bg-background border border-border hover:bg-muted transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
