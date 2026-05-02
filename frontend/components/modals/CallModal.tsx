"use client";

import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { Phone, Video, PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

export function CallModal() {
  const store = useCallStore();
  const { user } = useAppStore();
  const incoming = store.incomingCall;

  if (!incoming || !user) return null;

  const acceptCall = async () => {
    const socket = getSocket();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incoming.type === "video",
        audio: true,
      });
      store.setLocalStream(stream);

      // Add caller as participant so their name shows
      store.upsertParticipant({
        id: incoming.fromUserId,
        name: incoming.fromUserName,
        isMuted: false,
        isSpeaking: false,
      });

      store.setCalling({
        isCalling: true,
        roomId: incoming.callRoomId,
        isGroupCall: incoming.isGroupCall,
        callType: incoming.type,
        channelName: incoming.channelName,
      });

      // Pass our name back so caller can display it
      socket.emit("accept-call", {
        toUserId: incoming.fromUserId,
        fromUserId: user.id,
        fromUserName: user.name,
      });

      socket.emit("join-call", {
        roomId: incoming.callRoomId,
        userId: user.id,
        userName: user.name,
        channelName: incoming.channelName,
      });

      store.setIncomingCall(null);
    } catch (e) {
      console.error("[CallModal] media error", e);
      rejectCall();
    }
  };

  const rejectCall = () => {
    const socket = getSocket();
    socket.emit("reject-call", { toUserId: incoming.fromUserId, fromUserId: user.id });
    store.setIncomingCall(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[80]">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-72 rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "#111214", border: "1px solid #2b2d31" }}
      >
        {/* pulsing green line */}
        <div className="h-1 w-full bg-gradient-to-r from-green-500 via-green-400 to-green-600 animate-pulse" />

        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#949ba4" }}>
            {incoming.isGroupCall ? "Incoming Group Call" : "Incoming Call"}
          </p>

          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
              style={{ background: strHsl(incoming.fromUserName) }}
            >
              {incoming.fromUserName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{incoming.fromUserName}</p>
              <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "#949ba4" }}>
                {incoming.type === "video" ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                {incoming.type === "video" ? "Video" : "Voice"} Call
                {incoming.channelName ? ` · #${incoming.channelName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={rejectCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#f23f42" }}
            >
              <PhoneOff className="w-4 h-4" /> Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#23a55a" }}
            >
              {incoming.type === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              Accept
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function strHsl(s: string | undefined | null) {
  const str = s || "?";
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},55%,45%)`;
}
