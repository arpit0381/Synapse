import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { requireRole } from "../lib/permissions";

const router = Router();

// ── DOCUMENTS ───────────────────────────────────────────────────────

// GET /api/apps/docs?workspace_id=
router.get("/docs", async (req: Request, res: Response) => {
  const { workspace_id } = req.query as Record<string, string>;
  if (!workspace_id) return res.status(400).json({ error: "workspace_id required" });

  const { data, error } = await supabaseAdmin
    .from("documents")
    .select(`
      *,
      creator:created_by ( id, full_name, username, avatar_url )
    `)
    .eq("workspace_id", workspace_id)
    .order("updated_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ documents: data || [] });
});

// POST /api/apps/docs
const CreateDocSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(255).default("Untitled Document"),
  created_by: z.string().uuid(),
});

router.post("/docs", requireRole(["owner", "admin", "member"]), async (req: Request, res: Response) => {
  console.log("[Apps] Creating doc:", req.body);
  const parse = CreateDocSchema.safeParse(req.body);
  if (!parse.success) {
    console.warn("[Apps] Validation failed:", parse.error.flatten());
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }

  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert(parse.data)
    .select()
    .single();

  if (error) {
    console.error("[Apps] Supabase insertion error:", error);
    return res.status(400).json({ error: error.message });
  }
  console.log("[Apps] Doc created successfully:", data.id);
  res.status(201).json({ document: data });
});

// PATCH /api/apps/docs/:id
router.patch("/docs/:id", async (req: Request, res: Response) => {
  const { title, content, is_public } = req.body;
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (is_public !== undefined) updates.is_public = is_public;

  const { data, error } = await supabaseAdmin
    .from("documents")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ document: data });
});

// GET /api/apps/docs/:id
router.get("/docs/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select(`
      *,
      creator:created_by ( id, full_name, username, avatar_url )
    `)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Document not found" });
  res.json({ document: data });
});

// ── SHEETS ──────────────────────────────────────────────────────────

// GET /api/apps/sheets?workspace_id=
router.get("/sheets", async (req: Request, res: Response) => {
  const { workspace_id } = req.query as Record<string, string>;
  if (!workspace_id) return res.status(400).json({ error: "workspace_id required" });

  const { data, error } = await supabaseAdmin
    .from("sheets")
    .select(`
      *,
      creator:created_by ( id, full_name, username, avatar_url )
    `)
    .eq("workspace_id", workspace_id)
    .order("updated_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sheets: data || [] });
});

// POST /api/apps/sheets
const CreateSheetSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(255).default("Untitled Spreadsheet"),
  created_by: z.string().uuid(),
});

router.post("/sheets", requireRole(["owner", "admin", "member"]), async (req: Request, res: Response) => {
  const parse = CreateSheetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });

  const { data: sheetData, error: sheetError } = await supabaseAdmin
    .from("sheets")
    .insert(parse.data)
    .select()
    .single();

  if (sheetError) return res.status(400).json({ error: sheetError.message });

  // Create default tab
  const { data: tabData, error: tabError } = await supabaseAdmin
    .from("sheet_tabs")
    .insert({
      sheet_id: sheetData.id,
      title: "Sheet1",
      index: 0,
      created_by: parse.data.created_by
    })
    .select()
    .single();

  if (tabError) console.error("Failed to create default tab:", tabError);

  res.status(201).json({ sheet: sheetData, tab: tabData });
});

// GET /api/apps/sheets/:id/tabs
router.get("/sheets/:id/tabs", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("sheet_tabs")
    .select("*")
    .eq("sheet_id", req.params.id)
    .order("index", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ tabs: data || [] });
});

// POST /api/apps/sheets/:id/tabs
router.post("/sheets/:id/tabs", async (req: Request, res: Response) => {
  const { title, index, created_by } = req.body;
  const { data, error } = await supabaseAdmin
    .from("sheet_tabs")
    .insert({ sheet_id: req.params.id, title, index, created_by })
    .select()
    .single();
    
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ tab: data });
});

// GET /api/apps/tabs/:tabId/cells
router.get("/tabs/:tabId/cells", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("sheet_cells")
    .select("*")
    .eq("tab_id", req.params.tabId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ cells: data || [] });
});

// POST /api/apps/tabs/:tabId/cells (Upsert)
router.post("/tabs/:tabId/cells", async (req: Request, res: Response) => {
  const { row_index, col_index, value, formula, format, user_id } = req.body;
  
  const { data, error } = await supabaseAdmin
    .from("sheet_cells")
    .upsert({
      tab_id: req.params.tabId,
      row_index,
      col_index,
      value,
      formula,
      format,
      updated_by: user_id,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ cell: data });
});

// GET /api/apps/sheets/:id
router.get("/sheets/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("sheets")
    .select(`
      *,
      creator:created_by ( id, full_name, username, avatar_url )
    `)
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Spreadsheet not found" });
  res.json({ sheet: data });
});

export default router;
