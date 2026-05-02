"use client";

import { useEffect } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { Phone, Users, PhoneOff } from "lucide-react";

interface Props {
  channelId: string;
  channelName: string;
}

export function CallBanner({ channelId, channelName }: Props) {
  const { user } = useAppStore();
  const store = useCallStore();
  const activeCall = store.activeGroupCalls[channelId];
  const isInThisCall = store.isCalling && store.callRoomId === channelId;

  // Also listen for call events directly in the channel page context
  // (belt-and-suspenders alongside CallProvider)
  useEffect(() => {
    const socket = getSocket();

    const onStarted = (data: any) => {
      if (data.roomId !== channelId) return;
      store.setActiveGroupCall(channelId, {
        channelName: data.channelName || channelName,
        participantCount: 1,
        participants: [],
      });
    };

    const onUpdate = (data: any) => {
      if (data.roomId !== channelId) return;
      store.setActiveGroupCall(channelId, {
        channelName: store.activeGroupCalls[channelId]?.channelName || channelName,
        participantCount: data.count,
        participants: data.participants || [],
      });
    };

    const onEnded = (data: any) => {
      if (data.roomId !== channelId) return;
      store.setActiveGroupCall(channelId, null);
    };

    socket.on("call-started", onStarted);
    socket.on("call-participants-update", onUpdate);
    socket.on("call-ended", onEnded);

    return () => {
      socket.off("call-started", onStarted);
      socket.off("call-participants-update", onUpdate);
      socket.off("call-ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, channelName]);

  if (!activeCall) return null;

  const joinCall = async () => {
    if (!user || isInThisCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      store.setLocalStream(stream);
      store.setCalling({ isCalling: true, roomId: channelId, isGroupCall: true, callType: "audio", channelName });
      const socket = getSocket();
      socket.emit("join-call", { 
        roomId: channelId, 
        userId: user.id, 
        userName: user.name, 
        channelName,
        workspaceId: useAppStore.getState().currentWorkspace?.id 
      });
    } catch (e) {
      console.error("[CallBanner] media error", e);
    }
  };

  return (
    <div className="mx-4 mb-3 rounded-lg overflow-hidden"
      style={{ background: "#1a2a1c", border: "1px solid #2d4a2f" }}>
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </div>
          <div>
            <p className="text-green-400 font-semibold text-sm">Voice Call Active</p>
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#949ba4" }}>
              <Users className="w-3 h-3" />
              {activeCall.participantCount} {activeCall.participantCount === 1 ? "person" : "people"}
              {activeCall.participants.length > 0 && (
                <span className="ml-1 truncate max-w-[180px]">
                  · {activeCall.participants.map((p) => p.name).join(", ")}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isInThisCall ? (
            <button
              onClick={joinCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#23a55a" }}
            >
              <Phone className="w-3.5 h-3.5" />
              Join
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-green-400"
              style={{ background: "rgba(35,165,90,0.12)" }}>
              Connected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
