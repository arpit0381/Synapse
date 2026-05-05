import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

import authRouter from "./routes/auth";
import workspaceRouter from "./routes/workspace";
import channelRouter from "./routes/channels";
import messageRouter from "./routes/messages";
import taskRouter from "./routes/tasks";
import dmRouter from "./routes/dm";
import aiRouter from "./routes/ai";
import fileRouter from "./routes/files";
import searchRouter from "./routes/search";
import notificationRouter from "./routes/notifications";
import analyticsRouter from "./routes/analytics";
import profileRouter from "./routes/profiles";
import bookmarkRouter from "./routes/bookmarks";
import pinRouter from "./routes/pins";
import { supabaseAdmin } from "./lib/supabase";

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────────────
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Always allow localhost
    if (origin.startsWith("http://localhost:")) return callback(null, true);
    
    // Allow any vercel deployment for this project
    if (origin.includes("vercel.app")) return callback(null, true);
    
    // Allow explicit FRONTEND_URL
    if (process.env.FRONTEND_URL && origin.startsWith(process.env.FRONTEND_URL.replace(/\/$/, ""))) {
      return callback(null, true);
    }
    
    // If we get here, log it so we can debug, but let's be lenient during development
    console.warn(`[CORS] Unknown origin requested: ${origin}`);
    callback(null, true); // Change to false in strict production
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));

// ── Socket.io ─────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { 
    origin: true, // Dynamically allow origin (handled by Express CORS mostly, but this allows Socket.io to accept any origin in dev/beta)
    methods: ["GET", "POST"], 
    credentials: true 
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Shared server-level state ──────────────────────────────────────
// Track online users per workspace: workspaceId → Set<userId>
const onlineUsers = new Map<string, Set<string>>();

// Track active call rooms: roomId → Map<userId, { userName, socketId }>
interface CallParticipant { userName: string; socketId: string }
const activeCallRooms = new Map<string, Map<string, CallParticipant>>();

// Track roomId metadata: roomId → { channelName, workspaceId, initiatorName, initiatorId }
interface CallMeta { channelName: string; workspaceId?: string; initiatorName: string; initiatorId: string }
const activeCallMeta = new Map<string, CallMeta>();

// ── Phase 7: Presence Map ──────────────────────────────────────────
interface PresenceInfo {
  status: "online" | "away" | "dnd" | "offline" | "invisible";
  statusText: string;
  statusEmoji: string;
  lastSeen: number;
  socketId: string;
}
const presenceMap = new Map<string, PresenceInfo>();

// Presence timeout check — every 15s, mark stale users as offline
setInterval(() => {
  const now = Date.now();
  presenceMap.forEach((info, userId) => {
    if (now - info.lastSeen > 60000 && info.status !== "offline" && info.status !== "invisible") {
      info.status = "offline";
      // Find their workspace to broadcast
      onlineUsers.forEach((userSet, wsId) => {
        if (userSet.has(userId)) {
          io.to(`workspace:${wsId}`).emit("presence:update", {
            userId,
            status: "offline",
            statusText: info.statusText,
            statusEmoji: info.statusEmoji,
          });
        }
      });
    }
  });
}, 15000);

