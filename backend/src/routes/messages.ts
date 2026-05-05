import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { io } from "../index";

const router = Router();

// ── GET /api/messages?channel_id=&cursor=&limit= ─────────────
router.get("/", async (req: Request, res: Response) => {
  const { channel_id, cursor, limit = "50" } = req.query as Record<string, string>;
  if (!channel_id) { res.status(400).json({ error: "channel_id required" }); return; }

  let query = supabaseAdmin
    .from("messages")
    .select(`
      id, content, content_type, is_pinned, is_edited, metadata, created_at, updated_at,
      parent_id,
      profiles:user_id ( id, full_name, username, avatar_url, status ),
      reactions:message_reactions ( id, emoji, user_id ),
      thread_count:messages!parent_id ( count )
    `)
    .eq("channel_id", channel_id)
    .is("parent_id", null) // only top-level messages
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json({
    messages: (data || []).reverse(),
    cursor: data && data.length > 0 ? data[data.length - 1]?.created_at : null,
    has_more: data?.length === Number(limit),
  });
});

// ── POST /api/messages ────────────────────────────────────────
const SendMessageSchema = z.object({
  channel_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(4000),
  content_type: z.enum(["text", "image", "file", "system"]).default("text"),
  parent_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  const parse = SendMessageSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid input", details: parse.error.flatten() }); return; }

  const { data: msg, error } = await supabaseAdmin
    .from("messages")
    .insert(parse.data)
    .select(`
      id, channel_id, user_id, content, content_type, is_pinned, is_edited, metadata, created_at, parent_id,
      profiles:user_id ( id, full_name, username, avatar_url, status )
    `)
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }

  // Broadcast via Socket.io so all connected clients get it instantly
  io.to(`channel:${parse.data.channel_id}`).emit("new_message", msg);

  // Parse @mentions and create notifications (fire-and-forget)
  const senderName = (msg as any).profiles?.full_name || (msg as any).profiles?.username || "Someone";
  parseMentionsFromREST(parse.data.content, parse.data.user_id, senderName, parse.data.channel_id).catch(console.error);

  res.status(201).json({ message: msg });
});

// ── Helper: Parse @mentions from REST-sent messages ──────────────
async function parseMentionsFromREST(content: string, senderId: string, senderName: string, channelId: string) {
  const mentionRegex = /@(\w[\w.]*\w|\w)/g;
  const mentions = content.match(mentionRegex);
  if (!mentions || mentions.length === 0) return;

  try {
    const { data: channel } = await supabaseAdmin
      .from("channels")
      .select("workspace_id, name")
      .eq("id", channelId)
      .single();

    if (!channel) return;
    const channelName = channel.name || "a channel";

    const { data: members } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, profiles ( id, full_name, username )")
      .eq("workspace_id", channel.workspace_id);

    if (!members) return;

    const notifiedUserIds = new Set<string>();

    for (const mention of mentions) {
      const name = mention.slice(1).toLowerCase();

      // @everyone / @channel
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
            type: "mention", title: `${senderName} mentioned @${name}`,
            body: content.slice(0, 120), channelName, channelId, senderName, senderId, mentionType: name,
          });
          io.to(`user:${member.user_id}`).emit("notification:new", {
            type: "mention", title: `${senderName} mentioned @${name} in #${channelName}`,
            body: content.slice(0, 120), link: `/channels/${channelId}`,
          });
        }
        continue;
      }

      // Individual mention
      const targetMember = members.find((m: any) => {
        const p = m.profiles;
        if (!p) return false;
        const fn = (p.full_name || "").toLowerCase();
        const un = (p.username || "").toLowerCase();
        return fn === name || un === name || fn.includes(name) || un.includes(name);
      });

      if (targetMember && targetMember.user_id !== senderId && !notifiedUserIds.has(targetMember.user_id)) {
        notifiedUserIds.add(targetMember.user_id);

        await supabaseAdmin.from("notifications").insert({
          user_id: targetMember.user_id,
          workspace_id: channel.workspace_id,
          type: "mention",
          title: `${senderName} mentioned you in #${channelName}`,
          body: content.slice(0, 120),
          link: `/channels/${channelId}`,
          metadata: { sender_id: senderId, channel_id: channelId, mention_type: "user" },
        });

        io.to(`user:${targetMember.user_id}`).emit("notification:mention", {
          type: "mention", title: `${senderName} tagged you`,
          body: content.slice(0, 120), channelName, channelId, senderName, senderId, mentionType: "user",
        });
        io.to(`user:${targetMember.user_id}`).emit("notification:new", {
          type: "mention", title: `${senderName} mentioned you in #${channelName}`,
          body: content.slice(0, 120), link: `/channels/${channelId}`,
        });
      }
    }

    console.log(`[Mentions/REST] Processed ${mentions.length} mention(s) in #${channelName}, notified ${notifiedUserIds.size} user(s)`);
  } catch (err) {
    console.error("[Mentions/REST] Error:", err);
  }
}

// ── GET /api/messages/:id/thread ─────────────────────────────
router.get("/:id/thread", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select(`
      id, content, content_type, metadata, created_at, updated_at,
      profiles:user_id ( id, full_name, username, avatar_url, status ),
      reactions:message_reactions ( id, emoji, user_id )
    `)
    .eq("parent_id", req.params.id)
    .order("created_at", { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ thread: data || [] });
});

// ── PATCH /api/messages/:id ───────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .update({ content, is_edited: true })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ message: data });
});

// ── DELETE /api/messages/:id ──────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin.from("messages").delete().eq("id", req.params.id);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ success: true, id: req.params.id });
});

// ── POST /api/messages/:id/reactions ─────────────────────────
router.post("/:id/reactions", async (req: Request, res: Response) => {
  const { user_id, emoji } = req.body;
  if (!user_id || !emoji) { res.status(400).json({ error: "user_id and emoji required" }); return; }

  // Toggle: if reaction exists → remove, else → add
  const { data: existing } = await supabaseAdmin
    .from("message_reactions")
    .select("id")
    .eq("message_id", req.params.id)
    .eq("user_id", user_id)
    .eq("emoji", emoji)
    .single();

  // Fetch message to get channel_id for broadcasting
  const { data: msg } = await supabaseAdmin.from("messages").select("channel_id").eq("id", req.params.id).single();

  if (existing) {
    await supabaseAdmin.from("message_reactions").delete().eq("id", existing.id);
    if (msg) io.to(`channel:${msg.channel_id}`).emit("reaction_removed", { messageId: req.params.id, emoji, userId: user_id });
    res.json({ action: "removed" });
  } else {
    await supabaseAdmin.from("message_reactions").insert({ message_id: req.params.id, user_id, emoji });
    if (msg) io.to(`channel:${msg.channel_id}`).emit("reaction_added", { messageId: req.params.id, emoji, userId: user_id });
    res.json({ action: "added" });
  }
});

// ── PATCH /api/messages/:id/pin ───────────────────────────────
router.patch("/:id/pin", async (req: Request, res: Response) => {
  const { is_pinned } = req.body;
  const { data, error } = await supabaseAdmin
    .from("messages")
    .update({ is_pinned: Boolean(is_pinned) })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ message: data });
});

export default router;
