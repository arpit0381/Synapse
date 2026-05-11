"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { X, Mic, MicOff, Video, VideoOff, Hand, Crown, Shield, Search } from "lucide-react";
import { motion } from "framer-motion";
import { InviteLink } from "./InviteLink";

function strHsl(s: string = "") {
  if (!s) return "hsl(0, 0%, 20%)"; // Fallback color
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 50%, 38%)`;
}

const ROLE_ICONS: Record<string, typeof Crown> = { admin: Crown, moderator: Shield };

export function ParticipantsPanel() {
  const store = useCallStore();
  const { user } = useAppStore();
  const [search, setSearch] = React.useState("");

  const allParticipants = [
    { id: user?.id || "", name: user?.name || "You", isLocal: true, isMuted: store.isMuted, isCameraOn: store.isCameraOn, isSpeaking: store.speakingUserIds.has(user?.id || ""), isHandRaised: store.isHandRaised, role: undefined as string | undefined },
    ...Object.values(store.participants).map((p) => ({ ...p, isLocal: false })),
  ];

  const filtered = search ? allParticipants.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : allParticipants;

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col h-full flex-shrink-0 call-panel-width"
      style={{ background: "rgba(17,18,20,0.95)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">Participants ({allParticipants.length})</h3>
        <button onClick={() => store.setActivePanel(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#949ba4] hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Search className="w-3.5 h-3.5 text-[#949ba4]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent text-xs text-white placeholder:text-[#949ba4]/50 outline-none" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 hide-scrollbar">
        {filtered.map((p) => {
          const RoleIcon = p.role ? ROLE_ICONS[p.role] : null;
          return (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.isSpeaking ? "ring-2 ring-green-400 ring-offset-1 ring-offset-[#111214]" : ""}`} style={{ background: strHsl(p.name) }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                {p.isHandRaised && <span className="absolute -top-0.5 -right-0.5 text-[10px]">✋</span>}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium truncate">{p.name}{p.isLocal ? " (You)" : ""}</span>
                  {RoleIcon && <RoleIcon className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                </div>
                {p.isSpeaking && <p className="text-green-400 text-[10px]">Speaking</p>}
              </div>
              {/* Status icons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {p.isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-[#949ba4]" />}
                {!p.isCameraOn && <VideoOff className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Section */}
      <div className="p-4 border-t border-white/5">
        <InviteLink />
      </div>
    </motion.div>
  );
}
