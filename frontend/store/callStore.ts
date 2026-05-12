import { create } from "zustand";

/* ─── Types ─────────────────────────────────────────────────────── */

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
  role?: "admin" | "moderator" | "member" | "guest";
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  networkQuality: "excellent" | "good" | "poor" | "disconnected";
}

export interface IncomingCall {
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
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

export interface CallChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type?: "text" | "system";
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs
}

export interface Poll {
  id: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
}

export interface WhiteboardAction {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  width: number;
  isEraser: boolean;
}

export interface CallReaction {
  id: string;
  userId: string;
  userName: string;
  emoji: string;
  timestamp: number;
}

export type CallLayout = "grid" | "speaker" | "sidebar" | "fullscreen";
export type CallPanel = "chat" | "participants" | "settings" | "polls" | "qa" | "breakout" | "code" | null;

/* ─── Store Interface ───────────────────────────────────────────── */

export interface CallState {
  // ── Core call state
  isCalling: boolean;
  callRoomId: string | null;
  callType: "video" | "audio";
  isGroupCall: boolean;
  channelName: string | null;
  callStartTime: number | null;
  incomingCall: IncomingCall | null;

  // ── Media streams
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteScreenStreams: Record<string, MediaStream>;

  // ── Controls
  isMuted: boolean;
  isCameraOn: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;

  // ── Layout & UI
  layout: CallLayout;
  activePanel: CallPanel;
  pinnedUserId: string | null;
  isMinimized: boolean;
  isWhiteboardActive: boolean;
  isStageMode: boolean;
  requestToSpeak: Set<string>;
  subRoomId: string | null;
  breakoutRooms: Record<string, string[]>; // roomId -> userIds
  backgroundImage: string | null;
  isSummaryVisible: boolean;
  lowDataMode: boolean;

  // ── Participants
  participants: Record<string, CallParticipant>;
  speakingUserIds: Set<string>;

  // ── In-call chat
  chatMessages: CallChatMessage[];
  unreadChatCount: number;

  // ── Reactions
  activeReactions: CallReaction[];

  // ── Polls & Whiteboard
  polls: Poll[];
  whiteboardActions: WhiteboardAction[];

  // ── Recording
  isRecording: boolean;
  recordingStartTime: number | null;
  isPaused: boolean;

  // ── Device settings
  selectedAudioInput: string | null;
  selectedVideoInput: string | null;
  selectedAudioOutput: string | null;
  availableDevices: MediaDeviceInfo[];

  // ── Advanced features
  pushToTalkEnabled: boolean;
  pushToTalkActive: boolean;
  noiseSuppressionEnabled: boolean;
  backgroundBlurEnabled: boolean;

  // ── Network quality
  networkQuality: Record<string, "excellent" | "good" | "poor" | "disconnected">;
  localNetworkQuality: "excellent" | "good" | "poor" | "disconnected";

  // ── Channel banners
  activeGroupCalls: Record<string, ActiveGroupCallInfo>;

  // ── Actions ─────────────────────────────────────────────────────

  // Core
  setCalling: (p: {
    isCalling: boolean;
    roomId: string | null;
    isGroupCall?: boolean;
    callType?: "video" | "audio";
    channelName?: string;
  }) => void;
  setIncomingCall: (call: IncomingCall | null) => void;
  setCallStartTime: (time: number | null) => void;

  // Streams
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  addRemoteScreenStream: (userId: string, stream: MediaStream) => void;
  removeRemoteScreenStream: (userId: string) => void;

  // Controls
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  toggleDeafen: () => void;
  toggleScreenShare: () => void;
  toggleHandRaise: () => void;
  setMuted: (v: boolean) => void;

  // Layout
  setLayout: (layout: CallLayout) => void;
  setActivePanel: (panel: CallPanel) => void;
  setPinnedUser: (userId: string | null) => void;
  setMinimized: (v: boolean) => void;
  setWhiteboardActive: (active: boolean) => void;
  setStageMode: (active: boolean) => void;
  addRequestToSpeak: (userId: string) => void;
  removeRequestToSpeak: (userId: string) => void;
  setSubRoom: (subRoomId: string | null) => void;
  updateBreakoutRooms: (rooms: Record<string, string[]>) => void;
  setBackgroundImage: (url: string | null) => void;
  addTranscript: (text: string) => void;
  setSummaryVisible: (v: boolean) => void;
  setLowDataMode: (active: boolean) => void;

