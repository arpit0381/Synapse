import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── GET /api/analytics/messages?workspace_id=&days=30 ────────────────
router.get("/messages", async (req: Request, res: Response) => {
  const { workspace_id, days = "30" } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - Number(days));

  try {
    // Get channels in this workspace
    const { data: channels } = await supabaseAdmin
      .from("channels")
      .select("id")
      .eq("workspace_id", workspace_id);

    if (!channels || channels.length === 0) {
      res.json({ data: [] });
      return;
    }

    const channelIds = channels.map((c: any) => c.id);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("created_at")
      .in("channel_id", channelIds)
      .gte("created_at", daysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (error) { res.status(500).json({ error: error.message }); return; }

    // Group by date
    const grouped: Record<string, number> = {};
    (data || []).forEach((m: any) => {
      const date = m.created_at.split("T")[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    // Fill missing dates
    const result = [];
    const current = new Date(daysAgo);
    const today = new Date();
    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0];
      result.push({ date: dateStr, count: grouped[dateStr] || 0 });
      current.setDate(current.getDate() + 1);
    }

    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/members?workspace_id= ─────────────────────────
router.get("/members", async (req: Request, res: Response) => {
  const { workspace_id } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  try {
    // Get workspace members with join dates
    const { data: members, error } = await supabaseAdmin
      .from("workspace_members")
      .select("joined_at, profiles ( id, full_name )")
      .eq("workspace_id", workspace_id)
      .order("joined_at", { ascending: true });

    if (error) { res.status(500).json({ error: error.message }); return; }

    // Group by week
    const weeklyData: Record<string, number> = {};
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    (members || []).forEach((m: any) => {
      const joined = new Date(m.joined_at);
      if (joined >= fourWeeksAgo) {
        const weekStart = getWeekStart(joined);
        weeklyData[weekStart] = (weeklyData[weekStart] || 0) + 1;
      }
    });

    // Also count total members
    const totalMembers = members?.length || 0;

    res.json({
      total: totalMembers,
      weekly: Object.entries(weeklyData).map(([week, count]) => ({ week, count })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/tasks?workspace_id= ───────────────────────────
router.get("/tasks", async (req: Request, res: Response) => {
  const { workspace_id } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  try {
    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("status")
      .eq("workspace_id", workspace_id);

    if (error) { res.status(500).json({ error: error.message }); return; }

    const statusCounts: Record<string, number> = {
      backlog: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };

    (data || []).forEach((t: any) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    res.json({
      total: data?.length || 0,
      breakdown: statusCounts,
      completion_rate: data && data.length > 0
        ? Math.round((statusCounts.done / data.length) * 100)
        : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/contributors?workspace_id= ────────────────────
router.get("/contributors", async (req: Request, res: Response) => {
  const { workspace_id } = req.query as Record<string, string>;
  if (!workspace_id) { res.status(400).json({ error: "workspace_id required" }); return; }

  try {
    const { data: channels } = await supabaseAdmin
      .from("channels")
      .select("id")
      .eq("workspace_id", workspace_id);

    if (!channels || channels.length === 0) {
      res.json({ data: [] });
      return;
    }

    const channelIds = channels.map((c: any) => c.id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("user_id, profiles:user_id ( full_name, avatar_url )")
      .in("channel_id", channelIds)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (error) { res.status(500).json({ error: error.message }); return; }

    // Count messages per user
    const counts: Record<string, { name: string; avatar_url: string; count: number }> = {};
    (data || []).forEach((m: any) => {
      const profile = m.profiles;
      if (!counts[m.user_id]) {
        counts[m.user_id] = {
          name: profile?.full_name || "Unknown",
          avatar_url: profile?.avatar_url || "",
          count: 0,
        };
      }
      counts[m.user_id].count++;
    });

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([userId, info]) => ({ userId, ...info }));

    res.json({ data: sorted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export default router;
