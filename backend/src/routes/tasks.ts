import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── GET /api/tasks?workspace_id= ─────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const { workspace_id, assignee_id, status } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  let query = supabaseAdmin
    .from("tasks")
    .select(`
      *,
      assignee:assignee_id ( id, full_name, username, avatar_url, status ),
      creator:created_by ( id, full_name, username, avatar_url ),
      subtasks ( id, title, is_done, position )
    `)
    .eq("workspace_id", workspace_id)
    .order("position", { ascending: true });

  if (assignee_id) query = query.eq("assignee_id", assignee_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ tasks: data || [] });
});

// ── POST /api/tasks ───────────────────────────────────────────
const CreateTaskSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  status: z.enum(["backlog", "in_progress", "in_review", "done"]).default("backlog"),
  priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
  assignee_id: z.string().uuid().optional(),
  created_by: z.string().uuid(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  const parse = CreateTaskSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid input", details: parse.error.flatten() }); return; }

  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .insert(parse.data)
    .select("*, assignee:assignee_id(id, full_name, avatar_url)")
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json({ task });
});

// ── PATCH /api/tasks/:id ─────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  const allowed = ["title","description","status","priority","assignee_id","due_date","tags","position"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id)
    .select("*, assignee:assignee_id(id, full_name, avatar_url)")
    .single();

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ task: data });
});

// ── DELETE /api/tasks/:id ────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", req.params.id);
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ── POST /api/tasks/:id/subtasks ─────────────────────────────
router.post("/:id/subtasks", async (req: Request, res: Response) => {
  const { title } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: "title required" }); return; }
  const { data, error } = await supabaseAdmin
    .from("subtasks")
    .insert({ task_id: req.params.id, title })
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json({ subtask: data });
});

// ── PATCH /api/tasks/:id/subtasks/:sid ───────────────────────
router.patch("/:id/subtasks/:sid", async (req: Request, res: Response) => {
  const { is_done, title } = req.body;
  const { data, error } = await supabaseAdmin
    .from("subtasks")
    .update({ is_done, title })
    .eq("id", req.params.sid)
    .eq("task_id", req.params.id)
    .select()
    .single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.json({ subtask: data });
});

export default router;
