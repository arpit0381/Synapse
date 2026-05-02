import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── GET /api/channels?workspace_id= ───────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const { workspace_id, user_id } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  // Public channels in workspace
  const { data: publicChannels, error: pubErr } = await supabaseAdmin
    .from("channels")
    .select("*")
    .eq("workspace_id", workspace_id)
    .eq("is_private", false)
    .order("name");

  if (pubErr) { res.status(500).json({ error: pubErr.message }); return; }

  // Private channels the user belongs to
  let privateChannels: unknown[] = [];
  if (user_id) {
    const { data: privData } = await supabaseAdmin
      .from("channel_members")
      .select("channels(*)")
      .eq("user_id", user_id)
      .eq("channels.is_private", true)
      .eq("channels.workspace_id", workspace_id);
    privateChannels = (privData || []).map((r: Record<string, unknown>) => r.channels).filter(Boolean);
  }

  res.json({ channels: [...(publicChannels || []), ...privateChannels] });
});

// ── POST /api/channels ─────────────────────────────────────────
const CreateChannelSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(80).transform(s => s.toLowerCase().replace(/\s+/g, "-")),
  description: z.string().max(500).optional(),
  is_private: z.boolean().default(false),
  created_by: z.string().uuid(),
});

router.post("/", async (req: Request, res: Response) => {
  const parse = CreateChannelSchema.safeParse(req.body);
  if (!parse.success) { 
    console.error("Zod Error:", parse.error.flatten());
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() }); 
    return; 
  }

  const { data: channel, error } = await supabaseAdmin
    .from("channels")
    .insert(parse.data)
    .select()
    .single();

  if (error) { 
    console.error("DB Error:", error.message);
    res.status(400).json({ error: error.message }); 
    return; 
  }

  // Auto-add creator as channel member (useful for private channels)
  if (parse.data.is_private) {
    await supabaseAdmin.from("channel_members").insert({
      channel_id: channel.id,
      user_id: parse.data.created_by,
    });
  }

  res.status(201).json({ channel });
});

// ── GET /api/channels/:id ──────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("channels")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) { res.status(404).json({ error: "Channel not found" }); return; }
  res.json({ channel: data });
});

// ── GET /api/channels/:id/members ─────────────────────────────
router.get("/:id/members", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("channel_members")
    .select("last_read_at, joined_at, profiles(*)")
    .eq("channel_id", req.params.id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  const members = data.map((m: Record<string, unknown>) => ({
    ...(m.profiles as Record<string, unknown>),
    last_read_at: m.last_read_at,
    joined_at: m.joined_at,
  }));
  res.json({ members });
});

// ── DELETE /api/channels/:id ───────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin.from("channels").delete().eq("id", req.params.id);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
