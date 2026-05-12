"use client";

import React, { useState } from "react";
import { useCallStore } from "@/store/callStore";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, MessageCircle, Users,
  Hand, Disc, Smile, Settings, Volume2, VolumeX,
  ChevronUp, Sparkles, Radio, Eye, Palette, Megaphone,
  BarChart2, HelpCircle, Layers, Zap, ShieldCheck, Terminal,
  LayoutGrid, Grid3X3, MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Control Button ─────────────────────────────────────────────── */
function CtrlBtn({
  onClick,
  active = false,
  danger = false,
  badge,
  label,
  large = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  label: string;
  large?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className="relative flex flex-col items-center gap-1 focus:outline-none group disabled:opacity-40"
    >
      <div
        className={`
          flex items-center justify-center rounded-full transition-all duration-200
          ${large ? "w-14 h-14" : "w-11 h-11"}
          ${danger
            ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20"
            : active
              ? "bg-white/15 text-red-400 hover:bg-white/20"
              : "bg-white/[0.06] hover:bg-white/10 text-[#dbdee1]"
          }
          group-active:scale-90
        `}
      >
        {children}
      </div>
      <span className="text-[10px] font-medium text-[#949ba4] hidden sm:block">{label}</span>
      {badge && badge > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

/* ─── Reaction Picker ────────────────────────────────────────────── */
const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "🔥", "😮", "🚀"];

function ReactionPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 flex gap-1 px-2 py-1.5 rounded-xl shadow-2xl"
        style={{
          background: "#1e1f22",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onPick(emoji);
              onClose();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-white/10 transition-all hover:scale-125 active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </motion.div>
    </>
  );
}

/* ─── More Menu ──────────────────────────────────────────────────── */
function MoreMenu({
  onClose,
}: {
  onClose: () => void;
}) {
  const store = useCallStore();

  const items = [
    {
      icon: Sparkles,
      label: store.noiseSuppressionEnabled ? "Noise Suppression: On" : "Noise Suppression: Off",
      onClick: () => store.setNoiseSuppression(!store.noiseSuppressionEnabled),
      active: store.noiseSuppressionEnabled,
    },
    {
      icon: Radio,
      label: store.pushToTalkEnabled ? "Push to Talk: On" : "Push to Talk: Off",
      onClick: () => store.setPushToTalk(!store.pushToTalkEnabled),
      active: store.pushToTalkEnabled,
    },
    {
      icon: Eye,
      label: store.backgroundBlurEnabled ? "Background Blur: On" : "Background Blur: Off",
      onClick: () => store.setBackgroundBlur(!store.backgroundBlurEnabled),
      active: store.backgroundBlurEnabled,
    },
    {
      icon: Settings,
      label: "Device Settings",
      onClick: () => { store.setActivePanel("settings"); onClose(); },
      active: false,
    },
    {
      icon: Megaphone,
      label: store.isStageMode ? "Disable Stage Mode" : "Enable Stage Mode",
      onClick: () => { store.setStageMode(!store.isStageMode); onClose(); },
      active: store.isStageMode,
    },
    {
      icon: Zap,
      label: store.lowDataMode ? "Low Data Mode: On" : "Low Data Mode: Off",
      onClick: () => { store.setLowDataMode(!store.lowDataMode); onClose(); },
      active: store.lowDataMode,
    },
    {
      icon: ShieldCheck,
      label: "E2EE: Active",
      onClick: () => { onClose(); },
      active: true,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        className="absolute bottom-full mb-2 right-0 z-40 rounded-xl shadow-2xl overflow-hidden py-1"
        style={{
          background: "#1e1f22",
          border: "1px solid rgba(255,255,255,0.08)",
          minWidth: 200,
        }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium transition-colors text-[#b5bac1] hover:text-white hover:bg-white/5"
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.active && (
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </motion.div>
    </>
  );
}

/* ─── Utilities Drawer (Mobile) ─────────────────────────────────── */
function UtilitiesDrawer({
  onClose,
  onEndCall,
}: {
  onClose: () => void;
  onEndCall: () => void;
}) {
  const store = useCallStore();

  const utilityGroups = [
    {
      title: "Interaction",
      items: [
        { icon: MessageCircle, label: "Chat", badge: store.unreadChatCount, onClick: () => store.setActivePanel("chat"), active: store.activePanel === "chat" },
        { icon: Users, label: "People", onClick: () => store.setActivePanel("participants"), active: store.activePanel === "participants" },
        { icon: Hand, label: store.isHandRaised ? "Lower Hand" : "Raise Hand", onClick: store.toggleHandRaise, active: store.isHandRaised, color: "text-amber-400" },
        { icon: Smile, label: "Reactions", onClick: () => { /* we'll handle this in the bar maybe */ }, active: false },
      ]
    },
    {
      title: "Tools",
      items: [
        { icon: Palette, label: "Whiteboard", onClick: () => store.setWhiteboardActive(!store.isWhiteboardActive), active: store.isWhiteboardActive },
        { icon: BarChart2, label: "Polls", onClick: () => store.setActivePanel("polls"), active: store.activePanel === "polls" },
        { icon: Terminal, label: "Editor", onClick: () => store.setActivePanel("code"), active: store.activePanel === "code" },
        { icon: HelpCircle, label: "Q&A", onClick: () => store.setActivePanel("qa"), active: store.activePanel === "qa" },
      ]
    },
    {
      title: "Audio & Video",
      items: [
        { icon: store.isDeafened ? VolumeX : Volume2, label: store.isDeafened ? "Undeafen" : "Deafen", onClick: store.toggleDeafen, active: store.isDeafened },
        { icon: Monitor, label: "Share Screen", onClick: store.toggleScreenShare, active: store.isScreenSharing },
        { icon: Disc, label: "Record", onClick: () => store.setRecording(!store.isRecording), active: store.isRecording, color: "text-red-400" },
        { icon: Settings, label: "Settings", onClick: () => store.setActivePanel("settings"), active: false },
      ]
    }
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] sm:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 bg-[#1e1f22] rounded-t-[32px] z-[101] sm:hidden overflow-hidden flex flex-col max-h-[85vh] border-t border-white/10"
      >
        {/* Handle */}
        <div className="w-full flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-12 pt-4 space-y-8">
          {utilityGroups.map(group => (
            <div key={group.title} className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#949ba4] px-1">{group.title}</h4>
              <div className="grid grid-cols-4 gap-4">
                {group.items.map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.onClick(); if (item.label !== "Reactions") onClose(); }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200
                      ${item.active ? "bg-accent/20 text-accent" : "bg-white/[0.04] text-[#dbdee1] active:scale-95"}
                      ${item.color || ""}
                    `}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-[#949ba4] text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* End Call for Mobile Utility Menu */}
          <button
            onClick={onEndCall}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-red-500/20 active:scale-[0.98] transition-all"
          >
            <PhoneOff className="w-5 h-5" /> Leave Call
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ─── Main ControlBar ────────────────────────────────────────────── */
export function ControlBar({ onEndCall }: { onEndCall: () => void }) {
  const store = useCallStore();
  const [showUtilities, setShowUtilities] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const isVoice = store.callType === "audio";

  const handleReaction = (emoji: string) => {
    const reaction = {
      id: `r_${Date.now()}_${Math.random()}`,
      userId: "local",
      userName: "You",
      emoji,
      timestamp: Date.now(),
    };
    store.addReaction(reaction);
    setTimeout(() => store.removeReaction(reaction.id), 3000);
  };

  return (
    <>
      <div
        className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-4 flex-shrink-0"
        style={{
          background: "rgba(17, 18, 20, 0.9)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Mic / Request to Speak */}
        {store.isStageMode && !store.isHandRaised ? (
          <CtrlBtn onClick={store.toggleHandRaise} label="Speak" active={store.isHandRaised}>
            <Hand className="w-5 h-5 text-amber-400" />
          </CtrlBtn>
        ) : (
          <CtrlBtn onClick={store.toggleMute} active={store.isMuted} label={store.isMuted ? "Unmute" : "Mute"} disabled={store.isStageMode && !store.isHandRaised}>
            {store.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </CtrlBtn>
        )}

        {/* Camera */}
        <CtrlBtn onClick={store.toggleCamera} active={!store.isCameraOn} label={store.isCameraOn ? "Video Off" : "Video On"}>
          {store.isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </CtrlBtn>

        {/* Desktop Only Buttons */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          <CtrlBtn onClick={store.toggleScreenShare} active={store.isScreenSharing} label="Share">
            {store.isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </CtrlBtn>

          <CtrlBtn onClick={store.toggleDeafen} active={store.isDeafened} label="Deafen">
            {store.isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </CtrlBtn>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <CtrlBtn onClick={() => store.setActivePanel("chat")} label="Chat" badge={store.unreadChatCount} active={store.activePanel === "chat"}>
            <MessageCircle className="w-5 h-5" />
          </CtrlBtn>

          <CtrlBtn onClick={() => store.setWhiteboardActive(!store.isWhiteboardActive)} label="Whiteboard" active={store.isWhiteboardActive}>
            <Palette className={`w-5 h-5 ${store.isWhiteboardActive ? "text-accent" : ""}`} />
          </CtrlBtn>

          <CtrlBtn onClick={() => store.setActivePanel("polls")} label="Polls" active={store.activePanel === "polls"}>
            <BarChart2 className="w-5 h-5" />
          </CtrlBtn>

          <CtrlBtn onClick={() => store.setActivePanel("code")} label="Editor" active={store.activePanel === "code"}>
            <Terminal className="w-5 h-5" />
          </CtrlBtn>

          <CtrlBtn onClick={() => store.setActivePanel("qa")} label="Q&A" active={store.activePanel === "qa"}>
            <HelpCircle className="w-5 h-5" />
          </CtrlBtn>

          <div className="relative">
            <CtrlBtn onClick={() => setShowReactions(!showReactions)} label="React">
              <Smile className="w-5 h-5" />
            </CtrlBtn>
            <AnimatePresence>{showReactions && <ReactionPicker onPick={handleReaction} onClose={() => setShowReactions(false)} />}</AnimatePresence>
          </div>

          <CtrlBtn onClick={store.toggleHandRaise} active={store.isHandRaised} label="Raise Hand">
            <Hand className={`w-5 h-5 ${store.isHandRaised ? "text-amber-400" : ""}`} />
          </CtrlBtn>

          <div className="relative">
            <CtrlBtn onClick={() => setShowMore(!showMore)} label="More">
              <ChevronUp className="w-5 h-5" />
            </CtrlBtn>
            <AnimatePresence>{showMore && <MoreMenu onClose={() => setShowMore(false)} />}</AnimatePresence>
          </div>

          <div className="w-px h-8 bg-white/10 mx-1" />
        </div>

        {/* Mobile Utilities Button */}
        <div className="sm:hidden">
          <CtrlBtn onClick={() => setShowUtilities(true)} label="More">
            <Grid3X3 className="w-5 h-5" />
          </CtrlBtn>
        </div>

        {/* End Call - Large on all screens */}
        <CtrlBtn onClick={onEndCall} danger label="Leave" large>
          <PhoneOff className="w-6 h-6" />
        </CtrlBtn>
      </div>

      {/* Mobile Utilities Drawer */}
      <AnimatePresence>
        {showUtilities && (
          <UtilitiesDrawer
            onClose={() => setShowUtilities(false)}
            onEndCall={onEndCall}
          />
        )}
      </AnimatePresence>
    </>
  );
}
