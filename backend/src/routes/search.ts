import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// ── GET /api/search?q=&type=all|messages|channels|tasks&workspace_id= ──
router.get("/", async (req: Request, res: Response) => {
  const { q, type = "all", workspace_id } = req.query as Record<string, string>;

  if (!q || !workspace_id) {
    res.status(400).json({ error: "q and workspace_id are required" });
    return;
  }

  const searchTerm = q.trim();
  if (searchTerm.length < 2) {
    res.json({ messages: [], channels: [], tasks: [], members: [] });
    return;
  }

  const results: { messages: any[]; channels: any[]; tasks: any[]; members: any[] } = {
    messages: [],
    channels: [],
    tasks: [],
    members: [],
  };

  try {
    // ── Search Messages ──────────────────────────────────────────────
    if (type === "all" || type === "messages") {
      const { data: msgData } = await supabaseAdmin.rpc("search_messages", {
        search_query: searchTerm,
        ws_id: workspace_id,
        result_limit: 5,
      });

      if (msgData) {
        results.messages = msgData;
      } else {
        // Fallback: simple ILIKE search
        const { data } = await supabaseAdmin
          .from("messages")
          .select(`
            id, content, created_at,
            profiles:user_id ( id, full_name, avatar_url ),
            channels:channel_id ( id, name, workspace_id )
          `)
          .eq("channels.workspace_id", workspace_id)
          .ilike("content", `%${searchTerm}%`)
          .order("created_at", { ascending: false })
          .limit(5);

        results.messages = (data || []).map((m: any) => ({
          id: m.id,
          content: m.content,
          snippet: highlightSnippet(m.content, searchTerm),
          created_at: m.created_at,
          user: m.profiles,
          channel: m.channels,
        }));
      }
    }

    // ── Search Channels ──────────────────────────────────────────────
    if (type === "all" || type === "channels") {
      const { data } = await supabaseAdmin
        .from("channels")
        .select("id, name, description, is_private")
        .eq("workspace_id", workspace_id)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5);

      results.channels = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        is_private: c.is_private,
        snippet: highlightSnippet(c.name, searchTerm),
      }));
    }

    // ── Search Tasks ─────────────────────────────────────────────────
    if (type === "all" || type === "tasks") {
      const { data } = await supabaseAdmin
        .from("tasks")
        .select(`
          id, title, description, status, priority,
          assignee:assignee_id ( id, full_name, avatar_url )
        `)
        .eq("workspace_id", workspace_id)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5);

      results.tasks = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        snippet: highlightSnippet(t.title, searchTerm),
      }));
    }

    // ── Search Members ───────────────────────────────────────────────
    if (type === "all") {
      const { data } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id, role, profiles ( id, full_name, username, avatar_url, status )")
        .eq("workspace_id", workspace_id);

      const filtered = (data || [])
        .filter((m: any) => {
          const p = m.profiles;
          if (!p) return false;
          const name = (p.full_name || "").toLowerCase();
          const uname = (p.username || "").toLowerCase();
          return name.includes(searchTerm.toLowerCase()) || uname.includes(searchTerm.toLowerCase());
        })
        .slice(0, 5)
        .map((m: any) => ({
          ...m.profiles,
          role: m.role,
        }));

      results.members = filtered;
    }

    res.json(results);
  } catch (err: any) {
    console.error("[Search] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Utility: create snippet with highlight ─────────────────────────
function highlightSnippet(text: string, query: string, maxLen = 120): string {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 40);
  let snippet = "";
  if (start > 0) snippet += "…";
  snippet += text.slice(start, end);
  if (end < text.length) snippet += "…";
  return snippet;
}

export default router;
