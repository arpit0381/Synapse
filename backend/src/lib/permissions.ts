import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "./supabase";

export type Role = "owner" | "admin" | "member" | "guest";

/**
 * Middleware to ensure the user has a specific role in the workspace.
 * Requires workspace_id in req.params, req.query, or req.body
 */
export function requireRole(allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers["x-user-id"] as string;
    const workspaceId = req.params.workspace_id || req.body.workspace_id || req.query.workspace_id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!workspaceId) {
      return res.status(400).json({ error: "workspace_id required for permission check" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return res.status(403).json({ error: "You are not a member of this workspace" });
      }

      if (!allowedRoles.includes(data.role as Role)) {
        return res.status(403).json({ error: `Permission denied. Required: ${allowedRoles.join(" or ")}` });
      }

      // Attach role to request for later use if needed
      (req as any).userRole = data.role;
      next();
    } catch (err) {
      res.status(500).json({ error: "Internal permission check error" });
    }
  };
}

/**
 * Log activity to the workspace_activity table
 */
export async function logActivity(params: {
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  metadata?: any;
}) {
  try {
    await supabaseAdmin.from("workspace_activity").insert(params);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}
