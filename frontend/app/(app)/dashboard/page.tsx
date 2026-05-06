"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare, CheckSquare, Users, TrendingUp, Hash, Clock,
  Bot, ArrowRight, AlertTriangle, Star, Plus, Zap, Bell, Target,
  ChevronRight, Activity
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn, getGreeting, getGreetingEmoji, stringToColor, formatRelativeTime, PRIORITY_CONFIG } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Mock Data ────────────────────────────────────────────────────────
const MOCK_STATS = [
  { label: "Messages Today", value: "142", change: "+18%", icon: MessageSquare, trend: "up" },
  { label: "Tasks Due Today", value: "7", change: "3 overdue", icon: CheckSquare, trend: "warn" },
  { label: "Active Members", value: "11", change: "of 14 online", icon: Users, trend: "up" },
  { label: "Team Velocity", value: "94%", change: "+5% this week", icon: TrendingUp, trend: "up" },
];

const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog", in_progress: "In Progress", in_review: "In Review", done: "Done"
};

// ── Skeleton component ────────────────────────────────────────────
function StatSkeleton() {
  return <div className="skeleton h-28 rounded-xl" />;
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, currentWorkspace, channels } = useAppStore();
  const displayUser = user || { name: "User", avatar_url: "" };

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard_tasks", currentWorkspace?.id],
    queryFn: () => api.tasks.list(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  // Fetch AI Daily Summary via Chat
  const { data: aiSummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard_ai_summary", currentWorkspace?.id],
    queryFn: async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Generate a short 3-sentence daily summary for this workspace. Highlight important channels or general team vibe. Be concise and use emojis." }],
          workspace_id: currentWorkspace?.id,
          user_id: user?.id,
        })
      });
      return res.json();
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
  });

  // Fetch AI Models to display active one
  const { data: modelsData } = useQuery({
    queryKey: ["aiModels"],
    queryFn: async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
      const res = await fetch(`${API_BASE}/api/ai/models`);
      return res.json();
    }
  });

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const greeting = mounted ? getGreeting() : "Hello";
  const emoji = mounted ? getGreetingEmoji() : "👋";

  const tasks = tasksData?.tasks || [];
  const activeModel = modelsData?.models?.find((m: any) => m.id === modelsData.current)?.name || "Llama 3.1 8B";
  const displayChannels = channels.slice(0, 4);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-12">
      {/* ── Greeting Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-fluid-3xl font-black text-foreground tracking-tight"
          >
            {greeting}, {displayUser.name.split(" ")[0]} {emoji}
          </motion.h1>
          <p className="text-fluid-sm font-medium text-muted-foreground mt-2 md:mt-3 px-1">
            <span className="hidden sm:inline">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · </span>
            You have <span className="text-accent font-bold">{tasks.length} active tasks</span>
          </p>
        </div>
        <Link href="/tasks">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl accent-gradient text-white text-sm font-bold shadow-xl shadow-accent/20 btn-press"
          >
            <Plus className="w-5 h-5" />
            NEW TASK
          </motion.button>
        </Link>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loading
          ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />)
          : MOCK_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[22px] p-5 md:p-6 hover:border-accent/40 transition-all duration-300 group shadow-sm hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all",
                  stat.trend === "up" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  stat.trend === "warn" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                  "bg-muted/50 text-muted-foreground border-border/40"
                )}>
                  {stat.change}
                </span>
              </div>
              <div className="font-display text-fluid-3xl font-black text-foreground mb-1 group-hover:scale-105 transition-transform origin-left">{stat.value}</div>
              <div className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{stat.label}</div>
            </motion.div>
          ))
        }
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Daily Summary */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-border rounded-xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5"
              style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm">AI Daily Summary</h2>
                <p className="text-xs text-muted-foreground">Generated from context</p>
              </div>
              <span className="ml-auto text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{activeModel}</span>
            </div>
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>{aiSummaryData?.reply || "No summary available right now."}</p>
              </div>
            )}
            <Link href="/ai-assistant">
              <button className="mt-4 flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
                Open AI Assistant <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </motion.div>

          {/* Recent Channels */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground text-sm">Channels</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {displayChannels.map((ch: any) => (
                  <Link key={ch.id} href={`/channels/${ch.id}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
                      <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">#{ch.name}</span>
                        </div>
                      </div>
                      {ch.unread_count > 0 && (
                        <span className="text-xs bg-accent text-white rounded-full px-2 py-0.5 font-bold flex-shrink-0">
                          {ch.unread_count}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Tasks Widget */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                <h2 className="font-display font-semibold text-foreground text-sm">My Tasks</h2>
              </div>
              <Link href="/tasks">
                <button className="text-xs text-accent hover:underline flex items-center gap-1">
                  Open Kanban <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            {tasksLoading ? (
              <div className="space-y-2">
                {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task: any) => {
                  const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.low;
                  const due = task.due_date ? new Date(task.due_date) : null;
                  const isOverdue = due && due < new Date();
                  return (
                    <Link key={task.id} href={`/tasks`}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", pc.color.replace("text-", "bg-"))} />
                        <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border", pc.color, pc.bg, pc.border)}>
                            {pc.label}
                          </span>
                          {due && (
                            <span className={cn("text-xs", isOverdue ? "text-red-400 font-medium" : "text-muted-foreground")}>
                              {isOverdue ? "Overdue" : due.toLocaleDateString([], { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks right now.</p>
            )}
          </motion.div>
        </div>

        {/* ── Right Column (1/3) ── */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-accent" />
              <h2 className="font-display font-semibold text-foreground text-sm">Upcoming Deadlines</h2>
            </div>
            {tasksLoading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
              </div>
            ) : tasks.filter((t: any) => t.due_date && new Date(t.due_date) > new Date()).length > 0 ? (
              <div className="space-y-3">
                {tasks
                  .filter((t: any) => t.due_date && new Date(t.due_date) > new Date())
                  .slice(0, 3)
                  .map((task: any) => {
                    const due = new Date(task.due_date);
                    const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft <= 2;
                    return (
                      <div key={task.id} className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                          isUrgent ? "bg-orange-500/10 text-orange-400" : "bg-accent/10 text-accent"
                        )}>
                          {daysLeft}d
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground">{due.toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                        </div>
                        {isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            )}
          </motion.div>
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <h2 className="font-display font-semibold text-foreground text-sm mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Task", icon: CheckSquare, href: "/tasks" },
                { label: "AI Summary", icon: Bot, href: "/ai-assistant" },
                { label: "Invite Members", icon: Users, href: "/settings/workspace" },
                { label: "Focus Mode", icon: Zap, href: "/focus-mode" },
              ].map((action) => (
                <Link key={action.label} href={action.href}>
                  <button className="w-full flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-accent/10 hover:border-accent/30 border border-transparent transition-all text-center group">
                    <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
