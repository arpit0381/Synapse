import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { io } from "../index";

const router = Router();

// ── GET /api/dm?workspace_id=&user_id=&with= ─────────────────
// Fetch conversation history between two users
router.get("/", async (req: Request, res: Response) => {
  const { workspace_id, user_id, with: withUser, limit = "50", cursor } = req.query as Record<string, string>;
  if (!workspace_id || !user_id || !withUser) {
    res.status(400).json({ error: "workspace_id, user_id, and with are required" });
    return;
  }

  let query = supabaseAdmin
    .from("direct_messages")
    .select(`
      id, content, is_read, is_edited, metadata, created_at,
      sender:from_user_id ( id, full_name, username, avatar_url, status )
    `)
    .eq("workspace_id", workspace_id)
    .or(`and(from_user_id.eq.${user_id},to_user_id.eq.${withUser}),and(from_user_id.eq.${withUser},to_user_id.eq.${user_id})`)
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  // Mark unread messages as read
  await supabaseAdmin
    .from("direct_messages")
    .update({ is_read: true })
    .eq("workspace_id", workspace_id)
    .eq("from_user_id", withUser)
    .eq("to_user_id", user_id)
    .eq("is_read", false);

  res.json({ messages: (data || []).reverse(), has_more: data?.length === Number(limit) });
});

// ── POST /api/dm ─────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { workspace_id, from_user_id, to_user_id, content, metadata } = req.body;
  
  const hasContent = content && content.trim() !== "";
  const hasAttachment = metadata && metadata.attachment;

  if (!workspace_id || !from_user_id || !to_user_id || (!hasContent && !hasAttachment)) {
    res.status(400).json({ error: "workspace_id, from_user_id, to_user_id, and either content or attachment are required" });
    return;
  }

  const { data: msg, error } = await supabaseAdmin
    .from("direct_messages")
    .insert({ workspace_id, from_user_id, to_user_id, content, metadata: metadata || {} })
    .select(`
      id, workspace_id, from_user_id, to_user_id, content, is_read, is_edited, metadata, created_at,
      sender:from_user_id ( id, full_name, username, avatar_url, status )
    `)
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }

  // Push to recipient's socket room
  io.to(`user:${to_user_id}`).emit("new_dm", msg);
  
  // Push to sender's socket room as well (for multi-device sync)
  io.to(`user:${from_user_id}`).emit("new_dm", msg);

  // Safely extract sender name (handle potential array from Supabase join)
  const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
  const senderName = sender?.full_name || sender?.username || "Someone";

  // Insert notification for recipient
  await supabaseAdmin.from("notifications").insert({
    user_id: to_user_id,
    workspace_id,
    type: "dm",
    title: `Message from ${senderName}`,
    body: content.slice(0, 80),
    link: `/dm/${from_user_id}`,
    metadata: { from_user_id, message_id: msg.id, sender_name: senderName, sender_avatar: sender?.avatar_url },
  });

  // Emit rich DM notification for toast
  io.to(`user:${to_user_id}`).emit("notification:dm", {
    type: "dm",
    title: `Message from ${senderName}`,
    body: content.slice(0, 120),
    senderName: senderName,
    senderId: from_user_id,
    messageId: msg.id,
  });

  // Also emit generic notification:new for badge count
  io.to(`user:${to_user_id}`).emit("notification:new", {
    type: "dm",
    title: `New message from ${senderName}`,
    body: content.slice(0, 120),
    link: `/dm/${from_user_id}`,
  });

  res.status(201).json({ message: msg });
});

// ── GET /api/dm/conversations?workspace_id=&user_id= ────────
// List all DM partners for a user (conversation list sidebar)
router.get("/conversations", async (req: Request, res: Response) => {
  const { workspace_id, user_id } = req.query as Record<string, string>;
  if (!workspace_id || !user_id) {
    res.status(400).json({ error: "workspace_id and user_id required" });
    return;
  }

  // Get latest message per conversation
  const { data, error } = await supabaseAdmin.rpc("get_dm_conversations", {
    p_workspace_id: workspace_id,
    p_user_id: user_id,
  });

  if (error) {
    // Fallback: just return workspace members
    const { data: members } = await supabaseAdmin
      .from("workspace_members")
      .select("profiles(*)")
      .eq("workspace_id", workspace_id)
      .neq("user_id", user_id);

    res.json({ conversations: (members || []).map((m: Record<string, unknown>) => m.profiles) });
    return;
  }

  res.json({ conversations: data || [] });
});

// ── PATCH /api/dm/:id/read ───────────────────────────────────
router.patch("/:id/read", async (req: Request, res: Response) => {
  const { data: msg, error } = await supabaseAdmin
    .from("direct_messages")
    .update({ is_read: true })
    .eq("id", req.params.id)
    .select("id, from_user_id, to_user_id")
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }

  // Notify sender that the message was read
  if (msg) {
    io.to(`user:${msg.from_user_id}`).emit("message_read", { messageId: msg.id, toUserId: msg.to_user_id });
  }

  res.json({ success: true, messageId: req.params.id });
});

// ── POST /api/dm/:id/reactions ───────────────────────────────
router.post("/:id/reactions", async (req: Request, res: Response) => {
  const { user_id, emoji } = req.body;
  if (!user_id || !emoji) { res.status(400).json({ error: "user_id and emoji required" }); return; }

  // Fetch current metadata
  const { data: msg, error } = await supabaseAdmin
    .from("direct_messages")
    .select("metadata, from_user_id, to_user_id, workspace_id")
    .eq("id", req.params.id)
    .single();

  if (error || !msg) { res.status(400).json({ error: error?.message || "Message not found" }); return; }

  let metadata = (msg.metadata as any) || {};
  let reactions = metadata.reactions || {};
  let usersForEmoji = reactions[emoji] || [];

  let action = "added";
  if (usersForEmoji.includes(user_id)) {
    // Remove reaction
    usersForEmoji = usersForEmoji.filter((id: string) => id !== user_id);
    action = "removed";
  } else {
    // Add reaction
    usersForEmoji.push(user_id);
  }

  if (usersForEmoji.length === 0) {
    delete reactions[emoji];
  } else {
    reactions[emoji] = usersForEmoji;
  }

  metadata.reactions = reactions;

  const { error: updateError } = await supabaseAdmin
    .from("direct_messages")
    .update({ metadata })
    .eq("id", req.params.id);

  if (updateError) { res.status(400).json({ error: updateError.message }); return; }

  // Broadcast reaction update
  io.to(`user:${msg.from_user_id}`).emit("dm_reaction_updated", { messageId: req.params.id, emoji, userId: user_id, action });
  io.to(`user:${msg.to_user_id}`).emit("dm_reaction_updated", { messageId: req.params.id, emoji, userId: user_id, action });

  res.json({ success: true, action });
});

export default router;
