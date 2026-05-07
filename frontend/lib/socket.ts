import { io, Socket } from "socket.io-client";

// Use environment variable for production, fallback to localhost for local dev
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Get or create a singleton Socket.io connection.
 * Call this after the user is authenticated.
 */
export function getSocket(token?: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 50,
    });
  } else if (token) {
    socket.auth = { token };
  }
  return socket;
}

/** Connect the socket */
export function connectSocket(token: string): Socket {
  const s = getSocket(token);
  if (!s.connected) s.connect();
  return s;
}

/** Disconnect the socket */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
}

// ── Socket Event Names ──────────────────────────────────────────────
export const SOCKET_EVENTS = {
  MESSAGE_NEW: "message:new",
  MESSAGE_EDITED: "message:edited",
  MESSAGE_DELETED: "message:deleted",
  REACTION_ADDED: "reaction:added",
  REACTION_REMOVED: "reaction:removed",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  TASK_UPDATED: "task:updated",
  NOTIFICATION_NEW: "notification:new",
  CHANNEL_CREATED: "channel:created",
  JOIN_CHANNEL: "channel:join",
  LEAVE_CHANNEL: "channel:leave",
} as const;
