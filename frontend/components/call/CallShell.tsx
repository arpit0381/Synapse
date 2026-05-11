"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { CallHeader } from "./CallHeader";
import { ControlBar } from "./ControlBar";
import { VideoGrid } from "./VideoGrid";
import { SpeakerView } from "./SpeakerView";
import { SidebarLayout } from "./SidebarLayout";
import { CallChatPanel } from "./CallChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { DeviceSettingsPanel } from "./DeviceSettingsPanel";
import { PollsPanel } from "./PollsPanel";
import { QAPanel } from "./QAPanel";
import { BreakoutPanel } from "./BreakoutPanel";
import { CodeEditor } from "./CodeEditor";
import { Whiteboard } from "./Whiteboard";
import { ReactionOverlay } from "./ReactionOverlay";
import { LiveCaptions } from "./LiveCaptions";
import { useRecordingManager } from "./RecordingManager";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";

const LAYOUT_MAP = {
  grid: VideoGrid,
  speaker: SpeakerView,
  sidebar: SidebarLayout,
  fullscreen: VideoGrid,
};

const PANEL_MAP = {
  chat: CallChatPanel,
  participants: ParticipantsPanel,
  settings: DeviceSettingsPanel,
  polls: PollsPanel,
  qa: QAPanel,
  breakout: BreakoutPanel,
  code: CodeEditor,
};

export function CallShell({ onEndCall }: { onEndCall: () => void }) {
  const store = useCallStore();
  useRecordingManager();

  const LayoutComponent = LAYOUT_MAP[store.layout] || VideoGrid;
  const PanelComponent = store.activePanel ? PANEL_MAP[store.activePanel] : null;

  if (store.isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed bottom-6 right-6 z-[100] w-72 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-[#111214]"
      >
        {/* Video Preview */}
        <div className="w-full h-full relative">
          {store.isCameraOn && store.localStream ? (
            <video
              autoPlay
              playsInline
              muted
              ref={(el) => { if (el) el.srcObject = store.localStream; }}
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e1f22] to-[#111214]">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-white font-bold text-xl">
                {useAppStore.getState().user?.name?.[0]?.toUpperCase() || "Y"}
              </div>
            </div>
          )}

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Live</span>
              </div>
              <button
                onClick={() => store.setMinimized(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Maximize"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={store.toggleMute}
                className={`p-2 rounded-full backdrop-blur-md transition-all ${store.isMuted ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
              >
                {store.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={store.toggleCamera}
                className={`p-2 rounded-full backdrop-blur-md transition-all ${!store.isCameraOn ? "bg-red-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
              >
                {store.isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <button
                onClick={onEndCall}
                className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Drag handle hint */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="call-shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] flex flex-col"
        style={{ background: "#0a0a0f" }}
      >
        {/* Subtle gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 60%)",
          }}
        />

        {/* Header */}
        <CallHeader />

        {/* Content area */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Screen share banner */}
          {store.isScreenSharing && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-3 py-2"
              style={{ background: "rgba(35,165,90,0.15)", borderBottom: "1px solid rgba(35,165,90,0.2)" }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">You are sharing your screen</span>
              <button
                onClick={() => store.setScreenStream(null)}
                className="px-3 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
              >
                Stop Sharing
              </button>
            </motion.div>
          )}

          {/* Main layout */}
          <div className="flex-1 min-w-0 relative">
            {store.isWhiteboardActive ? (
              <div className="w-full h-full p-4">
                <Whiteboard />
              </div>
            ) : store.activePanel === "code" ? (
              <div className="w-full h-full p-4">
                <CodeEditor />
              </div>
            ) : (
              <LayoutComponent />
            )}
            <ReactionOverlay />
            <LiveCaptions />
          </div>

          {/* Side panel */}
          <AnimatePresence mode="wait">
            {PanelComponent && <PanelComponent key={store.activePanel} />}
          </AnimatePresence>
        </div>

        {/* Control bar */}
        <ControlBar onEndCall={onEndCall} />

        {/* Speaking animation keyframes */}
        <style>{`
          @keyframes callSpeakBar {
            from { transform: scaleY(0.3); }
            to   { transform: scaleY(1); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
