import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── PATCH /api/profiles/:id ──────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  const allowed = ["full_name", "username", "avatar_url", "bio", "status", "status_message", "status_text", "status_emoji", "timezone"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ profile: data });
});

// ── GET /api/profiles/:id ────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) { res.status(404).json({ error: "Profile not found" }); return; }
  res.json({ profile: data });
});

// ── POST /api/profiles/:id/avatar ─────────────────────────────────────
router.post("/:id/avatar", async (req: Request, res: Response) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ error: "filename and contentType required" });
    return;
  }

  const storagePath = `avatars/${req.params.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  try {
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from("workspace-files")
      .createSignedUploadUrl(storagePath);

    if (signError) {
      res.status(500).json({ error: signError.message });
      return;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("workspace-files")
      .getPublicUrl(storagePath);

    // Update profile avatar
    await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: publicUrlData?.publicUrl || "" })
      .eq("id", req.params.id);

    res.json({
      uploadUrl: signedData.signedUrl,
      token: signedData.token,
      publicUrl: publicUrlData?.publicUrl || "",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
