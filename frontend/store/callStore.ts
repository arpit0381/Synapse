import { create } from "zustand";

export interface CallParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
}

export interface IncomingCall {
  fromUserId: string;
  fromUserName: string;
  type: "video" | "audio";
  callRoomId: string;
  isGroupCall: boolean;
  channelName?: string;
}

export interface ActiveGroupCallInfo {
  channelName: string;
  participantCount: number;
  participants: { id: string; name: string }[];
}

export interface CallState {
  isCalling: boolean;
  callRoomId: string | null;
  callType: "video" | "audio";
  isGroupCall: boolean;
  channelName: string | null;
  incomingCall: IncomingCall | null;

  // Media
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;

  // Controls
  isMuted: boolean;
  isCameraOn: boolean;
  isDeafened: boolean;

  // Participants (keyed by userId)
  participants: Record<string, CallParticipant>;
  speakingUserIds: Set<string>;

  // For channel chat join banner
  activeGroupCalls: Record<string, ActiveGroupCallInfo>;

  // Actions
  setCalling: (p: {
    isCalling: boolean;
    roomId: string | null;
    isGroupCall?: boolean;
    callType?: "video" | "audio";
    channelName?: string;
  }) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleDeafen: () => void;
  upsertParticipant: (p: Partial<CallParticipant> & { id: string; name: string }) => void;
  removeParticipant: (userId: string) => void;
  setParticipantMuted: (userId: string, isMuted: boolean) => void;
  setParticipantSpeaking: (userId: string, isSpeaking: boolean) => void;
  setActiveGroupCall: (roomId: string, info: ActiveGroupCallInfo | null) => void;
  removeActiveGroupCall: (roomId: string) => void;
  resetCallState: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  isCalling: false,
  callRoomId: null,
  callType: "audio",
  isGroupCall: false,
  channelName: null,
  incomingCall: null,
  localStream: null,
  remoteStreams: {},
  isMuted: false,
  isCameraOn: true,
  isDeafened: false,
  participants: {},
  speakingUserIds: new Set<string>(),
  activeGroupCalls: {},

  setCalling: ({ isCalling, roomId, isGroupCall = false, callType = "audio", channelName = null }) =>
    set({ isCalling, callRoomId: roomId, isGroupCall, callType, channelName }),

  setIncomingCall: (call) => set({ incomingCall: call }),

  setLocalStream: (stream) => set({ localStream: stream }),

  addRemoteStream: (userId, stream) =>
    set((s) => ({ remoteStreams: { ...s.remoteStreams, [userId]: stream } })),

  removeRemoteStream: (userId) =>
    set((s) => {
      const r = { ...s.remoteStreams };
      delete r[userId];
      return { remoteStreams: r };
    }),

  toggleMute: () =>
    set((s) => {
      const next = !s.isMuted;
      s.localStream?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return { isMuted: next };
    }),

  toggleCamera: () =>
    set((s) => {
      const next = !s.isCameraOn;
      s.localStream?.getVideoTracks().forEach((t) => { t.enabled = next; });
      return { isCameraOn: next };
    }),

  toggleDeafen: () =>
    set((s) => {
      const next = !s.isDeafened;
      if (next && !s.isMuted) {
        s.localStream?.getAudioTracks().forEach((t) => { t.enabled = false; });
        return { isDeafened: true, isMuted: true };
      }
      return { isDeafened: next };
    }),

  upsertParticipant: (p) =>
    set((s) => {
      const existing = s.participants[p.id] || { isMuted: false, isSpeaking: false };
      return {
        participants: {
          ...s.participants,
          [p.id]: { ...existing, ...p },
        },
      };
    }),

  removeParticipant: (userId) =>
    set((s) => {
      const p = { ...s.participants };
      delete p[userId];
      return { participants: p };
    }),

  setParticipantMuted: (userId, isMuted) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [userId]: { ...s.participants[userId], isMuted },
      },
    })),

  setParticipantSpeaking: (userId, isSpeaking) => {
    set((s) => {
      const next = new Set(s.speakingUserIds);
      isSpeaking ? next.add(userId) : next.delete(userId);
      return {
        speakingUserIds: next,
        participants: {
          ...s.participants,
          [userId]: { ...s.participants[userId], isSpeaking },
        },
      };
    });
  },

  setActiveGroupCall: (roomId, info) =>
    set((s) => {
      const calls = { ...s.activeGroupCalls };
      if (info === null) delete calls[roomId];
      else calls[roomId] = info;
      return { activeGroupCalls: calls };
    }),

  removeActiveGroupCall: (roomId) =>
    set((s) => {
      const calls = { ...s.activeGroupCalls };
      delete calls[roomId];
      return { activeGroupCalls: calls };
    }),

  resetCallState: () =>
    set({
      isCalling: false,
      callRoomId: null,
      callType: "audio",
      isGroupCall: false,
      channelName: null,
      incomingCall: null,
      localStream: null,
      remoteStreams: {},
      isMuted: false,
      isCameraOn: true,
      isDeafened: false,
      participants: {},
      speakingUserIds: new Set<string>(),
    }),
}));
