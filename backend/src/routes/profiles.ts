import { Router, Request, Response } from "express";
import crypto from "crypto";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── PATCH /api/profiles/:id ──────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  const allowed = ["full_name", "username", "avatar_url", "bio", "status", "status_message", "status_text", "status_emoji", "timezone", "notification_settings", "appearance_settings"];
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

// ── GET /api/profiles/:id/cloudinary-signature ────────────────────────
router.get("/:id/cloudinary-signature", (req: Request, res: Response) => {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;

  if (!apiSecret || !apiKey) {
    res.status(500).json({ error: "Cloudinary credentials not configured" });
    return;
  }

  const timestamp = Math.round(new Date().getTime() / 1000).toString();
  
  // Cloudinary signature generation
  // 1. Create a string with the parameters to sign
  const paramsToSign: Record<string, string> = {
    timestamp: timestamp,
    folder: `synapse-lite/avatars/${req.params.id}`
  };

  const sortedKeys = Object.keys(paramsToSign).sort();
  const stringToSign = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&');
  
  // 2. Hash it with SHA-1 along with the API secret
  const signature = crypto.createHash('sha1').update(stringToSign + apiSecret).digest('hex');

  res.json({
    signature,
    timestamp,
    apiKey,
    folder: paramsToSign.folder
  });
});

export default router;
