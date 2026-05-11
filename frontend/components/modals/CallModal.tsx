"use client";

import { useEffect, useState } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { Phone, Video, PhoneOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function strHsl(s: string | undefined | null) {
  const str = s || "?";
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},55%,45%)`;
}

export function CallModal() {
  const store = useCallStore();
  const { user } = useAppStore();
  const incoming = store.incomingCall;
  const [autoDeclineTimer, setAutoDeclineTimer] = useState(30);

  // Auto-decline after 30s
  useEffect(() => {
    if (!incoming) return;
    const interval = setInterval(() => {
      setAutoDeclineTimer((prev) => {
        if (prev <= 1) { rejectCall(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incoming]); // eslint-disable-line

  if (!incoming || !user) return null;

  const acceptCall = async () => {
    const socket = getSocket();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incoming.type === "video",
        audio: true,
      });
      store.setLocalStream(stream);
      store.upsertParticipant({
        id: incoming.fromUserId, name: incoming.fromUserName,
        isMuted: false, isSpeaking: false, isCameraOn: incoming.type === "video",
        isHandRaised: false, isScreenSharing: false, networkQuality: "excellent",
      });
      store.setCalling({
        isCalling: true, roomId: incoming.callRoomId,
        isGroupCall: incoming.isGroupCall, callType: incoming.type, channelName: incoming.channelName,
      });
      socket.emit("accept-call", { toUserId: incoming.fromUserId, fromUserId: user.id, fromUserName: user.name });
      socket.emit("join-call", { roomId: incoming.callRoomId, userId: user.id, userName: user.name, channelName: incoming.channelName });
      store.setIncomingCall(null);
    } catch (e) {
      console.error("[CallModal] media error", e);
      rejectCall();
    }
  };

  const rejectCall = () => {
    getSocket().emit("reject-call", { toUserId: incoming.fromUserId, fromUserId: user.id });
    store.setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="w-[340px] rounded-3xl overflow-hidden shadow-2xl relative"
          style={{ background: "#111214", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Top accent line */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #23a55a, #3ba55c, #23a55a)", animation: "callPulseGradient 2s ease-in-out infinite" }} />

          {/* Close */}
          <button onClick={rejectCall} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-white/30 hover:text-white transition-colors z-10">
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            {/* Pulsing avatar */}
            <div className="relative mb-5">
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full" style={{ animation: "callRingPulse 2s ease-out infinite", border: "2px solid rgba(35,165,90,0.3)", transform: "scale(1.3)" }} />
              <div className="absolute inset-0 rounded-full" style={{ animation: "callRingPulse 2s ease-out 0.5s infinite", border: "2px solid rgba(35,165,90,0.2)", transform: "scale(1.6)" }} />
              <div className="absolute inset-0 rounded-full" style={{ animation: "callRingPulse 2s ease-out 1s infinite", border: "2px solid rgba(35,165,90,0.1)", transform: "scale(1.9)" }} />

              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white relative z-10 ring-4 ring-green-500/30"
                style={{ background: strHsl(incoming.fromUserName) }}
              >
                {incoming.fromUserName.slice(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-green-400 mb-2">
              {incoming.isGroupCall ? "Group Call" : "Incoming Call"}
            </p>
            <p className="text-white font-bold text-xl mb-1">{incoming.fromUserName}</p>
            <p className="text-[#949ba4] text-sm flex items-center gap-1.5 mb-1">
              {incoming.type === "video" ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              {incoming.type === "video" ? "Video" : "Voice"} Call
              {incoming.channelName ? ` · #${incoming.channelName}` : ""}
            </p>
            <p className="text-[#5c5e66] text-xs">Auto-decline in {autoDeclineTimer}s</p>

            {/* Buttons */}
            <div className="flex gap-4 mt-8 w-full">
              <button
                onClick={rejectCall}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
                style={{ background: "linear-gradient(135deg, #f23f42, #da373c)", boxShadow: "0 4px 20px rgba(242,63,66,0.3)" }}
              >
                <PhoneOff className="w-5 h-5" /> Decline
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
                style={{ background: "linear-gradient(135deg, #23a55a, #1e9050)", boxShadow: "0 4px 20px rgba(35,165,90,0.3)" }}
              >
                {incoming.type === "video" ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
