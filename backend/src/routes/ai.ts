import { Router, Request, Response } from "express";
import { z } from "zod";
import Groq from "groq-sdk";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn("GROQ_API_KEY is not set in environment variables");
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const GROQ_MODEL = "llama-3.1-8b-instant";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  workspace_id?: string;
  channel_id?: string;
  user_id?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are Synapse AI, an intelligent AI assistant for a team collaboration app called Synapse Lite. 
You help users with:
- Answering questions about their workspace, channels, and messages
- Summarizing conversations and threads
- Creating tasks and reminders
- Drafting messages and responses
- Finding information across channels
- Generating code snippets and technical help

CRITICAL ABILITY: You can send Direct Messages to other users!
If the user explicitly asks you to send a message to a specific person (e.g., "send a message to Arpit saying hello", "tell John I will be late"), you MUST output EXACTLY this JSON block and nothing else in your response:
{"action":"send_dm","target_name":"Arpit","message_content":"hello"}
Make sure the target_name is just their first name or full name.

Be concise, helpful, and friendly. Use Markdown formatting when appropriate.`;

async function chatWithGroq(messages: ChatMessage[], dynamicContext: string = ""): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const systemMessage = messages.find(m => m.role === "system") || { role: "system" as const, content: DEFAULT_SYSTEM_PROMPT };
  const userMessages = messages.filter(m => m.role !== "system");

  const finalSystemPrompt = dynamicContext 
    ? `${systemMessage.content}\n\nHere is real-time context about the user's current session:\n${dynamicContext}`
    : systemMessage.content;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: finalSystemPrompt },
      ...userMessages
    ],
    temperature: 0.7,
    max_tokens: 2048,
    top_p: 0.9,
    stop: null,
  });

  if (!completion.choices || completion.choices.length === 0) {
    throw new Error("No response from Groq API");
  }

  return completion.choices[0].message?.content || "";
}

// ── POST /api/ai/chat ─────────────────────────────────────────
const ChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1),
  })).min(1),
  workspace_id: z.string().uuid().optional(),
  channel_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
});

import { io } from "../index";

