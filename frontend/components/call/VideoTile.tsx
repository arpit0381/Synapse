"use client";

import React, { useEffect, useRef } from "react";
import { useCallStore, CallParticipant } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import {
  Mic, MicOff, Video, VideoOff, Pin, PinOff,
  Hand, Wifi, WifiOff, MoreVertical, Volume2,
} from "lucide-react";
import { motion } from "framer-motion";

/* ─── Helpers ────────────────────────────────────────────────────── */
function strHsl(s: string | undefined | null) {
  const str = s || "?";
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 50%, 35%)`;
}

function initials(n: string | undefined | null) {
  if (!n) return "?";
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const QUALITY_COLORS = {
  excellent: "#23a55a",
  good: "#f0b232",
  poor: "#f23f42",
  disconnected: "#80848e",
};

/* ─── Props ──────────────────────────────────────────────────────── */
interface VideoTileProps {
  userId: string;
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOn?: boolean;
  isSpeaking?: boolean;
  isHandRaised?: boolean;
  isPinned?: boolean;
  networkQuality?: "excellent" | "good" | "poor" | "disconnected";
  role?: string;
  isScreenShare?: boolean;
  compact?: boolean;
}

/* ─── Component ──────────────────────────────────────────────────── */
export function VideoTile({
  userId,
  stream,
  name,
  isLocal = false,
  isMuted = false,
  isCameraOn = true,
  isSpeaking = false,
  isHandRaised = false,
  isPinned = false,
  networkQuality = "excellent",
  role,
  isScreenShare = false,
  compact = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const store = useCallStore();

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  const hasLiveVideo =
    isCameraOn && stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

  const showVideo = isScreenShare ? !!stream : hasLiveVideo;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="group relative rounded-2xl overflow-hidden flex items-center justify-center select-none"
      style={{
        background: "linear-gradient(145deg, #1a1b1e 0%, #111214 100%)",
        aspectRatio: isScreenShare ? undefined : "16/9",
        minHeight: compact ? 80 : 120,
        boxShadow: isSpeaking
          ? "0 0 0 2.5px #23a55a, 0 0 24px 4px rgba(35,165,90,0.25)"
          : "0 0 0 1px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.3)",
        transition: "box-shadow 0.3s ease",
      }}
    >
      {/* Video */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || store.isDeafened}
          className={`w-full h-full object-cover ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* Hidden audio element for voice-only */}
          {stream && !isLocal && (
            <audio
              ref={(el) => {
                if (el && el.srcObject !== stream) {
                  el.srcObject = stream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted={store.isDeafened}
            />
          )}
          {/* Avatar */}
          <div
            className={`flex items-center justify-center rounded-full text-white font-bold transition-all duration-300 ${
              compact ? "w-12 h-12 text-base" : "w-20 h-20 text-2xl"
            } ${isSpeaking ? "ring-4 ring-green-400 ring-offset-4 ring-offset-[#111214]" : ""}`}
            style={{ background: strHsl(name) }}
          >
            {initials(name)}
          </div>
          {/* Speaking bars */}
          {isSpeaking && !compact && (
            <div className="flex gap-0.5 items-end h-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-green-400"
                  style={{
                    animation: `callSpeakBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                    height: "100%",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hand raised badge */}
      {isHandRaised && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-amber-500/90 flex items-center justify-center shadow-lg backdrop-blur-sm"
        >
          <Hand className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500/80 flex items-center justify-center">
          <Pin className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-2">
        {/* Mute indicator */}
        {isMuted && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/90 flex-shrink-0">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}

        {/* Name */}
        <span className={`text-white font-medium truncate ${compact ? "text-[10px]" : "text-xs"}`}>
          {name}
          {isLocal ? " (You)" : ""}
        </span>

        {/* Role badge */}
        {role && role !== "member" && !compact && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-accent/20 text-accent flex-shrink-0">
            {role}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Network quality dots */}
        {!compact && (
          <div className="flex items-end gap-px flex-shrink-0" title={`Network: ${networkQuality}`}>
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className="rounded-sm transition-colors"
                style={{
                  width: 3,
                  height: 4 + bar * 2,
                  background:
                    (networkQuality === "excellent" && bar <= 4) ||
                    (networkQuality === "good" && bar <= 3) ||
                    (networkQuality === "poor" && bar <= 1)
                      ? QUALITY_COLORS[networkQuality]
                      : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        )}

        {/* Speaking bars (in video mode) */}
        {isSpeaking && !isMuted && showVideo && (
          <div className="flex gap-0.5 items-end flex-shrink-0" style={{ height: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-full bg-green-400"
                style={{
                  animation: `callSpeakBar 0.5s ease-in-out ${i * 0.12}s infinite alternate`,
                  height: "100%",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hover overlay with actions */}
      {!isLocal && !compact && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <button
              onClick={() => store.setPinnedUser(isPinned ? null : userId)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white"
              title={isPinned ? "Unpin" : "Pin"}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
