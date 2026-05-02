import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── Allowed MIME types ──────────────────────────────────────────────
const ALLOWED_MIME_PATTERNS = [
  /^image\//,
  /^application\/pdf$/,
  /^text\//,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
  /^application\/vnd\.ms-excel$/,
  /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/,
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PATTERNS.some((p) => p.test(mime));
}

// ── POST /api/files/upload-url ──────────────────────────────────────
const UploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  workspaceId: z.string().uuid(),
  channelId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  sizeBytes: z.number().max(MAX_FILE_SIZE).optional(),
});

router.post("/upload-url", async (req: Request, res: Response) => {
  const parse = UploadUrlSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }

  const { filename, contentType, workspaceId, channelId, userId, sizeBytes } = parse.data;

  if (!isAllowedMime(contentType)) {
    res.status(400).json({ error: `File type "${contentType}" is not allowed. Allowed: images, PDF, text, Word, Excel.` });
    return;
  }

  // Generate unique storage path
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${workspaceId}/${channelId || "general"}/${timestamp}_${safeName}`;

  try {
    // Create signed upload URL
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from("workspace-files")
      .createSignedUploadUrl(storagePath);

    if (signError) {
      console.error("[Files] Signed URL error:", signError.message);
      res.status(500).json({ error: "Failed to create upload URL: " + signError.message });
      return;
    }

    // Get the public URL for after upload
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("workspace-files")
      .getPublicUrl(storagePath);

    // Insert file metadata
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from("files")
      .insert({
        workspace_id: workspaceId,
        uploaded_by: userId,
        channel_id: channelId || null,
        name: filename,
        size_bytes: sizeBytes || 0,
        mime_type: contentType,
        storage: "supabase",
        storage_id: storagePath,
        url: publicUrlData?.publicUrl || "",
      })
      .select()
      .single();

    if (dbError) {
      console.error("[Files] DB insert error:", dbError.message);
      res.status(500).json({ error: "Failed to record file metadata" });
      return;
    }

    res.json({
      uploadUrl: signedData.signedUrl,
      token: signedData.token,
      path: storagePath,
      publicUrl: publicUrlData?.publicUrl || "",
      file: fileRecord,
    });
  } catch (err: any) {
    console.error("[Files] Upload URL error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/files?workspace_id=&type=&uploaded_by=&search= ─────────
router.get("/", async (req: Request, res: Response) => {
  const { workspace_id, type, uploaded_by, search, limit = "50" } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  let query = supabaseAdmin
    .from("files")
    .select(`
      *,
      uploader:uploaded_by ( id, full_name, username, avatar_url )
    `)
    .eq("workspace_id", workspace_id)
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (type === "images") {
    query = query.like("mime_type", "image/%");
  } else if (type === "docs") {
    query = query.not("mime_type", "like", "image/%");
  }

  if (uploaded_by) {
    query = query.eq("uploaded_by", uploaded_by);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ files: data || [] });
});

// ── GET /api/files/:id ──────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("files")
    .select(`
      *,
      uploader:uploaded_by ( id, full_name, username, avatar_url )
    `)
    .eq("id", req.params.id)
    .single();

  if (error) { res.status(404).json({ error: "File not found" }); return; }
  res.json({ file: data });
});

// ── DELETE /api/files/:id ───────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  const { user_id } = req.query as Record<string, string>;

  // Fetch file to verify ownership
  const { data: file, error: fetchErr } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (fetchErr || !file) { res.status(404).json({ error: "File not found" }); return; }

  if (user_id && file.uploaded_by !== user_id) {
    res.status(403).json({ error: "Not authorized to delete this file" });
    return;
  }

  // Delete from Supabase Storage
  const { error: storageErr } = await supabaseAdmin.storage
    .from("workspace-files")
    .remove([file.storage_id]);

  if (storageErr) {
    console.error("[Files] Storage delete error:", storageErr.message);
  }

  // Delete from DB
  const { error: dbErr } = await supabaseAdmin
    .from("files")
    .delete()
    .eq("id", req.params.id);

  if (dbErr) { res.status(500).json({ error: dbErr.message }); return; }
  res.json({ success: true });
});

export default router;
