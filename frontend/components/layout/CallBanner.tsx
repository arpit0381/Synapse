"use client";

import { useEffect } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { Phone, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

function strHsl(s: string = "") {
  if (!s) return "hsl(0, 0%, 25%)";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 50%, 38%)`;
}

interface Props { channelId: string; channelName: string; }

export function CallBanner({ channelId, channelName }: Props) {
  const { user } = useAppStore();
  const store = useCallStore();
  const activeCall = store.activeGroupCalls[channelId];
  const isInThisCall = store.isCalling && store.callRoomId === channelId;

  useEffect(() => {
    const socket = getSocket();
    const onStarted = (data: any) => {
      if (data.roomId !== channelId) return;
      store.setActiveGroupCall(channelId, { channelName: data.channelName || channelName, participantCount: 1, participants: [] });
    };
    const onUpdate = (data: any) => {
      if (data.roomId !== channelId) return;
      store.setActiveGroupCall(channelId, { channelName: store.activeGroupCalls[channelId]?.channelName || channelName, participantCount: data.count, participants: data.participants || [] });
    };
    const onEnded = (data: any) => {
      if (data.roomId !== channelId) return;
      store.setActiveGroupCall(channelId, null);
    };
    socket.on("call-started", onStarted);
    socket.on("call-participants-update", onUpdate);
    socket.on("call-ended", onEnded);
    return () => { socket.off("call-started", onStarted); socket.off("call-participants-update", onUpdate); socket.off("call-ended", onEnded); };
  }, [channelId, channelName]); // eslint-disable-line

  if (!activeCall) return null;

  const joinCall = async () => {
    if (!user || isInThisCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      store.setLocalStream(stream);
      store.setCalling({ isCalling: true, roomId: channelId, isGroupCall: true, callType: "audio", channelName });
      getSocket().emit("join-call", { roomId: channelId, userId: user.id, userName: user.name, channelName, workspaceId: useAppStore.getState().currentWorkspace?.id });
    } catch (e: any) {
      toast.error(e.message === "Permission denied" ? "Microphone permission denied" : "Could not access microphone");
    }
  };

  const participants = activeCall.participants || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-4 mb-3 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(35,165,90,0.08) 0%, rgba(35,165,90,0.03) 100%)",
        border: "1px solid rgba(35,165,90,0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Pulsing dot */}
          <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-green-400 font-semibold text-sm">Voice Call Active</p>
            <div className="flex items-center gap-2 mt-1">
              {/* Stacked avatars */}
              <div className="flex -space-x-1.5">
                {participants.slice(0, 4).map((p) => (
                  <div key={p.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-[#111214]" style={{ background: strHsl(p.name) }}>
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
                {participants.length > 4 && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-white/10 ring-2 ring-[#111214]">
                    +{participants.length - 4}
                  </div>
                )}
              </div>

              <span className="text-xs flex items-center gap-1" style={{ color: "#949ba4" }}>
                <Users className="w-3 h-3" />
                {activeCall.participantCount} {activeCall.participantCount === 1 ? "person" : "people"}
              </span>

              {participants.length > 0 && participants.length <= 3 && (
                <span className="text-xs truncate max-w-[140px]" style={{ color: "#949ba4" }}>
                  · {participants.map((p) => p.name).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isInThisCall ? (
            <button
              onClick={joinCall}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
              style={{ background: "linear-gradient(135deg, #23a55a, #1e9050)", boxShadow: "0 2px 12px rgba(35,165,90,0.3)" }}
            >
              <Phone className="w-3.5 h-3.5" />
              Join
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-green-400" style={{ background: "rgba(35,165,90,0.12)" }}>
              Connected
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
