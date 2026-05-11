"use client";

import React, { useEffect, useState } from "react";
import { useCallStore } from "@/store/callStore";
import {
  Hash, Phone, Users, Lock, Circle, Monitor,
  LayoutGrid, Presentation, PanelRight, Minimize2,
  Maximize2, Disc,
} from "lucide-react";
import { motion } from "framer-motion";

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const LAYOUT_ICONS = {
  grid: LayoutGrid,
  speaker: Presentation,
  sidebar: PanelRight,
  fullscreen: Maximize2,
};

const LAYOUT_LABELS = {
  grid: "Grid",
  speaker: "Speaker",
  sidebar: "Sidebar",
  fullscreen: "Fullscreen",
};

export function CallHeader() {
  const store = useCallStore();
  const [elapsed, setElapsed] = useState(0);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);

  useEffect(() => {
    if (!store.callStartTime) return;
    const tick = () => setElapsed(Date.now() - (store.callStartTime || Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [store.callStartTime]);

  const participantCount = Object.keys(store.participants).length + 1;

  return (
    <div
      className="flex items-center justify-between px-5 py-3 flex-shrink-0 relative z-10"
      style={{
        background: "rgba(17, 18, 20, 0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left: Call info */}
      <div className="flex items-center gap-3">
        {store.isGroupCall ? (
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Hash className="w-4 h-4 text-green-400" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Phone className="w-4 h-4 text-blue-400" />
          </div>
        )}

        <div>
          <span className="text-white font-semibold text-sm">
            {store.isGroupCall
              ? store.channelName
                ? `#${store.channelName}`
                : "Group Call"
              : "Direct Call"}
          </span>
        </div>

        {/* Duration */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(35, 165, 90, 0.12)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-semibold font-mono">
            {formatDuration(elapsed)}
          </span>
        </div>

        {/* Encryption badge */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.04)" }}
          title="Encrypted connection"
        >
          <Lock className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium">E2E</span>
        </div>

        {/* Recording indicator */}
        {store.isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(242, 63, 66, 0.15)" }}
          >
            <Disc className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">
              REC
            </span>
          </motion.div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Participant count */}
        <div className="flex items-center gap-1.5 text-sm" style={{ color: "#949ba4" }}>
          <Users className="w-4 h-4" />
          <span className="font-medium">{participantCount}</span>
        </div>

        {/* Layout switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutPicker(!showLayoutPicker)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
            style={{ color: "#b5bac1" }}
          >
            {React.createElement(LAYOUT_ICONS[store.layout], { className: "w-3.5 h-3.5" })}
            <span className="hidden sm:inline">{LAYOUT_LABELS[store.layout]}</span>
          </button>

          {showLayoutPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLayoutPicker(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full right-0 mt-1 z-20 rounded-xl overflow-hidden shadow-2xl"
                style={{
                  background: "#1e1f22",
                  border: "1px solid rgba(255,255,255,0.06)",
                  minWidth: 140,
                }}
              >
                {(["grid", "speaker", "sidebar"] as const).map((l) => {
                  const Icon = LAYOUT_ICONS[l];
                  const isActive = store.layout === l;
                  return (
                    <button
                      key={l}
                      onClick={() => {
                        store.setLayout(l);
                        setShowLayoutPicker(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "text-white bg-white/5"
                          : "text-[#b5bac1] hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {LAYOUT_LABELS[l]}
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
