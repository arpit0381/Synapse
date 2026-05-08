"use client";

import { motion } from "framer-motion";
import { MessageSquare, Phone, MoreVertical, Shield, Clock, MapPin } from "lucide-react";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import Link from "next/link";

interface MemberCardProps {
  member: any;
  onClick?: () => void;
}

const STATUS_COLORS = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  dnd: "bg-rose-500",
  offline: "bg-slate-500/30",
};

const ROLE_STYLES = {
  owner: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  member: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  guest: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export function MemberCard({ member, onClick }: MemberCardProps) {
  const { presenceMap, onlineUserIds } = useAppStore();
  
  const status = (presenceMap[member.id]?.status as keyof typeof STATUS_COLORS) || 
                 (onlineUserIds.includes(member.id) ? "online" : "offline");

  const initials = getInitials(member.full_name || member.name || "User");
  const avatarBg = stringToColor(member.full_name || member.name || "User");

  // Format local time (placeholder if not in profile)
  const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative bg-[#121214] border border-white/5 rounded-[20px] md:rounded-[24px] p-4 md:p-5 overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-black/40"
    >
      {/* Background Gradient Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        status === "online" ? "bg-emerald-500" : "bg-indigo-500"
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          {/* Avatar Section */}
          <div className="relative">
            <div 
              className="w-16 h-16 rounded-[20px] flex items-center justify-center text-xl font-bold text-white overflow-hidden shadow-lg border border-white/5"
              style={{ backgroundColor: member.avatar_url ? 'transparent' : avatarBg }}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {/* Status Ring */}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-[#121214] shadow-sm",
              STATUS_COLORS[status]
            )}>
              {status === "online" && (
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
              )}
            </div>
          </div>

          {/* Role & Time */}
          <div className="flex flex-col items-end gap-2">
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
              ROLE_STYLES[member.role as keyof typeof ROLE_STYLES] || ROLE_STYLES.member
            )}>
              {member.role || "member"}
            </span>
            <div className="flex items-center gap-1.5 text-white/30">
              <Clock className="w-3 h-3" />
              <span className="text-[11px] font-medium">{localTime}</span>
            </div>
          </div>
        </div>

        {/* Member Info */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
            {member.full_name || member.name}
          </h3>
          <p className="text-sm text-white/40 font-medium truncate">
            @{member.username || "unknown"}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] text-[11px] text-white/50 font-medium border border-white/5">
            <MapPin className="w-3 h-3" />
            {member.location || "Remote"}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] text-[11px] text-white/50 font-medium border border-white/5">
            <Shield className="w-3 h-3" />
            {member.department || "Product Team"}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link href={`/dm/${member.id}`} className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-white/5 text-white/80 hover:bg-indigo-500 hover:text-white transition-all duration-300 group/btn">
            <MessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
            <span className="text-xs font-bold">Message</span>
          </Link>
          <button 
            onClick={onClick}
            className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
