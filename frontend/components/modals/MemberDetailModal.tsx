"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, MessageSquare, Calendar, 
  MapPin, Globe, Mail, Github, Twitter,
  FileText, Activity, Clock
} from "lucide-react";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

interface MemberDetailModalProps {
  member: any;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberDetailModal({ member, isOpen, onClose }: MemberDetailModalProps) {
  if (!member) return null;

  const initials = getInitials(member.full_name || member.name || "User");
  const avatarBg = stringToColor(member.full_name || member.name || "User");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#0A0A0B] border border-white/10 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl"
          >
            {/* Header / Banner */}
            <div className="h-24 md:h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white/80 hover:bg-black/40 transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-4 md:px-8 pb-6 md:pb-8">
              <div className="relative -mt-12 md:mt-16 mb-6 flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
                <div className="relative">
                  <div 
                    className="w-24 h-24 md:w-32 md:h-32 rounded-[24px] md:rounded-[32px] flex items-center justify-center text-3xl md:text-4xl font-bold text-white overflow-hidden border-[4px] md:border-[6px] border-[#0A0A0B] shadow-xl"
                    style={{ backgroundColor: member.avatar_url ? 'transparent' : avatarBg }}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pb-2">
                  <button className="p-3 rounded-2xl bg-white/5 text-white/60 hover:bg-indigo-500 hover:text-white transition-all shadow-lg">
                    <MessageSquare className="w-5 h-5" />
                  </button>

                  <button className="p-3 rounded-2xl bg-white text-black font-bold px-6 hover:scale-105 transition-all shadow-lg">
                    Connect
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-white tracking-tight mb-1">
                  {member.full_name || member.name}
                </h2>
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <span>@{member.username || "unknown"}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-white/40 uppercase text-xs tracking-widest">{member.role || "member"}</span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/60">
                    <Mail className="w-4 h-4 text-white/40" />
                    <span className="text-sm">{member.email || "No email shared"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60">
                    <MapPin className="w-4 h-4 text-white/40" />
                    <span className="text-sm">{member.location || "Earth"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className="text-sm">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/60">
                    <Globe className="w-4 h-4 text-white/40" />
                    <span className="text-sm">Timezone: UTC+5:30</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60 text-indigo-400">
                    <Github className="w-4 h-4" />
                    <span className="text-sm font-bold">github.com/{member.username}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60 text-blue-400">
                    <Twitter className="w-4 h-4" />
                    <span className="text-sm font-bold">twitter.com/{member.username}</span>
                  </div>
                </div>
              </div>

              {/* Tabs / Sections */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-white/20 uppercase tracking-[0.2em] mb-4">About</h4>
                  <p className="text-white/60 leading-relaxed">
                    {member.bio || "Passionate about building great software and collaborating with the team to solve complex problems. Specialized in frontend architecture and high-performance applications."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 mb-3">
                      <Activity className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Pulse Status</span>
                    </div>
                    <div className="text-white/80 font-bold text-sm">Active in #product-design</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 mb-3">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Recent Activity</span>
                    </div>
                    <div className="text-white/80 font-bold text-sm">Updated 4 tasks today</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
