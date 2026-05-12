"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { CallModal } from "../modals/CallModal";
import { CallSummaryModal } from "../modals/CallSummaryModal";
import { CallShell } from "../call/CallShell";
import { useNetworkMonitor } from "../call/NetworkIndicator";
import { toast } from "react-hot-toast";
import { Hash, X as CloseIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { MediaProcessor } from "@/lib/mediaProcessor";
import { motion, AnimatePresence } from "framer-motion";

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

// ── Speaking detection ────────────────────────────────────────────
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
    return () => { cancelAnimationFrame(id); ctx.close(); };
  } catch { return () => {}; }
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, currentWorkspace } = useAppStore();
  const router = useRouter();
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const speakingCleanupRef = useRef<(() => void) | null>(null);
  const mediaProcessorRef = useRef<MediaProcessor>(new MediaProcessor());
  const notifiedRoomsRef = useRef(new Set<string>());

  // Network monitoring
  useNetworkMonitor(peersRef);

  // ── Helpers ─────────────────────────────────────────────────────
  const addTracksToPC = (pc: RTCPeerConnection) => {
    const { localStream, screenStream } = useCallStore.getState();
    const senders = pc.getSenders();
    const existingTrackIds = senders.map((s) => s.track?.id);
    
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        if (!existingTrackIds.includes(track.id)) pc.addTrack(track, localStream);
      });
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        if (!existingTrackIds.includes(track.id)) pc.addTrack(track, screenStream);
      });
    }
  };

  const flushIceCandidates = async (pc: RTCPeerConnection, peerId: string) => {
    const queue = iceCandidateQueue.current[peerId] || [];
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.error("ICE error", e); }
    }
    iceCandidateQueue.current[peerId] = [];
  };

  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    if (peersRef.current[peerId]) peersRef.current[peerId].close();
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peersRef.current[peerId] = pc;
    addTracksToPC(pc);

    pc.onicecandidate = (e) => {
      if (e.candidate && user) {
        getSocket().emit("ice-candidate", { toUserId: peerId, fromUserId: user.id, candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      const existing = useCallStore.getState().remoteStreams[peerId];
      const newStream = new MediaStream();
      if (existing) existing.getTracks().forEach((t) => newStream.addTrack(t));
      if (e.track) newStream.addTrack(e.track);
      useCallStore.getState().addRemoteStream(peerId, newStream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "failed") pc.restartIce();
      if (state === "disconnected" || state === "closed") {
        if (!useCallStore.getState().isGroupCall) cleanupCall();
      }
    };

    return pc;
  }, [user]); // eslint-disable-line

  const cleanupCall = useCallback(() => {
    speakingCleanupRef.current?.();
    speakingCleanupRef.current = null;
    const state = useCallStore.getState();
    state.localStream?.getTracks().forEach((t) => t.stop());
    state.screenStream?.getTracks().forEach((t) => t.stop());
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    iceCandidateQueue.current = {};
    useCallStore.getState().resetCallState();
  }, []);

  const endCall = useCallback(() => {
    const { callRoomId } = useCallStore.getState();
    if (user && callRoomId) {
      getSocket().emit("leave-call", { roomId: callRoomId, userId: user.id });
    }
    useCallStore.getState().setSummaryVisible(true);
    cleanupCall();
  }, [user, cleanupCall]);

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

  // ── Effect Processor ────────────────────────────────────────────
  const applyMediaEffects = useCallback(async (originalStream: MediaStream) => {
    let processed = originalStream;
    const { backgroundBlurEnabled, noiseSuppressionEnabled, backgroundImage } = useCallStore.getState();

    if (backgroundImage) {
      processed = await mediaProcessorRef.current.applyVirtualBackground(processed, backgroundImage);
    } else if (backgroundBlurEnabled) {
      processed = await mediaProcessorRef.current.applyBackgroundBlur(processed);
    }

    if (noiseSuppressionEnabled) {
      processed = mediaProcessorRef.current.applyNoiseSuppression(processed);
    }

    return processed;
  }, []);

  // ── Screen sharing handler ──────────────────────────────────────
  const store = useCallStore();

  useEffect(() => {
    if (!user || !store.callRoomId) return;
    const shouldShare = store.isScreenSharing && !store.screenStream;
    const shouldStop = !store.isScreenSharing && store.screenStream;

    if (shouldShare) {
      (async () => {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          useCallStore.getState().setScreenStream(screenStream);

          // Add screen tracks to all peers
          Object.entries(peersRef.current).forEach(([pid, pc]) => {
            screenStream.getTracks().forEach((track) => {
              pc.addTrack(track, screenStream);
            });
          });

          // Auto-switch to sidebar layout
          useCallStore.getState().setLayout("sidebar");

          // Broadcast screen share started
          getSocket().emit("call-screen-share", { roomId: store.callRoomId, userId: user.id, isSharing: true });

          // Handle user stopping share via browser UI
          screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
            useCallStore.getState().setScreenStream(null);
            getSocket().emit("call-screen-share", { roomId: store.callRoomId, userId: user.id, isSharing: false });
          });
        } catch (e) {
          console.error("[ScreenShare] Failed:", e);
          useCallStore.getState().setScreenStream(null);
        }
      })();
    }

    if (shouldStop) {
      store.screenStream?.getTracks().forEach((t) => t.stop());
      useCallStore.getState().setScreenStream(null);
      getSocket().emit("call-screen-share", { roomId: store.callRoomId, userId: user.id, isSharing: false });
    }
  }, [store.isScreenSharing]); // eslint-disable-line

  // ── Media Effects Watcher ───────────────────────────────────────
  useEffect(() => {
    if (!store.isCalling || !store.localStream) return;

    (async () => {
      const originalStream = store.localStream;
      if (!originalStream) return;
      const processedStream = await applyMediaEffects(originalStream);
      
      // Update peer tracks with processed stream
      Object.values(peersRef.current).forEach((pc) => {
        const senders = pc.getSenders();
        processedStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) sender.replaceTrack(track);
        });
      });
    })();
  }, [store.localStream, store.backgroundBlurEnabled, store.noiseSuppressionEnabled, store.backgroundImage]); // eslint-disable-line

  // ── Push-to-talk ────────────────────────────────────────────────
  useEffect(() => {
    if (!store.pushToTalkEnabled || !store.isCalling) return;
    // Mute by default when PTT is enabled
    useCallStore.getState().setMuted(true);

    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        useCallStore.getState().setPushToTalkActive(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        useCallStore.getState().setPushToTalkActive(false);
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [store.pushToTalkEnabled, store.isCalling]);

  // ── Socket event handlers ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const onIncomingCall = (data: any) => {
      const { isCalling, incomingCall } = useCallStore.getState();
      if (isCalling || incomingCall) {
        socket.emit("reject-call", { toUserId: data.fromUserId, fromUserId: user.id });
        return;
      }
      useCallStore.getState().setIncomingCall(data);
    };

    const onAcceptCall = async ({ fromUserId, fromUserName }: any) => {
      useCallStore.getState().upsertParticipant({ id: fromUserId, name: fromUserName || "User", isMuted: false, isSpeaking: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, networkQuality: "excellent" });
      const pc = createPC(fromUserId);
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { toUserId: fromUserId, fromUserId: user.id, offer });
      } catch (e) { console.error("[WebRTC] createOffer error", e); }
    };

    const onRejectCall = () => cleanupCall();

    const onOffer = async ({ fromUserId, offer }: any) => {
      const { participants } = useCallStore.getState();
      if (!participants[fromUserId]) {
        useCallStore.getState().upsertParticipant({ id: fromUserId, name: "User", isMuted: false, isSpeaking: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, networkQuality: "excellent" });
      }
      const pc = peersRef.current[fromUserId];
      if (!pc || pc.connectionState === "closed") return;

      // Simple glare handling: if we have a local offer and are "less polite", ignore incoming
      // For a robust implementation, use rollback, but for now, checking state is safer
      if (pc.signalingState !== "stable" && pc.signalingState !== "have-remote-offer") {
        if (user.id < fromUserId) { // We are "impolite", we yield to their offer
           // In a full implementation we'd call rollback here
        } else {
          return; // Ignore their offer, ours is pending
        }
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceCandidates(pc, fromUserId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { toUserId: fromUserId, fromUserId: user.id, answer });
      } catch (e) { 
        console.warn("[WebRTC] onOffer glare or error", e); 
      }
    };

    const onAnswer = async ({ fromUserId, answer }: any) => {
      const pc = peersRef.current[fromUserId];
      if (pc && pc.signalingState === "have-local-offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushIceCandidates(pc, fromUserId);
        } catch (e) { console.error("[WebRTC] onAnswer error", e); }
      }
    };

    const onIceCandidate = async ({ fromUserId, candidate }: any) => {
      if (!candidate) return;
      const pc = peersRef.current[fromUserId];
      if (!pc || !pc.remoteDescription?.type) {
        if (!iceCandidateQueue.current[fromUserId]) iceCandidateQueue.current[fromUserId] = [];
        iceCandidateQueue.current[fromUserId].push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error("ICE add fail", e); }
    };

    const onUserJoinedCall = async ({ userId, userName }: any) => {
      useCallStore.getState().upsertParticipant({ id: userId, name: userName, isMuted: false, isSpeaking: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, networkQuality: "excellent" });
      const pc = createPC(userId);
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { toUserId: userId, fromUserId: user.id, offer });
      } catch (e) { console.error("[WebRTC] group offer error", e); }
    };

    const onCallRoomUsers = ({ users }: { users: { id: string; name: string }[] }) => {
      users.forEach((u) => {
        useCallStore.getState().upsertParticipant({ id: u.id, name: u.name, isMuted: false, isSpeaking: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, networkQuality: "excellent" });
        createPC(u.id);
      });
    };

    const onUserLeftCall = ({ userId }: any) => {
      useCallStore.getState().removeParticipant(userId);
      useCallStore.getState().removeRemoteStream(userId);
      useCallStore.getState().removeRemoteScreenStream(userId);
      const pc = peersRef.current[userId];
      if (pc) { pc.close(); delete peersRef.current[userId]; }
      if (!useCallStore.getState().isGroupCall && Object.keys(peersRef.current).length === 0) cleanupCall();
    };

    const onMuteUpdate = ({ userId, isMuted }: any) => useCallStore.getState().setParticipantMuted(userId, isMuted);
    const onSpeaking = ({ userId, isSpeaking }: any) => useCallStore.getState().setParticipantSpeaking(userId, isSpeaking);

    const onScreenShare = ({ userId, isSharing }: any) => {
      useCallStore.getState().setParticipantScreenSharing(userId, isSharing);
      if (isSharing && userId !== user.id) useCallStore.getState().setLayout("sidebar");
    };

    // In-call chat
    const onChatMessage = (msg: any) => {
      if (msg.userId === user.id) return;
      useCallStore.getState().addChatMessage(msg);
    };

    // Reactions
    const onReaction = (data: any) => {
      if (data.userId === user.id) return;
      useCallStore.getState().addReaction(data);
      setTimeout(() => useCallStore.getState().removeReaction(data.id), 3000);
    };

    // Hand raise
    const onHandRaise = ({ userId, isRaised }: any) => {
      useCallStore.getState().setParticipantHandRaised(userId, isRaised);
    };

    // Camera update
    const onCameraUpdate = ({ userId, isCameraOn }: any) => {
      useCallStore.getState().setParticipantCameraOn(userId, isCameraOn);
    };

    // Group call banners
    const onCallStarted = (data: any) => {
      useCallStore.getState().setActiveGroupCall(data.roomId, { channelName: data.channelName, participantCount: 1, participants: [] });
      const currentCallRoomId = useCallStore.getState().callRoomId;
      
      if (data.roomId !== currentCallRoomId && user?.id !== data.initiatorId && !notifiedRoomsRef.current.has(data.roomId)) {
        notifiedRoomsRef.current.add(data.roomId);
        // Remove from set after some time so they can be notified again if a new call starts later
        setTimeout(() => notifiedRoomsRef.current.delete(data.roomId), 60000);

        toast.custom((t) => (
          <div className={`${t.visible ? "animate-in fade-in slide-in-from-right-5" : "animate-out fade-out slide-out-to-right-5"} max-w-sm w-full bg-[#111214] border border-white/5 shadow-2xl rounded-2xl pointer-events-auto flex flex-col overflow-hidden`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500"><Hash className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-white">Call in #{data.channelName}</p>
                <p className="text-[12px] text-[#949ba4] truncate">{data.initiatorName} is waiting</p>
              </div>
              <button onClick={() => toast.dismiss(t.id)} className="text-white/20 hover:text-white"><CloseIcon className="w-4 h-4" /></button>
            </div>
            <div className="px-4 pb-4 flex gap-2">
              <button 
                onClick={async () => { 
                  toast.dismiss(t.id); 
                  router.push(`/channels/${data.roomId}`);
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    useCallStore.getState().setLocalStream(stream);
                    useCallStore.getState().setCalling({ 
                      isCalling: true, 
                      roomId: data.roomId, 
                      isGroupCall: true, 
                      callType: "audio", 
                      channelName: data.channelName 
                    });
                    getSocket().emit("join-call", { 
                      roomId: data.roomId, 
                      userId: user!.id, 
                      userName: user!.name, 
                      channelName: data.channelName, 
                      workspaceId: useAppStore.getState().currentWorkspace?.id 
                    });
                  } catch (e: any) {
                    toast.error("Could not join automatically. Please join manually.");
                  }
                }} 
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-[13px] font-bold rounded-lg transition-all shadow-lg shadow-green-600/20"
              >
                Join Now
              </button>
              <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[13px] font-bold rounded-lg">Ignore</button>
            </div>
          </div>
        ), { duration: 10000, position: "bottom-right" });
      }
    };

    const onCallParticipantsUpdate = (data: any) => {
      useCallStore.getState().setActiveGroupCall(data.roomId, { channelName: useCallStore.getState().activeGroupCalls[data.roomId]?.channelName || "", participantCount: data.count, participants: data.participants || [] });
    };

    const onCallEnded = (data: any) => useCallStore.getState().setActiveGroupCall(data.roomId, null);

    const onSyncState = (state: any) => {
      if (state.polls) useCallStore.getState().setPolls(state.polls);
      if (state.whiteboard) useCallStore.getState().setWhiteboardActions(state.whiteboard);
    };
    const onWbDraw = (data: any) => {
      if (data === null || data === undefined) return;
      if (typeof data !== "object") return;
      
      const appState = useAppStore.getState();
      const myId = appState?.user?.id;
      const remoteId = data?.userId;
      
      if (remoteId && remoteId === myId) return;
      if (data.x === undefined || data.x === null) return;
      
      useCallStore.getState().addWhiteboardAction(data);
    };
    const onWbClear = () => useCallStore.getState().clearWhiteboard();
    const onPollCreated = (poll: any) => useCallStore.getState().addPoll(poll);
    const onPollVoted = (data: any) => useCallStore.getState().updatePollVote(data.pollId, data.optionId, data.userId);
    const onQuestionNew = (q: any) => { /* logic to add question */ };
    const onQuestionUpvote = (data: any) => { /* logic to update upvote */ };
    const onQuestionAnswered = (data: any) => { /* logic to mark answered */ };
    const onBreakoutAssign = (data: any) => {
      useCallStore.getState().updateBreakoutRooms(data.rooms);
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
    socket.on("call-screen-share", onScreenShare);
    socket.on("call-chat-message", onChatMessage);
    socket.on("call-reaction", onReaction);
    socket.on("call-raise-hand", onHandRaise);
    socket.on("call-camera-update", onCameraUpdate);
    socket.on("call-started", onCallStarted);
    socket.on("call-participants-update", onCallParticipantsUpdate);
    socket.on("call-ended", onCallEnded);
    socket.on("call-sync-state", onSyncState);
    socket.on("wb-draw", onWbDraw);
    socket.on("wb-clear", onWbClear);
    socket.on("call-poll-created", onPollCreated);
    socket.on("call-poll-voted", onPollVoted);
    socket.on("call-qa-new", onQuestionNew);
    socket.on("call-qa-upvote", onQuestionUpvote);
    socket.on("call-qa-answered", onQuestionAnswered);
    socket.on("call-breakout-assign", onBreakoutAssign);

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
      socket.off("call-screen-share", onScreenShare);
      socket.off("call-chat-message", onChatMessage);
      socket.off("call-reaction", onReaction);
      socket.off("call-raise-hand", onHandRaise);
      socket.off("call-camera-update", onCameraUpdate);
      socket.off("call-started", onCallStarted);
      socket.off("call-participants-update", onCallParticipantsUpdate);
      socket.off("call-ended", onCallEnded);
    };
  }, [user, createPC, cleanupCall, startSpeakingDetection, router]);

  // Handle Stream Renegotiation
  useEffect(() => {
    if (!store.isCalling || !user) return;
    
    const renegotiate = async () => {
      for (const peerId of Object.keys(peersRef.current)) {
        const pc = peersRef.current[peerId];
        if (pc && pc.signalingState === "stable") {
          try {
            addTracksToPC(pc);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            getSocket().emit("offer", { toUserId: peerId, fromUserId: user.id, offer });
          } catch (e) {
            console.warn("[WebRTC] Renegotiation failed for", peerId, e);
          }
        }
      }
    };

    renegotiate();
  }, [store.localStream, store.screenStream, store.isCalling, user]);

  // Broadcast mute changes
  useEffect(() => {
    if (!user || !store.callRoomId) return;
    getSocket().emit("call-mute-update", { roomId: store.callRoomId, userId: user.id, isMuted: store.isMuted });
  }, [store.isMuted, store.callRoomId, user]);

  // Broadcast camera changes
  useEffect(() => {
    if (!user || !store.callRoomId) return;
    getSocket().emit("call-camera-update", { roomId: store.callRoomId, userId: user.id, isCameraOn: store.isCameraOn });
  }, [store.isCameraOn, store.callRoomId, user]);

  // Broadcast hand raise
  useEffect(() => {
    if (!user || !store.callRoomId) return;
    getSocket().emit("call-raise-hand", { roomId: store.callRoomId, userId: user.id, isRaised: store.isHandRaised });
  }, [store.isHandRaised, store.callRoomId, user]);

  // Broadcast reactions
  useEffect(() => {
    if (!user || !store.callRoomId) return;
    const last = store.activeReactions[store.activeReactions.length - 1];
    if (last && last.userId === "local") {
      getSocket().emit("call-reaction", { roomId: store.callRoomId, ...last, userId: user.id, userName: user.name });
    }
  }, [store.activeReactions.length]); // eslint-disable-line

  // Start speaking detection
  useEffect(() => {
    if (store.localStream && store.isCalling) startSpeakingDetection(store.localStream);
    return () => { if (!store.isCalling) { speakingCleanupRef.current?.(); speakingCleanupRef.current = null; } };
  }, [store.localStream, store.isCalling, startSpeakingDetection]);

  return (
    <>
      {children}
      <AnimatePresence>
        {store.incomingCall && <CallModal />}
      </AnimatePresence>
      <AnimatePresence>
        {store.isSummaryVisible && (
          <CallSummaryModal onClose={() => store.setSummaryVisible(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {store.isCalling && <CallShell onEndCall={endCall} />}
      </AnimatePresence>
    </>
  );
}
