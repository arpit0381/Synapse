import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── POST /api/bookmarks ──────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { user_id, message_id } = req.body;
  if (!user_id || !message_id) {
    res.status(400).json({ error: "user_id and message_id required" });
    return;
  }

  // Toggle: if exists → remove, else → add
  const { data: existing } = await supabaseAdmin
    .from("bookmarks")
    .select("id")
    .eq("user_id", user_id)
    .eq("message_id", message_id)
    .single();

  if (existing) {
    await supabaseAdmin.from("bookmarks").delete().eq("id", existing.id);
    res.json({ action: "removed" });
  } else {
    const { error } = await supabaseAdmin
      .from("bookmarks")
      .insert({ user_id, message_id });
    if (error) { res.status(400).json({ error: error.message }); return; }
    res.json({ action: "added" });
  }
});

// ── GET /api/bookmarks?user_id= ──────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const { user_id } = req.query as Record<string, string>;
  if (!user_id) { res.status(400).json({ error: "user_id required" }); return; }

  const { data, error } = await supabaseAdmin
    .from("bookmarks")
    .select(`
      id, created_at,
      messages:message_id (
        id, content, content_type, created_at,
        profiles:user_id ( id, full_name, avatar_url ),
        channels:channel_id ( id, name, workspace_id )
      )
    `)
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ bookmarks: data || [] });
});

// ── DELETE /api/bookmarks/:id ────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin
    .from("bookmarks")
    .delete()
    .eq("id", req.params.id);

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ success: true });
});

export default router;