// ── Socket Connection ──────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ── Join workspace ──────────────────────────────────────────────
  socket.on("join_workspace", ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
    socket.join(`workspace:${workspaceId}`);
    socket.join(`user:${userId}`);
    socket.data.workspaceId = workspaceId;
    socket.data.userId = userId;

    if (!onlineUsers.has(workspaceId)) onlineUsers.set(workspaceId, new Set());
    onlineUsers.get(workspaceId)!.add(userId);

    // Update presence
    const existing = presenceMap.get(userId);
    const newStatus = existing?.status === "dnd" ? "dnd" : (existing?.status === "invisible" ? "invisible" : "online");
    presenceMap.set(userId, {
      status: newStatus,
      statusText: existing?.statusText || "",
      statusEmoji: existing?.statusEmoji || "",
      lastSeen: Date.now(),
      socketId: socket.id,
    });

    io.to(`workspace:${workspaceId}`).emit("user_online", { userId });
    io.to(`workspace:${workspaceId}`).emit("presence:update", {
      userId,
      status: newStatus,
      statusText: existing?.statusText || "",
      statusEmoji: existing?.statusEmoji || "",
    });
    
    socket.emit("online_users", { users: Array.from(onlineUsers.get(workspaceId)!) });

    // Send current presence map for workspace
    const presenceData: Record<string, { status: string; statusText: string; statusEmoji: string }> = {};
    onlineUsers.get(workspaceId)?.forEach((uid) => {
      const p = presenceMap.get(uid);
      if (p) {
        presenceData[uid] = { status: p.status, statusText: p.statusText, statusEmoji: p.statusEmoji };
      }
    });
    socket.emit("presence:sync", presenceData);
    
    // Sync active calls in this workspace
    activeCallMeta.forEach((meta, roomId) => {
      if (meta.workspaceId === workspaceId) {
        const room = activeCallRooms.get(roomId);
        socket.emit("call-started", {
          roomId,
          channelName: meta.channelName,
          initiatorName: meta.initiatorName,
          initiatorId: meta.initiatorId,
          count: room?.size || 0,
          participants: room ? Array.from(room.entries()).map(([uid, info]) => ({ id: uid, name: info.userName })) : [],
        });
      }
    });

    console.log(`[Socket] ${userId} joined workspace ${workspaceId}`);
  });

  // ── Join channel ───────────────────────────────────────────────
  socket.on("join_channel", ({ channelId }: { channelId: string }) => {
    socket.join(`channel:${channelId}`);

    // If there's an active call in this channel, notify the joining socket
    const room = activeCallRooms.get(channelId);
    const meta = activeCallMeta.get(channelId);
    if (room && room.size > 0 && meta) {
      socket.emit("call-started", {
        roomId: channelId,
        channelName: meta.channelName,
        initiatorName: meta.initiatorName,
        initiatorId: meta.initiatorId,
        count: room.size,
        participants: Array.from(room.entries()).map(([uid, info]) => ({ id: uid, name: info.userName })),
      });
    }
  });

  // ── New message ────────────────────────────────────────────────
  socket.on("send_message", (msg: {
    id: string; channelId: string; userId: string; userName: string;
    content: string; timestamp: string;
  }) => {
    io.to(`channel:${msg.channelId}`).emit("new_message", msg);

    // Parse @mentions and create notifications
    parseMentionsAndNotify(msg.content, msg.userId, msg.userName, msg.channelId);
  });

  // ── Typing indicator ───────────────────────────────────────────
  socket.on("typing_start", ({ channelId, userId, userName }: { channelId: string; userId: string; userName: string }) => {
    socket.to(`channel:${channelId}`).emit("user_typing", { userId, userName });
  });

  socket.on("typing_stop", ({ channelId, userId }: { channelId: string; userId: string }) => {
    socket.to(`channel:${channelId}`).emit("user_stopped_typing", { userId });
  });

  // ── Reaction ───────────────────────────────────────────────────
  socket.on("add_reaction", ({ messageId, channelId, emoji, userId }: { messageId: string; channelId: string; emoji: string; userId: string }) => {
    io.to(`channel:${channelId}`).emit("reaction_added", { messageId, emoji, userId });
  });

  // ── DM ─────────────────────────────────────────────────────────
  socket.on("send_dm", (msg: { id: string; toUserId: string; fromUserId: string; content: string; timestamp: string }) => {
    io.to(`user:${msg.toUserId}`).emit("new_dm", msg);
  });

  socket.on("join_dm", ({ userId }: { userId: string }) => {
    socket.join(`user:${userId}`);
  });

  socket.on("dm_typing_start", ({ toUserId, userId }: { toUserId: string; userId: string }) => {
    io.to(`user:${toUserId}`).emit("user_typing", { userId, channelId: `dm_${userId}` });
  });

  socket.on("dm_typing_stop", ({ toUserId, userId }: { toUserId: string; userId: string }) => {
    io.to(`user:${toUserId}`).emit("user_stopped_typing", { userId, channelId: `dm_${userId}` });
  });

  socket.on("dm_reading_start", ({ toUserId, userId }: { toUserId: string; userId: string }) => {
    io.to(`user:${toUserId}`).emit("user_reading", { userId, channelId: `dm_${userId}` });
  });

  socket.on("dm_reading_stop", ({ toUserId, userId }: { toUserId: string; userId: string }) => {
    io.to(`user:${toUserId}`).emit("user_stopped_reading", { userId, channelId: `dm_${userId}` });
  });

  // ── Phase 7: Presence Heartbeat ────────────────────────────────
  socket.on("presence:heartbeat", ({ userId }: { userId: string }) => {
    const existing = presenceMap.get(userId);
    if (existing) {
      existing.lastSeen = Date.now();
      if (existing.status === "offline") {
        existing.status = "online";
        // Broadcast status change
        onlineUsers.forEach((userSet, wsId) => {
          if (userSet.has(userId)) {
            io.to(`workspace:${wsId}`).emit("presence:update", {
              userId,
              status: "online",
              statusText: existing.statusText,
              statusEmoji: existing.statusEmoji,
            });
          }
        });
      }
    }
  });

  // ── Phase 7: Manual Status Change ─────────────────────────────
  socket.on("presence:status", ({ userId, status, statusText, statusEmoji }: {
    userId: string;
    status: "online" | "away" | "dnd" | "offline" | "invisible";
    statusText?: string;
    statusEmoji?: string;
  }) => {
    const existing = presenceMap.get(userId);
    presenceMap.set(userId, {
      status,
      statusText: statusText ?? existing?.statusText ?? "",
      statusEmoji: statusEmoji ?? existing?.statusEmoji ?? "",
      lastSeen: Date.now(),
      socketId: socket.id,
    });

    // Broadcast to all workspaces the user is in
    onlineUsers.forEach((userSet, wsId) => {
      if (userSet.has(userId)) {
        io.to(`workspace:${wsId}`).emit("presence:update", {
          userId,
          status: status === "invisible" ? "offline" : status,
          statusText: statusText ?? existing?.statusText ?? "",
          statusEmoji: statusEmoji ?? existing?.statusEmoji ?? "",
        });
      }
    });

    // Persist status to DB
    supabaseAdmin
      .from("profiles")
      .update({
        status,
        status_text: statusText ?? "",
        status_emoji: statusEmoji ?? "",
      })
      .eq("id", userId)
      .then(() => {});
  });

  // ── Phase 6: Thread rooms ─────────────────────────────────────
  socket.on("join_thread", ({ messageId }: { messageId: string }) => {
    socket.join(`thread:${messageId}`);
  });

  socket.on("leave_thread", ({ messageId }: { messageId: string }) => {
    socket.leave(`thread:${messageId}`);
  });

  // ── Phase 10: Poll vote updates ───────────────────────────────
  socket.on("poll:vote", ({ messageId, channelId }: { messageId: string; channelId: string }) => {
    io.to(`channel:${channelId}`).emit("poll:updated", { messageId });
  });

  // ── WebRTC Signaling ────────────────────────────────────────────
  socket.on("call-user", ({ userToCall, fromUserId, fromUserName, type, isGroupCall, callRoomId, channelName }: any) => {
    io.to(`user:${userToCall}`).emit("incoming-call", {
      fromUserId, fromUserName, type, isGroupCall, callRoomId, channelName,
    });
  });

  socket.on("accept-call", ({ toUserId, fromUserId, fromUserName }: any) => {
    io.to(`user:${toUserId}`).emit("accept-call", { fromUserId, fromUserName });
  });

  socket.on("reject-call", ({ toUserId, fromUserId }: any) => {
    io.to(`user:${toUserId}`).emit("reject-call", { fromUserId });
  });

  socket.on("offer", ({ toUserId, fromUserId, offer }: any) => {
    io.to(`user:${toUserId}`).emit("offer", { fromUserId, offer });
  });

  socket.on("answer", ({ toUserId, fromUserId, answer }: any) => {
    io.to(`user:${toUserId}`).emit("answer", { fromUserId, answer });
  });

  socket.on("ice-candidate", ({ toUserId, fromUserId, candidate }: any) => {
    io.to(`user:${toUserId}`).emit("ice-candidate", { fromUserId, candidate });
  });

  // ── Join a call room (group) ────────────────────────────────────
  socket.on("join-call", ({ roomId, userId, userName, channelName, workspaceId }: any) => {
    socket.join(`call:${roomId}`);
    socket.data.callRoomId = roomId;
    socket.data.callUserId = userId;
    socket.data.callUserName = userName;

    if (!activeCallRooms.has(roomId)) {
      activeCallRooms.set(roomId, new Map());
    }
    const room = activeCallRooms.get(roomId)!;
    const isFirst = room.size === 0;

    // Store participant
    room.set(userId, { userName, socketId: socket.id });
    
    if (isFirst) {
      activeCallMeta.set(roomId, { 
        channelName: channelName || "General", 
        workspaceId,
        initiatorName: userName,
        initiatorId: userId
      });
    }

    const meta = activeCallMeta.get(roomId);
    
    // Store workspace context in socket for disconnect handling
    if (workspaceId) socket.data.workspaceId = workspaceId;

    // Get existing users for the new joiner
    const existingUsers = Array.from(room.entries())
      .filter(([uid]) => uid !== userId)
      .map(([uid, info]) => ({ id: uid, name: info.userName }));

    socket.emit("call-room-users", { roomId, users: existingUsers });
    socket.to(`call:${roomId}`).emit("user-joined-call", { userId, userName });

    // Broadcast to channel AND workspace
    const updateData = {
      roomId,
      channelName: meta?.channelName || channelName || "",
      initiatorName: meta?.initiatorName || userName,
      initiatorId: meta?.initiatorId || userId,
      count: room.size,
      participants: Array.from(room.entries()).map(([uid, info]) => ({ id: uid, name: info.userName })),
    };

    if (isFirst) {
      const startMsg = {
        id: `sys_${Date.now()}`,
        channelId: roomId,
        userId: "system",
        userName: "System",
        content: `📞 **${userName}** started a call`,
        timestamp: new Date().toISOString(),
        type: "system"
      };
      io.to(`channel:${roomId}`).emit("new_message", startMsg);
      
      io.to(`channel:${roomId}`).emit("call-started", updateData);
      if (workspaceId) io.to(`workspace:${workspaceId}`).emit("call-started", updateData);
    }
    
    io.to(`channel:${roomId}`).emit("call-participants-update", updateData);
    if (workspaceId) io.to(`workspace:${workspaceId}`).emit("call-participants-update", updateData);

    console.log(`[Call] ${userName} joined call room ${roomId} in workspace ${workspaceId}`);
  });

  // ── Leave a call room ──────────────────────────────────────────
  socket.on("leave-call", ({ roomId, userId }: any) => {
    leaveCallRoom(roomId, userId);
  });

  // ── Mute state broadcast ───────────────────────────────────────
  socket.on("call-mute-update", ({ roomId, userId, isMuted }: any) => {
    socket.to(`call:${roomId}`).emit("call-mute-update", { userId, isMuted });
  });

  // ── Speaking detection broadcast ──────────────────────────────
  socket.on("call-speaking", ({ roomId, userId, isSpeaking }: any) => {
    socket.to(`call:${roomId}`).emit("call-speaking", { userId, isSpeaking });
  });

  // ── Screen share state broadcast ──────────────────────────────
  socket.on("call-screen-share", ({ roomId, userId, isSharing }: any) => {
    io.to(`call:${roomId}`).emit("call-screen-share", { userId, isSharing });
  });

  // ── Disconnect ─────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const { workspaceId, userId, callRoomId, callUserId, callUserName } = socket.data;

    // Clean up online status
    if (workspaceId && userId) {
      const ws = onlineUsers.get(workspaceId);
      if (ws) { ws.delete(userId); if (ws.size === 0) onlineUsers.delete(workspaceId); }
      io.to(`workspace:${workspaceId}`).emit("user_offline", { userId });

      // Update presence
      const p = presenceMap.get(userId);
      if (p) {
        p.status = "offline";
        io.to(`workspace:${workspaceId}`).emit("presence:update", {
          userId,
          status: "offline",
          statusText: p.statusText,
          statusEmoji: p.statusEmoji,
        });
      }
    }

    // Clean up call room
    if (callRoomId && callUserId) {
      leaveCallRoom(callRoomId, callUserId, callUserName);
    }

    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });

  // ── Helper: remove user from call room ─────────────────────────
  function leaveCallRoom(roomId: string, userId: string, userName?: string) {
    const room = activeCallRooms.get(roomId);
    if (!room || !room.has(userId)) return;

    const uName = userName || room.get(userId)?.userName || "User";
    const workspaceId = socket.data.workspaceId;

    room.delete(userId);
    socket.leave(`call:${roomId}`);
    socket.data.callRoomId = null;

    // Notify remaining call peers
    io.to(`call:${roomId}`).emit("user-left-call", { userId });

    if (room.size === 0) {
      activeCallRooms.delete(roomId);
      activeCallMeta.delete(roomId);
      
      const endMsg = {
        id: `sys_${Date.now()}`,
        channelId: roomId,
        userId: "system",
        userName: "System",
        content: `☎️ Call ended`,
        timestamp: new Date().toISOString(),
        type: "system"
      };
      io.to(`channel:${roomId}`).emit("new_message", endMsg);

      // Notify channel AND workspace that call ended
      io.to(`channel:${roomId}`).emit("call-ended", { roomId });
      if (workspaceId) io.to(`workspace:${workspaceId}`).emit("call-ended", { roomId });
      
      console.log(`[Call] Room ${roomId} ended`);
    } else {
      const updateData = {
        roomId,
        count: room.size,
        participants: Array.from(room.entries()).map(([uid, info]) => ({ id: uid, name: info.userName })),
      };
      io.to(`channel:${roomId}`).emit("call-participants-update", updateData);
      if (workspaceId) io.to(`workspace:${workspaceId}`).emit("call-participants-update", updateData);
      
      console.log(`[Call] ${userId} left room ${roomId} (${room.size} remaining)`);
    }
  }

  // ── Helper: Parse @mentions and create notifications ───────────
  async function parseMentionsAndNotify(content: string, senderId: string, senderName: string, channelId: string) {
    const mentionRegex = /@(\w[\w.]*\w|\w)/g;
    const mentions = content.match(mentionRegex);
    if (!mentions || mentions.length === 0) return;

    try {
      // Get channel to find workspace + channel name
      const { data: channel } = await supabaseAdmin
        .from("channels")
        .select("workspace_id, name")
        .eq("id", channelId)
        .single();

      if (!channel) return;

      const channelName = channel.name || "a channel";

      // Get workspace members
      const { data: members } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id, profiles ( id, full_name, username )")
        .eq("workspace_id", channel.workspace_id);

      if (!members) return;

      // Track already-notified users to avoid duplicates
      const notifiedUserIds = new Set<string>();

      for (const mention of mentions) {
        const name = mention.slice(1).toLowerCase(); // remove @

        // Handle @everyone and @channel — notify all members in the channel
        if (name === "everyone" || name === "channel") {
          for (const member of members) {
            if (member.user_id === senderId || notifiedUserIds.has(member.user_id)) continue;
            notifiedUserIds.add(member.user_id);

            await supabaseAdmin.from("notifications").insert({
              user_id: member.user_id,
              workspace_id: channel.workspace_id,
              type: "mention",
              title: `${senderName} mentioned @${name} in #${channelName}`,
              body: content.slice(0, 120),
              link: `/channels/${channelId}`,
              metadata: { sender_id: senderId, channel_id: channelId, mention_type: name },
            });

            io.to(`user:${member.user_id}`).emit("notification:mention", {
              type: "mention",
              title: `${senderName} mentioned @${name}`,
              body: content.slice(0, 120),
              channelName,
              channelId,
              senderName,
              senderId,
              mentionType: name,
            });

            // Also emit generic notification:new
            io.to(`user:${member.user_id}`).emit("notification:new", {
              type: "mention",
              title: `${senderName} mentioned @${name} in #${channelName}`,
              body: content.slice(0, 120),
              link: `/channels/${channelId}`,
            });
          }
          continue;
        }

        // Individual user mention
        const targetMember = members.find((m: any) => {
          const p = m.profiles;
          if (!p) return false;
          const fullName = (p.full_name || "").toLowerCase();
          const username = (p.username || "").toLowerCase();
          return fullName === name || username === name ||
                 fullName.includes(name) || username.includes(name);
        });

        if (targetMember && targetMember.user_id !== senderId && !notifiedUserIds.has(targetMember.user_id)) {
          notifiedUserIds.add(targetMember.user_id);

          // Insert notification to DB
          await supabaseAdmin.from("notifications").insert({
            user_id: targetMember.user_id,
            workspace_id: channel.workspace_id,
            type: "mention",
            title: `${senderName} mentioned you in #${channelName}`,
            body: content.slice(0, 120),
            link: `/channels/${channelId}`,
            metadata: { sender_id: senderId, channel_id: channelId, mention_type: "user" },
          });

          // Emit rich mention notification for toast
          io.to(`user:${targetMember.user_id}`).emit("notification:mention", {
            type: "mention",
            title: `${senderName} tagged you`,
            body: content.slice(0, 120),
            channelName,
            channelId,
            senderName,
            senderId,
            mentionType: "user",
          });

          // Also emit generic notification:new for badge count
          io.to(`user:${targetMember.user_id}`).emit("notification:new", {
            type: "mention",
            title: `${senderName} mentioned you in #${channelName}`,
            body: content.slice(0, 120),
            link: `/channels/${channelId}`,
          });
        }
      }

      console.log(`[Mentions] Processed ${mentions.length} mention(s) from ${senderName} in #${channelName}, notified ${notifiedUserIds.size} user(s)`);
    } catch (err) {
      console.error("[Mentions] Error parsing mentions:", err);
    }
  }
});

// ── REST Routes ───────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/channels", channelRouter);
app.use("/api/messages", messageRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/dm", dmRouter);
app.use("/api/ai", aiRouter);
app.use("/api/files", fileRouter);
app.use("/api/search", searchRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/profiles", profileRouter);
app.use("/api/bookmarks", bookmarkRouter);
app.use("/api/pins", pinRouter);

// ── 404 ────────────────────────────────────────────────────────────
app.use((_req, res) => { res.status(404).json({ error: "Route not found" }); });

// ── Error handler ──────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`✅ Synapse backend running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready`);
});

export { io };