  // Participants
  upsertParticipant: (p: Partial<CallParticipant> & { id: string; name: string }) => void;
  removeParticipant: (userId: string) => void;
  setParticipantMuted: (userId: string, isMuted: boolean) => void;
  setParticipantSpeaking: (userId: string, isSpeaking: boolean) => void;
  setParticipantHandRaised: (userId: string, isRaised: boolean) => void;
  setParticipantScreenSharing: (userId: string, isSharing: boolean) => void;
  setParticipantCameraOn: (userId: string, isCameraOn: boolean) => void;

  // Chat
  addChatMessage: (msg: CallChatMessage) => void;
  clearChatMessages: () => void;
  resetUnreadChat: () => void;

  // Reactions
  addReaction: (reaction: CallReaction) => void;
  removeReaction: (id: string) => void;

  // Polls & Whiteboard
  setPolls: (polls: Poll[]) => void;
  addPoll: (poll: Poll) => void;
  updatePollVote: (pollId: string, optionId: string, userId: string) => void;
  setWhiteboardActions: (actions: WhiteboardAction[]) => void;
  addWhiteboardAction: (action: WhiteboardAction) => void;
  clearWhiteboard: () => void;

  // Recording
  setRecording: (isRecording: boolean) => void;
  setRecordingPaused: (isPaused: boolean) => void;

  // Devices
  setSelectedAudioInput: (deviceId: string) => void;
  setSelectedVideoInput: (deviceId: string) => void;
  setSelectedAudioOutput: (deviceId: string) => void;
  setAvailableDevices: (devices: MediaDeviceInfo[]) => void;

  // Advanced
  setPushToTalk: (enabled: boolean) => void;
  setPushToTalkActive: (active: boolean) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setBackgroundBlur: (enabled: boolean) => void;

  // Network
  setNetworkQuality: (userId: string, quality: "excellent" | "good" | "poor" | "disconnected") => void;
  setLocalNetworkQuality: (quality: "excellent" | "good" | "poor" | "disconnected") => void;

  // Channel banners
  setActiveGroupCall: (roomId: string, info: ActiveGroupCallInfo | null) => void;
  removeActiveGroupCall: (roomId: string) => void;

  // Reset
  resetCallState: () => void;
}

/* ─── Initial State ─────────────────────────────────────────────── */

const initialState = {
  isCalling: false,
  callRoomId: null as string | null,
  callType: "audio" as const,
  isGroupCall: false,
  channelName: null as string | null,
  callStartTime: null as number | null,
  incomingCall: null as IncomingCall | null,
  localStream: null as MediaStream | null,
  screenStream: null as MediaStream | null,
  remoteStreams: {} as Record<string, MediaStream>,
  remoteScreenStreams: {} as Record<string, MediaStream>,
  isMuted: false,
  isCameraOn: true,
  isDeafened: false,
  isScreenSharing: false,
  isHandRaised: false,
  layout: "grid" as CallLayout,
  activePanel: null as CallPanel,
  pinnedUserId: null as string | null,
  isMinimized: false,
  isWhiteboardActive: false,
  isStageMode: false,
  requestToSpeak: new Set<string>(),
  subRoomId: null as string | null,
  breakoutRooms: {} as Record<string, string[]>,
  backgroundImage: null as string | null,
  isSummaryVisible: false,
  lowDataMode: false,
  participants: {} as Record<string, CallParticipant>,
  speakingUserIds: new Set<string>(),
  chatMessages: [] as CallChatMessage[],
  unreadChatCount: 0,
  activeReactions: [] as CallReaction[],
  polls: [] as Poll[],
  whiteboardActions: [] as WhiteboardAction[],
  isRecording: false,
  recordingStartTime: null as number | null,
  isPaused: false,
  selectedAudioInput: null as string | null,
  selectedVideoInput: null as string | null,
  selectedAudioOutput: null as string | null,
  availableDevices: [] as MediaDeviceInfo[],
  pushToTalkEnabled: false,
  pushToTalkActive: false,
  noiseSuppressionEnabled: true,
  backgroundBlurEnabled: false,
  networkQuality: {} as Record<string, "excellent" | "good" | "poor" | "disconnected">,
  localNetworkQuality: "excellent" as const,
  activeGroupCalls: {} as Record<string, ActiveGroupCallInfo>,
};

/* ─── Store ─────────────────────────────────────────────────────── */

