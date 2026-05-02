"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { CallModal } from "../modals/CallModal";
import { CallScreen } from "../layout/CallScreen";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

// ── Speaking detection with AudioContext ───────────────────────────
function createSpeakingDetector(stream: MediaStream, onSpeak: (v: boolean) => void) {
  try {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    let silenceFrames = 0;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const vol = data.reduce((a, b) => a + b, 0) / data.length;
      if (vol > 12) {
        silenceFrames = 0;
        if (!speaking) { speaking = true; onSpeak(true); }
      } else {
        silenceFrames++;
        if (speaking && silenceFrames > 8) { speaking = false; onSpeak(false); }
      }
      id = requestAnimationFrame(tick);
    };

    let id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      ctx.close();
    };
  } catch {
    return () => {};
  }
}

import { toast } from "react-hot-toast";
import { Hash, Phone, X as CloseIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, currentWorkspace } = useAppStore();
  const router = useRouter();
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const speakingCleanupRef = useRef<(() => void) | null>(null);

  // ── Helpers ────────────────────────────────────────────────────
  const addTracksToPC = (pc: RTCPeerConnection) => {
    const stream = useCallStore.getState().localStream;
    if (!stream) return;
    const existingSenders = pc.getSenders().map((s) => s.track?.id);
    stream.getTracks().forEach((track) => {
      if (!existingSenders.includes(track.id)) {
        pc.addTrack(track, stream);
      }
    });
  };

  const flushIceCandidates = async (pc: RTCPeerConnection, peerId: string) => {
    const queue = iceCandidateQueue.current[peerId] || [];
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceCandidateQueue.current[peerId] = [];
  };

  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    if (peersRef.current[peerId]) {
      peersRef.current[peerId].close();
    }
    iceCandidateQueue.current[peerId] = [];

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;
    addTracksToPC(pc);

    pc.onicecandidate = (e) => {
      if (e.candidate && user) {
        getSocket().emit("ice-candidate", {
          toUserId: peerId,
          fromUserId: user.id,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        useCallStore.getState().addRemoteStream(peerId, e.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] ${peerId}: ${state}`);
      if (state === "failed") pc.restartIce();
      if (state === "disconnected" || state === "closed") {
        // If DM and no more peers, end the call
        const { isGroupCall } = useCallStore.getState();
        if (!isGroupCall) {
          cleanupCall();
        }
      }
    };

    return pc;
  }, [user]); // eslint-disable-line

  const cleanupCall = useCallback(() => {
    // Stop speaking detection
    speakingCleanupRef.current?.();
    speakingCleanupRef.current = null;

    // Stop all local tracks
    const stream = useCallStore.getState().localStream;
    stream?.getTracks().forEach((t) => t.stop());

    // Close all peer connections
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    iceCandidateQueue.current = {};

    useCallStore.getState().resetCallState();
  }, []);

  const endCall = useCallback(() => {
    const { callRoomId, isGroupCall } = useCallStore.getState();
    if (user && callRoomId) {
      if (isGroupCall) {
        getSocket().emit("leave-call", { roomId: callRoomId, userId: user.id });
      } else {
        // For DM, notify peer via leave-call on the DM room
        getSocket().emit("leave-call", { roomId: callRoomId, userId: user.id });
      }
    }
    cleanupCall();
  }, [user, cleanupCall]);

  // Start local speaking detection and emit to peers
  const startSpeakingDetection = useCallback((stream: MediaStream) => {
    if (!user) return;
    speakingCleanupRef.current?.();
    const cleanup = createSpeakingDetector(stream, (isSpeaking) => {
      const { callRoomId } = useCallStore.getState();
      if (!callRoomId) return;
      useCallStore.getState().setParticipantSpeaking(user.id, isSpeaking);
      getSocket().emit("call-speaking", { roomId: callRoomId, userId: user.id, isSpeaking });
    });
    speakingCleanupRef.current = cleanup;
  }, [user]);

  // ── Socket event handlers ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // ─ Incoming DM call ─────────────────────────────────────────
    const onIncomingCall = (data: any) => {
      const { isCalling, incomingCall } = useCallStore.getState();
      if (isCalling || incomingCall) {
        socket.emit("reject-call", { toUserId: data.fromUserId, fromUserId: user.id });
        return;
      }
      useCallStore.getState().setIncomingCall(data);
    };

    // ─ Caller: callee accepted → create offer ───────────────────
    const onAcceptCall = async ({ fromUserId, fromUserName }: any) => {
      // Add callee as a participant so their name shows
      useCallStore.getState().upsertParticipant({ id: fromUserId, name: fromUserName || "User", isMuted: false, isSpeaking: false });

      const pc = createPC(fromUserId);
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { toUserId: fromUserId, fromUserId: user.id, offer });
      } catch (e) {
        console.error("[WebRTC] createOffer error", e);
      }
    };

    // ─ Call rejected ─────────────────────────────────────────────
    const onRejectCall = () => cleanupCall();

    // ─ Got offer (callee or group peer) → answer ─────────────────
    const onOffer = async ({ fromUserId, offer }: any) => {
      // Add as participant if not already
      const { participants } = useCallStore.getState();
      if (!participants[fromUserId]) {
        useCallStore.getState().upsertParticipant({ id: fromUserId, name: "User", isMuted: false, isSpeaking: false });
      }

      const pc = createPC(fromUserId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceCandidates(pc, fromUserId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { toUserId: fromUserId, fromUserId: user.id, answer });
      } catch (e) {
        console.error("[WebRTC] onOffer error", e);
      }
    };

    // ─ Got answer → finalize ─────────────────────────────────────
    const onAnswer = async ({ fromUserId, answer }: any) => {
      const pc = peersRef.current[fromUserId];
      if (pc && pc.signalingState === "have-local-offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushIceCandidates(pc, fromUserId);
        } catch (e) {
          console.error("[WebRTC] onAnswer error", e);
        }
      }
    };

    // ─ ICE candidate ────────────────────────────────────────────
    const onIceCandidate = async ({ fromUserId, candidate }: any) => {
      if (!candidate) return;
      const pc = peersRef.current[fromUserId];
      if (!pc) return;
      if (pc.remoteDescription?.type) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        if (!iceCandidateQueue.current[fromUserId]) iceCandidateQueue.current[fromUserId] = [];
        iceCandidateQueue.current[fromUserId].push(candidate);
      }
    };

    // ─ Group: existing user joined → I send offer to them ───────
    const onUserJoinedCall = async ({ userId, userName }: any) => {
      useCallStore.getState().upsertParticipant({ id: userId, name: userName, isMuted: false, isSpeaking: false });
      const pc = createPC(userId);
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { toUserId: userId, fromUserId: user.id, offer });
      } catch (e) {
        console.error("[WebRTC] group offer error", e);
      }
    };

    // ─ Server tells me who's already in the room (I just joined) ─
    const onCallRoomUsers = ({ users }: { users: { id: string; name: string }[] }) => {
      // Pre-create PCs for existing users so we're ready to receive their offers
      users.forEach((u) => {
        useCallStore.getState().upsertParticipant({ id: u.id, name: u.name, isMuted: false, isSpeaking: false });
        createPC(u.id);
      });
    };

    // ─ Peer left call ─────────────────────────────────────────────
    const onUserLeftCall = ({ userId }: any) => {
      useCallStore.getState().removeParticipant(userId);
      useCallStore.getState().removeRemoteStream(userId);
      const pc = peersRef.current[userId];
      if (pc) { pc.close(); delete peersRef.current[userId]; }

      // DM: if no more peers, end call on my side too
      const { isGroupCall } = useCallStore.getState();
      if (!isGroupCall && Object.keys(peersRef.current).length === 0) {
        cleanupCall();
      }
    };

    // ─ Mute update from peer ────────────────────────────────────
    const onMuteUpdate = ({ userId, isMuted }: any) => {
      useCallStore.getState().setParticipantMuted(userId, isMuted);
    };

    // ─ Speaking update from peer ─────────────────────────────────
    const onSpeaking = ({ userId, isSpeaking }: any) => {
      useCallStore.getState().setParticipantSpeaking(userId, isSpeaking);
    };

    // ─ Group call status events (for channel Join banner) ────────
    const onCallStarted = (data: any) => {
      useCallStore.getState().setActiveGroupCall(data.roomId, {
        channelName: data.channelName,
        participantCount: 1,
        participants: [],
      });

      // Show notification if call started elsewhere in workspace
      const currentCallRoomId = useCallStore.getState().callRoomId;
      if (data.roomId !== currentCallRoomId && user?.id !== data.initiatorId) {
        toast.custom((t) => (
          <div className={`${t.visible ? "animate-in fade-in slide-in-from-right-5" : "animate-out fade-out slide-out-to-right-5"} max-w-sm w-full bg-[#111214] border border-white/5 shadow-2xl rounded-2xl pointer-events-auto flex flex-col transition-all duration-300 overflow-hidden`}>
             <div className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner">
                  <Hash className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-white tracking-tight">Call started in #{data.channelName}</p>
                  <p className="text-[12px] text-[#949ba4] font-medium truncate">{data.initiatorName} is waiting for you</p>
                </div>
                <button onClick={() => toast.dismiss(t.id)} className="text-white/20 hover:text-white transition-colors">
                  <CloseIcon className="w-4 h-4" />
                </button>
             </div>
             <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    router.push(`/channels/${data.roomId}`);
                  }}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-[13px] font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-green-600/20"
                >
                  Join Call
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[13px] font-bold rounded-lg transition-all"
                >
                  Ignore
                </button>
             </div>
          </div>
        ), { duration: 8000, position: "bottom-right" });
      }
    };

    const onCallParticipantsUpdate = (data: any) => {
      useCallStore.getState().setActiveGroupCall(data.roomId, {
        channelName: useCallStore.getState().activeGroupCalls[data.roomId]?.channelName || "",
        participantCount: data.count,
        participants: data.participants || [],
      });
    };

    const onCallEnded = (data: any) => {
      useCallStore.getState().setActiveGroupCall(data.roomId, null);
    };

    socket.on("incoming-call", onIncomingCall);
    socket.on("accept-call", onAcceptCall);
    socket.on("reject-call", onRejectCall);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("user-joined-call", onUserJoinedCall);
    socket.on("call-room-users", onCallRoomUsers);
    socket.on("user-left-call", onUserLeftCall);
    socket.on("call-mute-update", onMuteUpdate);
    socket.on("call-speaking", onSpeaking);
    socket.on("call-started", onCallStarted);
    socket.on("call-participants-update", onCallParticipantsUpdate);
    socket.on("call-ended", onCallEnded);

    return () => {
      socket.off("incoming-call", onIncomingCall);
      socket.off("accept-call", onAcceptCall);
      socket.off("reject-call", onRejectCall);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("user-joined-call", onUserJoinedCall);
      socket.off("call-room-users", onCallRoomUsers);
      socket.off("user-left-call", onUserLeftCall);
      socket.off("call-mute-update", onMuteUpdate);
      socket.off("call-speaking", onSpeaking);
      socket.off("call-started", onCallStarted);
      socket.off("call-participants-update", onCallParticipantsUpdate);
      socket.off("call-ended", onCallEnded);
    };
  }, [user, createPC, cleanupCall, startSpeakingDetection]);

  // Broadcast mute state changes to peers
  const store = useCallStore();
  useEffect(() => {
    if (!user || !store.callRoomId) return;
    getSocket().emit("call-mute-update", {
      roomId: store.callRoomId,
      userId: user.id,
      isMuted: store.isMuted,
    });
  }, [store.isMuted, store.callRoomId, user]);

  // Start speaking detection when stream is available
  useEffect(() => {
    if (store.localStream && store.isCalling) {
      startSpeakingDetection(store.localStream);
    }
    return () => {
      if (!store.isCalling) {
        speakingCleanupRef.current?.();
        speakingCleanupRef.current = null;
      }
    };
  }, [store.localStream, store.isCalling, startSpeakingDetection]);

  return (
    <>
      {children}
      {store.incomingCall && <CallModal />}
      {store.isCalling && <CallScreen onEndCall={endCall} />}
    </>
  );
}
