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
