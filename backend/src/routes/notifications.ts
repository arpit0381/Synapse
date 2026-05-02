import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── GET /api/notifications?user_id=&limit= ──────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const { user_id, limit = "20" } = req.query as Record<string, string>;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Get unread count
  const { count } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id)
    .eq("is_read", false);

  res.json({ notifications: data || [], unread_count: count || 0 });
});

// ── PATCH /api/notifications/read-all ────────────────────────────────
router.patch("/read-all", async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user_id)
    .eq("is_read", false);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────
router.patch("/:id/read", async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .eq("id", req.params.id);

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ── POST /api/notifications/subscribe ────────────────────────────────
router.post("/subscribe", async (req: Request, res: Response) => {
  const { user_id, subscription } = req.body;
  if (!user_id || !subscription) {
    res.status(400).json({ error: "user_id and subscription required" });
    return;
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert({ user_id, subscription }, { onConflict: "user_id,subscription" });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
