"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Volume2, VolumeX, Hash, Phone, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── helpers ──────────────────────────────────────────────────── */
function strHsl(s: string | undefined | null) {
  const str = s || "?";
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},55%,42%)`;
}
function initials(n: string | undefined | null) {
  if (!n) return "?";
  return n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ─── Video / Voice tile ────────────────────────────────────────── */
function Tile({
  userId,
  stream,
  name,
  isLocal = false,
  isMuted = false,
  isSpeaking = false,
  showVideo = true,
}: {
  userId: string;
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  showVideo?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasLiveVideo =
    showVideo && stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

  return (
    <div
      className="relative rounded-xl overflow-hidden flex items-center justify-center select-none transition-all duration-200"
      style={{
        background: "#1e1f22",
        aspectRatio: "16/9",
        boxShadow: isSpeaking ? "0 0 0 2px #23a55a, 0 0 20px 2px #23a55a44" : "none",
      }}
    >
      {hasLiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover${isLocal ? " scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white transition-all duration-150 ${isSpeaking ? "ring-4 ring-green-400 ring-offset-2 ring-offset-[#1e1f22]" : ""}`}
            style={{ background: strHsl(name) }}
          >
            {initials(name)}
          </div>
          {isSpeaking && (
            <div className="flex gap-0.5 items-end h-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-green-400"
                  style={{
                    animation: `speakBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                    height: "100%",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/75 to-transparent flex items-center gap-1.5">
        {isMuted && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500/90">
            <MicOff className="w-2.5 h-2.5 text-white" />
          </span>
        )}
        <span className="text-white text-xs font-semibold truncate">
          {name}{isLocal ? " (you)" : ""}
        </span>
        {isSpeaking && !isMuted && (
          <span className="ml-auto flex gap-0.5 items-end" style={{ height: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-full bg-green-400"
                style={{
                  animation: `speakBar 0.5s ease-in-out ${i * 0.12}s infinite alternate`,
                  height: "100%",
                }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Control button ────────────────────────────────────────────── */
function Btn({
  onClick,
  active = false,
  danger = false,
  label,
  large = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-1.5 focus:outline-none group"
    >
      <div
        className={`
          flex items-center justify-center rounded-full transition-all duration-150
          ${large ? "w-14 h-14" : "w-11 h-11"}
          ${danger ? "bg-red-500 hover:bg-red-400 text-white"
            : active ? "bg-[#f23f42] hover:bg-[#da373c] text-white"
            : "bg-[#313338] hover:bg-[#404249] text-[#dbdee1]"}
        `}
      >
        {children}
      </div>
      <span className="text-[10px] font-medium" style={{ color: "#949ba4" }}>{label}</span>
    </button>
  );
}

/* ─── Voice avatar (voice-only mode) ───────────────────────────── */
function VoiceAvatar({ name, isMuted, isSpeaking, isLocal }: {
  name: string; isMuted: boolean; isSpeaking: boolean; isLocal?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white transition-all duration-200 ${isSpeaking ? "ring-4 ring-green-400 ring-offset-4 ring-offset-[#111214]" : "ring-2 ring-transparent"}`}
          style={{ background: strHsl(name) }}
        >
          {initials(name)}
        </div>
        {isMuted && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-[#f23f42] ring-2 ring-[#111214]">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}
        {isSpeaking && !isMuted && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-green-500 ring-2 ring-[#111214]">
            <Mic className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
      <span className="text-sm font-medium" style={{ color: "#dbdee1" }}>
        {name}{isLocal ? " (you)" : ""}
      </span>
      {isSpeaking && !isMuted && (
        <div className="flex gap-0.5 items-end" style={{ height: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-0.5 rounded-full bg-green-400"
              style={{
                animation: `speakBar 0.55s ease-in-out ${i * 0.1}s infinite alternate`,
                height: "100%",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────── */
export function CallScreen({ onEndCall }: { onEndCall: () => void }) {
  const store = useCallStore();
  const { user } = useAppStore();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const remoteEntries = Object.entries(store.remoteStreams);
  const totalTiles = 1 + remoteEntries.length;

  const gridCols =
    totalTiles === 1 ? "grid-cols-1 max-w-2xl" :
    totalTiles === 2 ? "grid-cols-2" :
    totalTiles <= 4 ? "grid-cols-2" :
    "grid-cols-3";

  const isVoice = store.callType === "audio";

  // My speaking/muted state (local)
  const myParticipant = user ? store.participants[user.id] : null;
  const iAmSpeaking = user ? store.speakingUserIds.has(user.id) : false;

  return (
    <>
      {/* Speaking animation keyframes */}
      <style>{`
        @keyframes speakBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      <AnimatePresence>
        <motion.div
          key="call-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: "#111214" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ background: "#1e1f22", borderColor: "#2b2d31" }}>
            <div className="flex items-center gap-3">
              {store.isGroupCall
                ? <Hash className="w-4 h-4" style={{ color: "#80848e" }} />
                : <Phone className="w-4 h-4" style={{ color: "#80848e" }} />}
              <span className="text-white font-semibold text-sm">
                {store.isGroupCall ? (store.channelName ? `#${store.channelName}` : "Group Call") : "Direct Call"}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: "#1c3323" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">{fmt(elapsed)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#949ba4" }}>
              <Users className="w-4 h-4" />
              <span>{totalTiles} {totalTiles === 1 ? "person" : "people"}</span>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 flex items-center justify-center p-5 min-h-0">
            {isVoice ? (
              /* Voice-only: avatar circles */
              <div className="flex flex-wrap items-center justify-center gap-10 max-w-3xl">
                <VoiceAvatar
                  name={user?.name || "You"}
                  isMuted={store.isMuted}
                  isSpeaking={iAmSpeaking}
                  isLocal
                />
                {Object.entries(store.participants).map(([uid, p]) => (
                  <VoiceAvatar
                    key={uid}
                    name={p.name}
                    isMuted={p.isMuted}
                    isSpeaking={p.isSpeaking}
                  />
                ))}
              </div>
            ) : (
              /* Video grid */
              <div
                className={`w-full h-full grid gap-3 content-center items-center ${gridCols}`}
                style={{ maxHeight: "100%", maxWidth: "100%" }}
              >
                <Tile
                  userId={user?.id || ""}
                  stream={store.localStream}
                  name={user?.name || "You"}
                  isLocal
                  isMuted={store.isMuted}
                  isSpeaking={iAmSpeaking}
                  showVideo={store.isCameraOn}
                />
                {remoteEntries.map(([uid, stream]) => {
                  const p = store.participants[uid];
                  return (
                    <Tile
                      key={uid}
                      userId={uid}
                      stream={stream}
                      name={p?.name || "User"}
                      isMuted={p?.isMuted || false}
                      isSpeaking={p?.isSpeaking || false}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Controls ── */}
          <div className="flex items-center justify-center gap-4 pb-8 pt-4 border-t"
            style={{ background: "#1e1f22", borderColor: "#2b2d31" }}>
            <Btn
              onClick={store.toggleMute}
              active={store.isMuted}
              label={store.isMuted ? "Unmute" : "Mute"}
            >
              {store.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Btn>

            {!isVoice && (
              <Btn
                onClick={store.toggleCamera}
                active={!store.isCameraOn}
                label={store.isCameraOn ? "Stop Video" : "Start Video"}
              >
                {store.isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Btn>
            )}

            <Btn
              onClick={store.toggleDeafen}
              active={store.isDeafened}
              label={store.isDeafened ? "Undeafen" : "Deafen"}
            >
              {store.isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Btn>

            <Btn onClick={onEndCall} danger label="End Call" large>
              <PhoneOff className="w-6 h-6" />
            </Btn>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