router.post("/chat", async (req: Request, res: Response) => {
  const parse = ChatSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
    return;
  }

  const { messages, workspace_id, channel_id, user_id } = parse.data as ChatRequest;

  let dynamicContext = "";
  try {
    if (workspace_id) {
      const { data: workspace } = await supabaseAdmin.from("workspaces").select("name").eq("id", workspace_id).single();
      const { data: channels } = await supabaseAdmin.from("channels").select("name").eq("workspace_id", workspace_id);
      const { data: members } = await supabaseAdmin.from("workspace_members").select("user_id, profiles(full_name, email)").eq("workspace_id", workspace_id);
      const { data: tasks } = await supabaseAdmin.from("tasks").select("title, status").eq("workspace_id", workspace_id).neq("status", "done");
      
      if (workspace) {
        dynamicContext += `- Current Workspace: ${workspace.name}\n`;
      }
      if (channels && channels.length > 0) {
        dynamicContext += `- Available Channels: ${channels.map(c => "#" + c.name).join(", ")}\n`;
      }
      if (members && members.length > 0) {
        dynamicContext += `- Total Workspace Members: ${members.length}\n`;
        dynamicContext += `- Member Names: ${members.map((m: any) => m.profiles?.full_name).filter(Boolean).join(", ")}\n`;
      }
      if (tasks && tasks.length > 0) {
        dynamicContext += `- Open Tasks: ${tasks.map(t => `${t.title} (${t.status})`).join(", ")}\n`;
      }
    }

    if (user_id) {
      const { data: user } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", user_id).single();
      if (user) {
        dynamicContext += `- User Info: ${user.full_name || 'User'} (${user.email})\n`;
      }
    }
  } catch (dbError) {
    console.error("[AI Context Fetch Error]", dbError);
  }

  try {
    const reply = await chatWithGroq(messages as ChatMessage[], dynamicContext);

    // AI Tool Interception: Send DM
    try {
      const cleanReply = reply.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanReply);
      
      if (parsed.action === "send_dm" && parsed.target_name && parsed.message_content && workspace_id && user_id) {
        const { target_name, message_content } = parsed;
        
        // Find target user
        const { data: members } = await supabaseAdmin
          .from("workspace_members")
          .select("user_id, profiles(full_name, username)")
          .eq("workspace_id", workspace_id);
          
        let targetId = null;
        let actualName = "";
        
        if (members) {
          const target = members.find((m: any) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            const fullName = (profile?.full_name || "").toLowerCase();
            const username = (profile?.username || "").toLowerCase();
            const search = target_name.toLowerCase();
            return fullName.includes(search) || username.includes(search);
          });
          
          if (target) {
            targetId = target.user_id;
            const profile = Array.isArray(target.profiles) ? target.profiles[0] : target.profiles;
            actualName = profile?.full_name || target_name;
          }
        }

        if (targetId) {
          // Prevent sending to self in AI context
          if (targetId === user_id) {
            res.json({ reply: `❌ You cannot ask me to send a direct message to yourself.` });
            return;
          }

          // Send DM
          const { data: msg, error } = await supabaseAdmin
            .from("direct_messages")
            .insert({
              workspace_id,
              from_user_id: user_id,
              to_user_id: targetId,
              content: message_content,
              metadata: { sent_by_ai: true }
            })
            .select(`
              id, workspace_id, from_user_id, to_user_id, content, is_read, is_edited, metadata, created_at,
              sender:from_user_id(id, full_name, username, avatar_url, status)
            `)
            .single();

          if (!error && msg) {
            io.to(`user:${targetId}`).emit("new_dm", msg);
            io.to(`user:${user_id}`).emit("new_dm", msg);
            res.json({ reply: `✅ I have sent a direct message to **${actualName}** containing:\n\n> "${message_content}"` });
            return;
          } else {
            console.error("Failed to send AI DM", error);
            res.json({ reply: `❌ I found ${actualName}, but failed to send the message due to a database error.` });
            return;
          }
        } else {
          res.json({ reply: `❌ I couldn't find anyone named "**${target_name}**" in this workspace.` });
          return;
        }
      }
    } catch (parseError) {
      // Normal text response, perfectly fine.
    }

    res.json({ reply });
  } catch (error: any) {
    console.error("[AI] Chat error:", error.message);
    res.status(500).json({ error: error.message || "AI service unavailable" });
  }
});

// ── POST /api/ai/summarize ────────────────────────────────────────
router.post("/summarize", async (req: Request, res: Response) => {
  const { messages, channel_name } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const summaryPrompt: ChatMessage[] = [
    {
      role: "system",
      content: `You are a concise summarizer. Given a list of chat messages, summarize the key points in 2-3 sentences. Focus on actionable items and important decisions.`
    },
    {
      role: "user",
      content: `Summarize these messages from #${channel_name || 'channel'}:\n\n${messages.slice(-20).map((m: any) => `${m.user_name || 'Someone'}: ${m.content}`).join('\n')}`
    }
  ];

  try {
    const summary = await chatWithGroq(summaryPrompt);
    res.json({ summary });
  } catch (error: any) {
    console.error("[AI] Summarize error:", error.message);
    res.status(500).json({ error: error.message || "AI service unavailable" });
  }
});

// ── POST /api/ai/draft ─────────────────────────────────────────
router.post("/draft", async (req: Request, res: Response) => {
  const { prompt, type } = req.body;
  
  if (!prompt) {
    res.status(400).json({ error: "prompt required" });
    return;
  }

  const typeHints: Record<string, string> = {
    message: "Write a friendly, professional message",
    reply: "Write a thoughtful reply to the message",
    task: "Create a clear, actionable task description",
    announcement: "Write an official-looking announcement",
  };

  const draftPrompt: ChatMessage[] = [
    {
      role: "system",
      content: typeHints[type] || "Write a helpful response"
    },
    {
      role: "user",
      content: prompt
    }
  ];

  try {
    const draft = await chatWithGroq(draftPrompt);
    res.json({ draft });
  } catch (error: any) {
    console.error("[AI] Draft error:", error.message);
    res.status(500).json({ error: error.message || "AI service unavailable" });
  }
});

