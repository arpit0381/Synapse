import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── GET /api/channels/:id/pins ───────────────────────────────────────
router.get("/:id/pins", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("channel_pins")
    .select(`
      id, pinned_at,
      pinned_by_profile:pinned_by ( id, full_name, avatar_url ),
      messages:message_id (
        id, content, content_type, created_at,
        profiles:user_id ( id, full_name, avatar_url )
      )
    `)
    .eq("channel_id", req.params.id)
    .order("pinned_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ pins: data || [] });
});

// ── POST /api/channels/:id/pins ──────────────────────────────────────
router.post("/:id/pins", async (req: Request, res: Response) => {
  const { message_id, pinned_by } = req.body;
  if (!message_id) { res.status(400).json({ error: "message_id required" }); return; }

  // Check max 10 pins per channel
  const { count } = await supabaseAdmin
    .from("channel_pins")
    .select("*", { count: "exact", head: true })
    .eq("channel_id", req.params.id);

  if (count && count >= 10) {
    res.status(400).json({ error: "Maximum 10 pins per channel. Unpin one first." });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("channel_pins")
    .insert({ channel_id: req.params.id, message_id, pinned_by })
    .select()
    .single();

  if (error) {
    if (error.message.includes("unique")) {
      res.status(400).json({ error: "Message is already pinned" });
    } else {
      res.status(400).json({ error: error.message });
    }
    return;
  }

  res.status(201).json({ pin: data });
});

// ── DELETE /api/channels/:id/pins/:messageId ─────────────────────────
router.delete("/:id/pins/:messageId", async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin
    .from("channel_pins")
    .delete()
    .eq("channel_id", req.params.id)
    .eq("message_id", req.params.messageId);

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
