import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { requireRole, logActivity } from "../lib/permissions";

const router = Router();

// ── GET /api/workspaces ─────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const userId = req.headers["x-user-id"] as string;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, role, workspaces(*)")
    .eq("user_id", userId);

  if (error) { res.status(500).json({ error: error.message }); return; }

  let workspaces = data.map((m: Record<string, unknown>) => ({
    ...(m.workspaces as Record<string, unknown>),
    role: m.role,
  }));

  // We no longer auto-create a default workspace. Users must explicitly create or join one.

  res.json({ workspaces });
});

// ── POST /api/workspaces ────────────────────────────────────────
const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
  owner_id: z.string().uuid(),
});

router.post("/", async (req: Request, res: Response) => {
  const parse = CreateWorkspaceSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const slug = parse.data.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

  const { data: ws, error: wsErr } = await supabaseAdmin
    .from("workspaces")
    .insert({ name: parse.data.name, slug, owner_id: parse.data.owner_id })
    .select()
    .single();

  if (wsErr) { res.status(400).json({ error: wsErr.message }); return; }

  // Add owner as workspace member
  await supabaseAdmin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: parse.data.owner_id,
    role: "owner",
  });

  // Create default channels
  const defaultChannels = [
    { name: "general", description: "Company-wide announcements and general chat" },
    { name: "announcements", description: "Important news and updates" },
    { name: "tasks", description: "Team task discussion" }
  ];

  for (const ch of defaultChannels) {
    await supabaseAdmin.from("channels").insert({
      workspace_id: ws.id,
      name: ch.name,
      description: ch.description,
      created_by: parse.data.owner_id,
    });
  }

  // Log activity
  await logActivity({
    workspace_id: ws.id,
    user_id: parse.data.owner_id,
    action: "workspace_created",
    entity_type: "workspace",
    entity_id: ws.id,
    entity_name: ws.name
  });

  res.status(201).json({ workspace: ws });
});

// ── POST /api/workspaces/join ───────────────────────────────────
router.post("/join", async (req: Request, res: Response) => {
  const { invite_code, user_id } = req.body;
  if (!invite_code || !user_id) {
    res.status(400).json({ error: "invite_code and user_id required" });
    return;
  }

  const { data: ws, error } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("invite_code", invite_code.toUpperCase())
    .single();

  if (error || !ws) { res.status(404).json({ error: "Invalid invite code" }); return; }

  const { error: joinErr } = await supabaseAdmin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id,
    role: "member",
  });

  if (joinErr && !joinErr.message.includes("unique")) {
    res.status(400).json({ error: joinErr.message }); return;
  }

  // Log activity
  await logActivity({
    workspace_id: ws.id,
    user_id,
    action: "member_joined",
    entity_type: "member",
    entity_id: user_id
  });

  res.json({ workspace: ws, message: "Joined successfully" });
});

// ── GET /api/workspaces/:id/members ────────────────────────────
router.get("/:id/members", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("role, joined_at, profiles(*)")
    .eq("workspace_id", req.params.id);

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Sync usernames if missing
  const members = await Promise.all(data.map(async (m: any) => {
    const profile = m.profiles;
    if (profile && !profile.username) {
      // Create a clean username from first name
      const firstName = (profile.full_name || "user").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      // Add a small random suffix to ensure uniqueness in the DB if multiple users have the same first name
      const username = `${firstName}_${Math.floor(Math.random() * 9999)}`;
      
      // Update in DB so it persists
      await supabaseAdmin
        .from("profiles")
        .update({ username })
        .eq("id", profile.id);
      
      profile.username = username;
    }
    
    return {
      ...profile,
      role: m.role,
      joined_at: m.joined_at,
    };
  }));

  res.json({ members });
});

// ── PATCH /api/workspaces/:workspace_id ──────────────────────────
router.patch("/:workspace_id", requireRole(["owner", "admin"]), async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }

  const { data: ws, error } = await supabaseAdmin
    .from("workspaces")
    .update({ name })
    .eq("id", req.params.workspace_id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ workspace: ws });
});

// ── PATCH /api/workspaces/:workspace_id/members/:userId ───────────
router.patch("/:workspace_id/members/:userId", requireRole(["owner", "admin"]), async (req: Request, res: Response) => {
  const { role } = req.body;
  const userId = req.headers["x-user-id"] as string;

  if (!["admin", "member", "guest"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  // Only owners can promote/demote admins
  if (role === "admin") {
    const { data: caller } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", req.params.workspace_id)
      .eq("user_id", userId)
      .single();
    
    if (caller?.role !== "owner") {
      return res.status(403).json({ error: "Only workspace owners can assign Admin roles" });
    }
  }

  const { error } = await supabaseAdmin
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", req.params.workspace_id)
    .eq("user_id", req.params.userId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

router.delete("/:workspace_id", requireRole(["owner"]), async (req: Request, res: Response) => {
  const { error } = await supabaseAdmin
    .from("workspaces")
    .delete()
    .eq("id", req.params.workspace_id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).send();
});

// ── DELETE /api/workspaces/:workspace_id/members/:targetUserId ───
router.delete("/:workspace_id/members/:targetUserId", requireRole(["owner", "admin"]), async (req: Request, res: Response) => {
  const { workspace_id, targetUserId } = req.params as any;
  const userId = req.headers["x-user-id"] as string;

  // Prevent removing self (users should use a different "Leave" endpoint or owners can't leave)
  if (userId === targetUserId) {
    return res.status(400).json({ error: "Use leave workspace to remove yourself" });
  }

  const { error } = await supabaseAdmin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspace_id)
    .eq("user_id", targetUserId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(204).send();
});

export default router;
