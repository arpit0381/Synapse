"use client";

import React, { useState } from "react";
import { useCallStore } from "@/store/callStore";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MonitorOff, MessageCircle, Users,
  Hand, Disc, Smile, Settings, Volume2, VolumeX,
  ChevronUp, Sparkles, Radio, Eye, Palette, Megaphone,
  BarChart2, HelpCircle, Layers, Zap, ShieldCheck, Terminal,
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

/* ─── Main ControlBar ────────────────────────────────────────────── */
export function ControlBar({ onEndCall }: { onEndCall: () => void }) {
  const store = useCallStore();
  const [showReactions, setShowReactions] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const isVoice = store.callType === "audio";

  const handleReaction = (emoji: string) => {
    // The CallProvider will handle broadcasting this
    const reaction = {
      id: `r_${Date.now()}_${Math.random()}`,
      userId: "local",
      userName: "You",
      emoji,
      timestamp: Date.now(),
    };
    store.addReaction(reaction);
    // Auto-remove after animation
    setTimeout(() => store.removeReaction(reaction.id), 3000);
  };

  return (
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
        <CtrlBtn
          onClick={store.toggleHandRaise}
          label="Request to Speak"
          active={store.isHandRaised}
        >
          <Hand className="w-5 h-5 text-amber-400" />
        </CtrlBtn>
      ) : (
        <CtrlBtn
          onClick={store.toggleMute}
          active={store.isMuted}
          label={store.isMuted ? "Unmute" : "Mute"}
          disabled={store.isStageMode && !store.isHandRaised}
        >
          {store.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </CtrlBtn>
      )}

      {/* Camera (only for video calls) */}
      {!isVoice && (
        <CtrlBtn
          onClick={store.toggleCamera}
          active={!store.isCameraOn}
          label={store.isCameraOn ? "Stop Video" : "Start Video"}
        >
          {store.isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </CtrlBtn>
      )}

      {/* Screen Share */}
      <CtrlBtn
        onClick={() => {
          // Actual screen share logic is in CallProvider
          store.toggleScreenShare();
        }}
        active={store.isScreenSharing}
        label={store.isScreenSharing ? "Stop Share" : "Share Screen"}
      >
        {store.isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </CtrlBtn>

      {/* Deafen */}
      <CtrlBtn
        onClick={store.toggleDeafen}
        active={store.isDeafened}
        label={store.isDeafened ? "Undeafen" : "Deafen"}
      >
        {store.isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </CtrlBtn>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />

      {/* Chat */}
      <CtrlBtn
        onClick={() => store.setActivePanel("chat")}
        label="Chat"
        badge={store.unreadChatCount}
        active={store.activePanel === "chat"}
      >
        <MessageCircle className="w-5 h-5" />
      </CtrlBtn>

      <CtrlBtn
        onClick={() => store.setWhiteboardActive(!store.isWhiteboardActive)}
        label="Whiteboard"
        active={store.isWhiteboardActive}
      >
        <Palette className={`w-5 h-5 ${store.isWhiteboardActive ? "text-accent" : ""}`} />
      </CtrlBtn>

      {/* Polls */}
      <CtrlBtn
        onClick={() => store.setActivePanel(store.activePanel === "polls" ? null : "polls")}
        label="Polls"
        active={store.activePanel === "polls"}
      >
        <BarChart2 className="w-5 h-5" />
      </CtrlBtn>

      {/* Code Editor */}
      <CtrlBtn
        onClick={() => store.setActivePanel(store.activePanel === "code" ? null : "code")}
        label="Editor"
        active={store.activePanel === "code"}
      >
        <Terminal className="w-5 h-5" />
      </CtrlBtn>

      {/* Q&A */}
      <CtrlBtn
        onClick={() => store.setActivePanel(store.activePanel === "qa" ? null : "qa")}
        label="Q&A"
        active={store.activePanel === "qa"}
      >
        <HelpCircle className="w-5 h-5" />
      </CtrlBtn>

      {/* Breakout */}
      <CtrlBtn
        onClick={() => store.setActivePanel(store.activePanel === "breakout" ? null : "breakout")}
        label="Rooms"
        active={store.activePanel === "breakout"}
      >
        <Layers className="w-5 h-5" />
      </CtrlBtn>

      {/* Participants */}
      <CtrlBtn
        onClick={() => store.setActivePanel("participants")}
        label="People"
        active={store.activePanel === "participants"}
      >
        <Users className="w-5 h-5" />
      </CtrlBtn>

      {/* Reactions */}
      <div className="relative">
        <CtrlBtn onClick={() => setShowReactions(!showReactions)} label="React">
          <Smile className="w-5 h-5" />
        </CtrlBtn>
        <AnimatePresence>
          {showReactions && (
            <ReactionPicker
              onPick={handleReaction}
              onClose={() => setShowReactions(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Raise Hand */}
      <CtrlBtn
        onClick={store.toggleHandRaise}
        active={store.isHandRaised}
        label={store.isHandRaised ? "Lower Hand" : "Raise Hand"}
      >
        <Hand className={`w-5 h-5 ${store.isHandRaised ? "text-amber-400" : ""}`} />
      </CtrlBtn>

      {/* Recording */}
      <CtrlBtn
        onClick={() => store.setRecording(!store.isRecording)}
        active={store.isRecording}
        label={store.isRecording ? "Stop Rec" : "Record"}
      >
        <Disc className={`w-5 h-5 ${store.isRecording ? "text-red-400" : ""}`} />
      </CtrlBtn>

      {/* More */}
      <div className="relative">
        <CtrlBtn onClick={() => setShowMore(!showMore)} label="More">
          <ChevronUp className="w-5 h-5" />
        </CtrlBtn>
        <AnimatePresence>
          {showMore && <MoreMenu onClose={() => setShowMore(false)} />}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />

      {/* End Call */}
      <CtrlBtn onClick={onEndCall} danger label="Leave" large>
        <PhoneOff className="w-6 h-6" />
      </CtrlBtn>
    </div>
  );
}
