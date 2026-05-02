"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, RefreshCw, Copy, ThumbsUp, ThumbsDown, FileText, CheckSquare, Hash, Lightbulb } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useQuery } from "@tanstack/react-query";

interface AiMessage { id: string; role: "user" | "assistant" | "system"; content: string; timestamp: Date; }

const QUICK_PROMPTS = [
  { icon: <FileText className="w-4 h-4" />, label: "Summarize yesterday", prompt: "Summarize what happened in all channels yesterday" },
  { icon: <CheckSquare className="w-4 h-4" />, label: "My tasks today", prompt: "What are my high-priority tasks due today?" },
  { icon: <Hash className="w-4 h-4" />, label: "Unread highlights", prompt: "What did I miss while I was away? Show key highlights" },
  { icon: <Lightbulb className="w-4 h-4" />, label: "Write a PR description", prompt: "Help me write a clear PR description for the auth refactor" },
];

function MarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} className="font-display font-bold text-base text-foreground mt-3">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="font-semibold text-sm text-foreground mt-2">{line.slice(4)}</h3>;
        if (line.startsWith("---")) return <hr key={i} className="border-border my-2" />;
        if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-accent pl-3 text-muted-foreground italic">{line.slice(2)}</blockquote>;
        if (line.trim() === "") return <div key={i} className="h-1" />;

        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) return <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
              if (part.startsWith("`") && part.endsWith("`")) return <code key={j} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-accent">{part.slice(1, -1)}</code>;
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function AiAssistantPage() {
  const { currentWorkspace, user } = useAppStore();
  const [messages, setMessages] = useState<AiMessage[]>([
    { id: "welcome", role: "assistant", content: `**Hey! I'm Synapse AI** 🤖\n\nI'm your team intelligence assistant. I can help you:\n- **Summarize** what happened in channels while you were away\n- **Surface** your key tasks and deadlines\n- **Write** documents, PR descriptions, emails, and more\n- **Answer** questions about your team's work\n\nWhat would you like to know?`, timestamp: new Date() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("Llama 3.1 8B");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: modelsData } = useQuery({
    queryKey: ["aiModels"],
    queryFn: async () => {
      const res = await fetch("http://localhost:4001/api/ai/models");
      return res.json();
    }
  });

  useEffect(() => {
    if (modelsData?.current) {
      const currentModel = modelsData.models.find((m: any) => m.id === modelsData.current);
      if (currentModel) setModel(currentModel.name);
    }
  }, [modelsData]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput("");
    
    const userMsg: AiMessage = { id: `u${Date.now()}`, role: "user", content, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Map frontend messages to backend ChatMessage format
      const chatMessages = newMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("http://localhost:4001/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          workspace_id: currentWorkspace?.id,
          user_id: user?.id,
        })
      });

      if (!res.ok) throw new Error("Failed to communicate with AI");
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        id: `a${Date.now()}`, 
        role: "assistant", 
        content: data.reply, 
        timestamp: new Date() 
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        id: `a${Date.now()}`, 
        role: "assistant", 
        content: `**Error:** ${error.message || "Failed to fetch AI response."}`, 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground text-base">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by {model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={model} onChange={e => setModel(e.target.value)}
            className="bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
            {modelsData?.models ? (
              modelsData.models.map((m: any) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))
            ) : (
              <option>Llama 3.1 8B</option>
            )}
          </select>
          <button onClick={() => setMessages([messages[0]])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground border border-border transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-6 py-4 space-y-4">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-3",
              msg.role === "user" ? "accent-gradient text-white rounded-br-sm" : "bg-surface border border-border rounded-bl-sm")}>
              {msg.role === "user"
                ? <p className="text-sm leading-relaxed">{msg.content}</p>
                : <MarkdownText content={msg.content} />}
              <div className={cn("flex items-center justify-between mt-2 gap-2", msg.role === "user" ? "justify-end" : "justify-between")}>
                <span className={cn("text-[10px]", msg.role === "user" ? "text-white/60" : "text-muted-foreground")}>{formatTime(msg.timestamp)}</span>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Copy className="w-3 h-3" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-green-400 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              {[0, 1, 2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-6 pb-3 flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Quick prompts</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(qp => (
              <button key={qp.label} onClick={() => sendMessage(qp.prompt)}
                className="flex items-center gap-2.5 p-3 bg-surface border border-border rounded-xl text-left hover:border-accent/40 hover:bg-muted/30 transition-all group">
                <span className="text-accent group-hover:scale-110 transition-transform">{qp.icon}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{qp.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="flex items-end gap-2 bg-surface border border-border rounded-xl focus-within:border-accent/50 transition-colors">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask anything about your workspace…" rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground px-4 py-3 resize-none outline-none max-h-36 leading-relaxed"
            style={{ minHeight: "48px" }} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className={cn("m-2 p-2 rounded-lg transition-all", input.trim() && !loading ? "accent-gradient text-white shadow-accent-glow" : "text-muted-foreground bg-muted")}>
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">AI responses are generated based on your workspace context.</p>
      </div>
    </div>
  );
}
