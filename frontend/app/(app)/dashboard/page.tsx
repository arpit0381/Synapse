"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare, CheckSquare, Users, TrendingUp, Hash, Clock,
  Bot, ArrowRight, AlertTriangle, Star, Plus, Zap, Bell, Target,
  ChevronRight, Activity, Calendar, ExternalLink, Trophy, History, CheckCircle2
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn, getGreeting, getGreetingEmoji, stringToColor, formatRelativeTime, PRIORITY_CONFIG, getInitials } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Skeleton, StrawHatLoader } from "@/components/ui/StrawHatSkeleton";

// ── Skeleton component ────────────────────────────────────────────
function StatSkeleton() {
  return <Skeleton className="h-32 rounded-3xl" />;
}

// ── Analytics Card ────────────────────────────────────────────────
function AnalyticsCard({ label, value, change, icon: Icon, trend, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-surface/50 backdrop-blur-md border border-border/60 rounded-[32px] p-6 hover:border-accent/40 transition-all duration-500 group shadow-sm hover:shadow-2xl hover:shadow-accent/10"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl bg-accent/10 text-accent transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-accent group-hover:text-white">
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
          trend === "up" ? "bg-green-500/10 text-green-400 border-green-500/20" :
          trend === "down" ? "bg-red-500/10 text-red-400 border-red-500/20" :
          "bg-muted/50 text-muted-foreground border-border/40"
        )}>
          {trend === "up" && <TrendingUp className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div className="font-display text-4xl font-black text-foreground mb-1 group-hover:translate-x-1 transition-transform">{value}</div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">{label}</div>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, currentWorkspace, channels, currentUserRole } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // 1. Overview Stats
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["dashboard_overview", currentWorkspace?.id],
    queryFn: () => api.analytics.getOverview(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  // 2. Recent Activity
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard_activity", currentWorkspace?.id],
    queryFn: () => api.analytics.getActivity(currentWorkspace!.id, 10),
    enabled: !!currentWorkspace?.id,
  });

  // 3. User Tasks (Personalized)
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard_user_tasks", currentWorkspace?.id, user?.id],
    queryFn: () => api.tasks.list(currentWorkspace!.id, undefined, user?.id),
    enabled: !!currentWorkspace?.id && !!user?.id,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const greeting = mounted ? getGreeting() : "Hello";
  const emoji = mounted ? getGreetingEmoji() : "👋";
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";
  const tasks = (tasksData?.tasks || []).filter((t: any) => t.status !== "done");

  // Mutation for completing tasks
  const queryClient = useQueryClient();
  const completeMutation = useMutation({
    mutationFn: (id: string) => api.tasks.update(id, { status: "done" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_user_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task marked as completed!");
    }
  });

  const handleComplete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    completeMutation.mutate(id);
  };

  const activities = activityData?.activity || [];

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-black text-accent uppercase tracking-widest">
              {isAdmin ? "Administrator Access" : "Member Workspace"}
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl md:text-6xl font-black text-foreground tracking-tighter"
          >
            {greeting}, {user?.name.split(" ")[0]} {emoji}
          </motion.h1>
          <p className="text-lg font-medium text-muted-foreground mt-4 max-w-2xl leading-relaxed">
            Welcome back to <span className="text-foreground font-bold">{currentWorkspace?.name}</span>. 
            You have <span className="text-accent font-black underline decoration-accent/30">{tasks.length} tasks</span> assigned to you today.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/tasks">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-8 py-4 rounded-[22px] bg-foreground text-background text-sm font-black shadow-2xl hover:shadow-foreground/20 transition-all btn-press"
            >
              <Plus className="w-5 h-5 stroke-[3px]" />
              NEW TASK
            </motion.button>
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewLoading ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <AnalyticsCard label="Messages Today" value={overview?.messages_today || 0} change="+12%" icon={MessageSquare} trend="up" delay={0.1} />
              <AnalyticsCard label="Active Tasks" value={overview?.active_tasks || 0} change="Action needed" icon={CheckSquare} trend="warn" delay={0.2} />
              <AnalyticsCard label="Team Members" value={overview?.total_members || 0} change="2 online" icon={Users} trend="up" delay={0.3} />
              <AnalyticsCard label="Overdue" value={overview?.overdue_tasks || 0} change={overview?.overdue_tasks > 0 ? "Critical" : "On track"} icon={AlertTriangle} trend={overview?.overdue_tasks > 0 ? "down" : "neutral"} delay={0.4} />
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <AnalyticsCard label="My Tasks" value={tasks.length} change="Priority" icon={Target} trend="up" delay={0.1} />
           <AnalyticsCard label="Focus Time" value="2.4h" change="+15%" icon={Zap} trend="up" delay={0.2} />
           <AnalyticsCard label="Daily Goal" value="84%" icon={Trophy} trend="up" delay={0.3} />
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column (2/3) ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* User Tasks Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Star className="w-5 h-5 fill-accent" />
                </div>
                <h2 className="font-display font-black text-xl text-foreground">Focused Tasks</h2>
              </div>
              <Link href="/tasks" className="text-xs font-bold text-accent hover:underline uppercase tracking-widest flex items-center gap-2">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="grid gap-3">
              {tasksLoading ? (
                <>
                  <StrawHatLoader label="Preparing Bounties..." className="py-4" />
                  {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)}
                </>
              ) : 
                tasks.length > 0 ? tasks.slice(0, 4).map((task: any) => {
                  const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                  return (
                    <motion.div
                      key={task.id}
                      whileHover={{ x: 8 }}
                      className="group flex items-center gap-5 p-5 rounded-[24px] bg-surface/40 border border-border/50 hover:border-accent/40 hover:bg-surface transition-all cursor-pointer relative overflow-hidden"
                    >
                      <button 
                        onClick={(e) => handleComplete(e, task.id)}
                        className="w-10 h-10 rounded-full border-2 border-border/60 flex items-center justify-center text-muted-foreground/40 hover:border-green-500 hover:bg-green-500/10 hover:text-green-500 transition-all flex-shrink-0 group/check"
                      >
                        <CheckCircle2 className="w-5 h-5 group-hover/check:scale-110" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">{task.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-60">{task.description || "No description provided."}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", pc.color, pc.bg, pc.border)}>
                          {pc.label}
                        </span>
                        {task.due_date && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 opacity-40" />
                            {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-accent transition-all group-hover:translate-x-1" />
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="p-12 rounded-[32px] border border-dashed border-border/60 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="w-12 h-12 text-accent/20 mb-4" />
                    <h3 className="font-bold text-foreground">Zero tasks remaining</h3>
                    <p className="text-sm text-muted-foreground mt-1">You're all caught up for the day. Take a break! ☕</p>
                  </div>
                )
              }
            </div>
          </section>

          {/* Activity Feed */}
          {isAdmin && (
            <section>
               <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <History className="w-5 h-5" />
                  </div>
                  <h2 className="font-display font-black text-xl text-foreground">Workspace Activity</h2>
                </div>
              </div>
              <div className="bg-surface/30 border border-border/50 rounded-[32px] overflow-hidden">
                <div className="divide-y divide-border/40">
                  {activityLoading ? (
                    <>
                      <StrawHatLoader label="Checking Logs..." className="py-6" />
                      {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </>
                  ) : 
                    activities.map((act: any) => (
                      <div key={act.id} className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors">
                        <div className="w-10 h-10 rounded-full border-2 border-border/40 overflow-hidden flex-shrink-0" style={{ backgroundColor: stringToColor(act.user?.full_name || "User") }}>
                          {act.user?.avatar_url ? <img src={act.user.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-white flex items-center justify-center h-full">{getInitials(act.user?.full_name || "User")}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-bold">{act.user?.full_name}</span> 
                            <span className="text-muted-foreground"> {act.action.replace("_", " ")} </span>
                            <span className="font-medium text-accent">{act.entity_name}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">{formatRelativeTime(act.created_at)}</p>
                        </div>
                        <Zap className="w-4 h-4 text-accent/20" />
                      </div>
                    ))
                  }
                  {activities.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm font-medium italic">No recent activity found.</div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── Right Column (1/3) ── */}
        <div className="space-y-8">
          {/* Active Channels */}
          <div className="bg-surface border border-border/60 rounded-[32px] p-8 shadow-sm">
            <h2 className="font-display font-black text-lg text-foreground mb-6 flex items-center gap-3">
              <Hash className="w-5 h-5 text-accent" />
              Hot Channels
            </h2>
            <div className="space-y-2">
              {channels.slice(0, 5).map((ch: any) => (
                <Link key={ch.id} href={`/channels/${ch.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/10 group transition-all">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-accent group-hover:text-white transition-all">
                      <Hash className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors truncate">#{ch.name}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-[#4B39EF] rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
            <h2 className="font-display font-black text-lg mb-6 relative">Quick Access</h2>
            <div className="grid grid-cols-2 gap-3 relative">
              {[
                { label: "Pulse", icon: Activity, href: "/pulse" },
                { label: "Analytics", icon: TrendingUp, href: "/analytics" },
                { label: "Settings", icon: Zap, href: "/settings/profile" },
                { label: "Support", icon: MessageSquare, href: "/ai-assistant" },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <button className="w-full flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-center">
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