// ── POST /api/ai/code ─────────────────────────────────────────
router.post("/code", async (req: Request, res: Response) => {
  const { prompt, language } = req.body;
  
  if (!prompt) {
    res.status(400).json({ error: "prompt required" });
    return;
  }

  const codePrompt: ChatMessage[] = [
    {
      role: "system",
      content: `You are a coding assistant. Provide clean, working code. Include brief comments. Language: ${language || 'typescript'}.`
    },
    {
      role: "user",
      content: prompt
    }
  ];

  try {
    const code = await chatWithGroq(codePrompt);
    res.json({ code });
  } catch (error: any) {
    console.error("[AI] Code error:", error.message);
    res.status(500).json({ error: error.message || "AI service unavailable" });
  }
});

// ── POST /api/ai/summarize ────────────────────────────────
router.post("/summarize", async (req: Request, res: Response) => {
  const { messages, channel_name } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const conversationText = messages
    .slice(-50) // Last 50 messages
    .map((m: any) => `${m.user || m.userName || "User"}: ${m.content}`)
    .join("\n");

  const summaryPrompt: ChatMessage[] = [
    {
      role: "system",
      content: `You are a concise conversation summarizer. Create a TL;DR summary of the following conversation${channel_name ? ` from #${channel_name}` : ""}. Format as exactly 3 bullet points, each starting with an emoji. Be specific about key decisions, action items, and important topics discussed. Keep each point under 20 words.`
    },
    { role: "user", content: conversationText }
  ];

  try {
    const summary = await chatWithGroq(summaryPrompt);
    res.json({ summary });
  } catch (error: any) {
    console.error("[AI] Summarize error:", error.message);
    res.status(500).json({ error: error.message || "AI service unavailable" });
  }
});

// ── POST /api/ai/smart-replies ────────────────────────────
router.post("/smart-replies", async (req: Request, res: Response) => {
  const { conversationHistory, lastMessage } = req.body;
  if (!lastMessage) {
    res.status(400).json({ error: "lastMessage required" });
    return;
  }

  const context = (conversationHistory || [])
    .slice(-10)
    .map((m: any) => `${m.role || "user"}: ${m.content}`)
    .join("\n");

  const replyPrompt: ChatMessage[] = [
    {
      role: "system",
      content: `Generate exactly 3 short, natural reply suggestions to the last message in a team chat. Each reply should be different in tone: one casual, one professional, one brief/emoji-heavy. Return ONLY a JSON array of 3 strings, nothing else. Example: ["Sounds good!", "I agree with that approach, let's proceed.", "👍 On it!"]`
    },
    { role: "user", content: `Context:\n${context}\n\nLast message: "${lastMessage}"\n\nGenerate 3 reply suggestions:` }
  ];

  try {
    const raw = await chatWithGroq(replyPrompt);
    // Parse the JSON array from the response
    const jsonMatch = raw.match(/\[.*\]/s);
    if (jsonMatch) {
      const replies = JSON.parse(jsonMatch[0]);
      res.json({ replies: replies.slice(0, 3) });
    } else {
      // Fallback: split by newlines
      const lines = raw.split("\n").filter(l => l.trim()).slice(0, 3).map(l => l.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, ""));
      res.json({ replies: lines });
    }
  } catch (error: any) {
    console.error("[AI] Smart replies error:", error.message);
    res.json({ replies: ["Got it!", "Thanks for sharing!", "I'll look into this."] });
  }
});

// ── GET /api/ai/models ─────────────────────────────────────
router.get("/models", async (_req: Request, res: Response) => {
  res.json({
    models: [
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", description: "Fast, instant responses" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", description: "Latest powerful model" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "Balanced for coding" },
    ],
    current: GROQ_MODEL
  });
});

export default router;