export const useCallStore = create<CallState>((set, get) => ({
  ...initialState,

  // ── Core ──────────────────────────────────────────────────────
  setCalling: ({ isCalling, roomId, isGroupCall = false, callType = "audio", channelName = null }) =>
    set({
      isCalling,
      callRoomId: roomId,
      isGroupCall,
      callType,
      channelName,
      isCameraOn: callType === "video",
      callStartTime: isCalling ? Date.now() : null,
    }),

  setIncomingCall: (call) => set({ incomingCall: call }),
  setCallStartTime: (time) => set({ callStartTime: time }),

  // ── Streams ───────────────────────────────────────────────────
  setLocalStream: (stream) => set({ localStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream, isScreenSharing: !!stream }),

  addRemoteStream: (userId, stream) =>
    set((s) => ({ remoteStreams: { ...s.remoteStreams, [userId]: stream } })),

  removeRemoteStream: (userId) =>
    set((s) => {
      const r = { ...s.remoteStreams };
      delete r[userId];
      return { remoteStreams: r };
    }),

  addRemoteScreenStream: (userId, stream) =>
    set((s) => ({ remoteScreenStreams: { ...s.remoteScreenStreams, [userId]: stream } })),

  removeRemoteScreenStream: (userId) =>
    set((s) => {
      const r = { ...s.remoteScreenStreams };
      delete r[userId];
      return { remoteScreenStreams: r };
    }),

  // ── Controls ──────────────────────────────────────────────────
  toggleMute: () =>
    set((s) => {
      const next = !s.isMuted;
      s.localStream?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return { isMuted: next };
    }),

  toggleCamera: async () => {
    const s = get();
    const next = !s.isCameraOn;
    
    if (next && s.localStream && s.localStream.getVideoTracks().length === 0) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (videoTrack) {
          s.localStream.addTrack(videoTrack);
          // Create a new stream object to trigger reference changes in effects
          const newStream = new MediaStream(s.localStream.getTracks());
          set({ localStream: newStream, isCameraOn: true });
          return;
        }
      } catch (e) {
        console.error("Failed to get video track", e);
        return;
      }
    }

    if (s.localStream) {
      s.localStream.getVideoTracks().forEach((t) => { t.enabled = next; });
      // Trigger a shallow update to ensure UI reacts
      set({ isCameraOn: next });
    }
  },

  toggleDeafen: () =>
    set((s) => {
      const next = !s.isDeafened;
      if (next && !s.isMuted) {
        s.localStream?.getAudioTracks().forEach((t) => { t.enabled = false; });
        return { isDeafened: true, isMuted: true };
      }
      return { isDeafened: next };
    }),

  toggleScreenShare: () => set((s) => ({ isScreenSharing: !s.isScreenSharing })),
  toggleHandRaise: () => set((s) => ({ isHandRaised: !s.isHandRaised })),
  setMuted: (v) => {
    const s = get();
    s.localStream?.getAudioTracks().forEach((t) => { t.enabled = !v; });
    set({ isMuted: v });
  },

  // ── Layout ────────────────────────────────────────────────────
  setLayout: (layout) => set({ layout }),
  setActivePanel: (panel) =>
    set((s) => ({
      activePanel: s.activePanel === panel ? null : panel,
      unreadChatCount: panel === "chat" ? 0 : s.unreadChatCount,
    })),
  setPinnedUser: (userId) => set({ pinnedUserId: userId }),
  setMinimized: (v) => set({ isMinimized: v }),
  setWhiteboardActive: (active) => set({ isWhiteboardActive: active }),
  setStageMode: (active) => set({ isStageMode: active }),
  addRequestToSpeak: (userId) => set((s) => {
    const next = new Set(s.requestToSpeak);
    next.add(userId);
    return { requestToSpeak: next };
  }),
  removeRequestToSpeak: (userId) => set((s) => {
    const next = new Set(s.requestToSpeak);
    next.delete(userId);
    return { requestToSpeak: next };
  }),
  setSubRoom: (subRoomId) => set({ subRoomId }),
  updateBreakoutRooms: (rooms) => set({ breakoutRooms: rooms }),
  setBackgroundImage: (url) => set({ backgroundImage: url }),
  addTranscript: (text) => set((s) => ({ chatMessages: [...s.chatMessages, { id: `t_${Date.now()}`, userId: "system", userName: "System", content: text, timestamp: Date.now(), type: "system" }] })), 
  setSummaryVisible: (v) => set({ isSummaryVisible: v }),
  setLowDataMode: (active) => set({ 
    lowDataMode: active,
    isCameraOn: active ? false : get().isCameraOn 
  }),

  // ── Participants ──────────────────────────────────────────────
  upsertParticipant: (p) =>
    set((s) => {
      const existing = s.participants[p.id] || {
        isMuted: false,
        isCameraOn: true,
        isSpeaking: false,
        isHandRaised: false,
        isScreenSharing: false,
        networkQuality: "excellent" as const,
      };
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

  setParticipantSpeaking: (userId, isSpeaking) =>
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
    }),

  setParticipantHandRaised: (userId, isRaised) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [userId]: { ...s.participants[userId], isHandRaised: isRaised },
      },
    })),

  setParticipantScreenSharing: (userId, isSharing) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [userId]: { ...s.participants[userId], isScreenSharing: isSharing },
      },
    })),

  setParticipantCameraOn: (userId, isCameraOn) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [userId]: { ...s.participants[userId], isCameraOn },
      },
    })),

  // ── Chat ──────────────────────────────────────────────────────
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, msg],
      unreadChatCount: s.activePanel === "chat" ? s.unreadChatCount : s.unreadChatCount + 1,
    })),
  clearChatMessages: () => set({ chatMessages: [], unreadChatCount: 0 }),
  resetUnreadChat: () => set({ unreadChatCount: 0 }),

  // ── Reactions ─────────────────────────────────────────────────
  addReaction: (reaction) =>
    set((s) => ({ activeReactions: [...s.activeReactions, reaction] })),
  removeReaction: (id) =>
    set((s) => ({ activeReactions: s.activeReactions.filter((r) => r.id !== id) })),

  // ── Polls & Whiteboard ────────────────────────────────────────
  setPolls: (polls: Poll[]) => set({ polls }),
  addPoll: (poll: Poll) => set((s) => ({ 
    polls: s.polls.some(p => p.id === poll.id) ? s.polls : [poll, ...s.polls] 
  })),
  updatePollVote: (pollId: string, optionId: string, userId: string) =>
    set((s) => ({
      polls: s.polls.map((p: Poll) => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          options: p.options.map((o: PollOption) => {
            const filteredVotes = o.votes.filter((id) => id !== userId);
            if (o.id === optionId) return { ...o, votes: [...filteredVotes, userId] };
            return { ...o, votes: filteredVotes };
          }),
        };
      }),
    })),
  setWhiteboardActions: (actions: WhiteboardAction[]) => set({ whiteboardActions: actions }),
  addWhiteboardAction: (action: WhiteboardAction) => set((s) => ({ whiteboardActions: [...s.whiteboardActions, action] })),
  clearWhiteboard: () => set({ whiteboardActions: [] }),

  // ── Recording ─────────────────────────────────────────────────
  setRecording: (isRecording) =>
    set({
      isRecording,
      recordingStartTime: isRecording ? Date.now() : null,
      isPaused: false,
    }),
  setRecordingPaused: (isPaused) => set({ isPaused }),

  // ── Devices ───────────────────────────────────────────────────
  setSelectedAudioInput: (deviceId) => set({ selectedAudioInput: deviceId }),
  setSelectedVideoInput: (deviceId) => set({ selectedVideoInput: deviceId }),
  setSelectedAudioOutput: (deviceId) => set({ selectedAudioOutput: deviceId }),
  setAvailableDevices: (devices) => set({ availableDevices: devices }),

  // ── Advanced ──────────────────────────────────────────────────
  setPushToTalk: (enabled) => set({ pushToTalkEnabled: enabled }),
  setPushToTalkActive: (active) => {
    const s = get();
    if (s.pushToTalkEnabled) {
      s.localStream?.getAudioTracks().forEach((t) => { t.enabled = active; });
      set({ pushToTalkActive: active, isMuted: !active });
    }
  },
  setNoiseSuppression: (enabled) => set({ noiseSuppressionEnabled: enabled }),
  setBackgroundBlur: (enabled) => set({ backgroundBlurEnabled: enabled }),

  // ── Network ───────────────────────────────────────────────────
  setNetworkQuality: (userId, quality) =>
    set((s) => ({
      networkQuality: { ...s.networkQuality, [userId]: quality },
      participants: s.participants[userId]
        ? { ...s.participants, [userId]: { ...s.participants[userId], networkQuality: quality } }
        : s.participants,
    })),
  setLocalNetworkQuality: (quality) => set({ localNetworkQuality: quality }),

  // ── Channel banners ──────────────────────────────────────────
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

  // ── Reset ─────────────────────────────────────────────────────
  resetCallState: () =>
    set({
      ...initialState,
      activeGroupCalls: get().activeGroupCalls, // preserve banners
      availableDevices: get().availableDevices,  // preserve devices
    }),
}));
