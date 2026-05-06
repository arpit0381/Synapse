"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Activity, Zap, Users, MessageSquare, TrendingUp, 
  Sparkles, Shield, BellOff, ArrowRight, Brain, Globe,
  Search, Play, BarChart3, Clock
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface PulseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PulseModal({ isOpen, onClose }: PulseModalProps) {
  const { currentWorkspace, user, channels } = useAppStore();
  const [activeTab, setActiveTab] = useState<"overview" | "intelligence" | "flow">("overview");
  const [isGhostMode, setGhostMode] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);

  // Fetch real analytics data
  const { data: messageStats, isLoading: statsLoading } = useQuery({
    queryKey: ["pulse-analytics", currentWorkspace?.id],
    queryFn: () => api.analytics.messages(currentWorkspace!.id, 7),
    enabled: !!currentWorkspace?.id && isOpen,
  });

  const { data: topContributors } = useQuery({
    queryKey: ["pulse-contributors", currentWorkspace?.id],
    queryFn: () => api.analytics.contributors(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id && isOpen,
  });

  const generateBrief = async () => {
    if (!currentWorkspace) return;
    setIsGeneratingBrief(true);
    try {
      // Get messages from first 3 channels to summarize
      const summaries = await Promise.all(
        channels.slice(0, 3).map(async (ch) => {
          const { messages } = await api.messages.list(ch.id);
          if (messages.length === 0) return null;
          const { summary } = await api.ai.summarize({ messages, channel_name: ch.name });
          return { channel: ch.name, summary };
        })
      );

      const validSummaries = summaries.filter(s => s !== null);
      if (validSummaries.length === 0) {
        setAiBrief("No recent activity found to summarize. Start a conversation to see the pulse!");
      } else {
        setAiBrief(validSummaries.map(s => `**#${s?.channel}**: ${s?.summary}`).join("\n\n"));
      }
    } catch (err) {
      console.error(err);
      setAiBrief("Failed to generate intelligence brief. Neural links are unstable.");
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  useEffect(() => {
    if (activeTab === "intelligence" && !aiBrief && !isGeneratingBrief) {
      generateBrief();
    }
  }, [activeTab]);

  // Calculate total messages today
  const todayCount = messageStats?.data?.[messageStats.data.length - 1]?.count || 0;
  const yesterdayCount = messageStats?.data?.[messageStats.data.length - 2]?.count || 0;
  const growth = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl h-[85vh] bg-[#0A0A0B] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Sidebar / Tabs */}
            <div className="w-full md:w-[280px] bg-white/[0.02] border-r border-white/5 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Activity className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Synapse Pulse</h2>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Workspace Intelligence</p>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {[
                  { id: "overview", label: "Overview", icon: Globe, color: "text-blue-400" },
                  { id: "intelligence", label: "AI Insights", icon: Brain, color: "text-purple-400" },
                  { id: "flow", label: "Deep Flow", icon: Zap, color: "text-orange-400" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                      activeTab === tab.id 
                        ? "bg-white/10 text-white" 
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? tab.color : "text-current")} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Ghost Mode Toggle */}
              <div className="mt-auto pt-6 border-t border-white/5">
                <div className={cn(
                  "p-4 rounded-[20px] transition-all duration-500 border",
                  isGhostMode 
                    ? "bg-emerald-500/10 border-emerald-500/30" 
                    : "bg-white/[0.02] border-white/5"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-white/80">
                      <Shield className={cn("w-4 h-4", isGhostMode ? "text-emerald-400" : "text-white/40")} />
                      <span className="text-xs font-bold uppercase tracking-wider">Ghost Mode</span>
                    </div>
                    <button 
                      onClick={() => setGhostMode(!isGhostMode)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-300",
                        isGhostMode ? "bg-emerald-500" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isGhostMode ? 22 : 4 }}
                        className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    {isGhostMode 
                      ? "Currently invisible. Your status is hidden from others." 
                      : "Go invisible to browse channels without notifying others."}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative">
              <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-2 rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">Workspace Pulse</h3>
                      <p className="text-white/40 font-medium">Real-time health and activity metrics for {currentWorkspace?.name}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: "Active Today", value: todayCount, icon: MessageSquare, detail: `+${growth}% from yesterday`, color: "from-blue-500 to-indigo-600" },
                        { label: "Online Now", value: 12, icon: Users, detail: "Across 4 channels", color: "from-emerald-500 to-teal-600" },
                        { label: "Trending Topics", value: 5, icon: TrendingUp, detail: "AI, Product, Launch", color: "from-orange-500 to-rose-600" },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                          <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 blur-3xl group-hover:opacity-10 transition-opacity", stat.color)} />
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-white/5 text-white/80">
                              <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full uppercase tracking-tighter">
                              {stat.detail}
                            </span>
                          </div>
                          <div className="text-4xl font-black text-white mb-1 tracking-tighter">{stat.value}</div>
                          <div className="text-sm font-bold text-white/30 uppercase tracking-widest">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Activity Visualization (Simplified Line Chart) */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8 h-[300px] flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-5 h-5 text-blue-400" />
                          <h4 className="font-bold text-white uppercase tracking-wider text-sm">Engagement Velocity</h4>
                        </div>
                        <div className="flex gap-2">
                          {["1H", "24H", "7D"].map(t => (
                            <button key={t} className={cn("px-3 py-1 rounded-lg text-[10px] font-bold transition-all", t === "24H" ? "bg-white/10 text-white" : "text-white/30 hover:text-white")}>{t}</button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex-1 flex items-end gap-2 pb-2">
                        {messageStats?.data?.map((d: any, i: number) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(20, (d.count / (Math.max(...messageStats.data.map((x: any) => x.count)) || 1)) * 100)}%` }}
                              className="w-full bg-gradient-to-t from-blue-600/40 to-blue-400 rounded-t-lg group-hover:to-white transition-all relative"
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {d.count}
                              </div>
                            </motion.div>
                            <span className="text-[9px] font-bold text-white/20 uppercase">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          </div>
                        )) || (
                          <div className="flex-1 flex items-center justify-center text-white/10">
                            Loading activity data...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Top Contributors */}
                    <div>
                      <h4 className="font-bold text-white uppercase tracking-widest text-xs mb-6 px-1">Top Power Users</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {topContributors?.data?.slice(0, 4).map((user: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-xl" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{user.name}</div>
                              <div className="text-[10px] font-medium text-white/30">{user.count} messages</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "intelligence" && (
                  <motion.div
                    key="intelligence"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-3xl font-bold text-white mb-2">AI Mind Map</h3>
                        <p className="text-white/40 font-medium">Neural processing of your workspace conversations.</p>
                      </div>
                      <button 
                        onClick={generateBrief}
                        disabled={isGeneratingBrief}
                        className={cn(
                          "flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 text-white font-bold text-sm shadow-xl shadow-purple-600/20 hover:scale-105 transition-all",
                          isGeneratingBrief && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Sparkles className={cn("w-4 h-4", isGeneratingBrief && "animate-spin")} />
                        {isGeneratingBrief ? "Synthesizing..." : "Refresh Intelligence"}
                      </button>
                    </div>

                    {/* Intelligence Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Critical Summary */}
                      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/20 rounded-[32px] p-8 space-y-6 min-h-[300px] flex flex-col">
                        <div className="flex items-center gap-3 text-purple-400">
                          <Brain className="w-6 h-6" />
                          <h4 className="font-bold uppercase tracking-widest text-sm">Strategic Recap</h4>
                        </div>
                        
                        {isGeneratingBrief ? (
                          <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                            <Activity className="w-8 h-8 text-purple-400 animate-pulse" />
                            <p className="text-sm font-medium">Reading workspace pulse...</p>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="text-white/80 leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                              {aiBrief || "Click refresh to generate a new workspace brief using Synapse AI."}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            Last updated: {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      {/* Hot Topics / Tags */}
                      <div className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8">
                        <div className="flex items-center gap-3 text-blue-400 mb-8">
                          <TrendingUp className="w-6 h-6" />
                          <h4 className="font-bold uppercase tracking-widest text-sm">Knowledge Clusters</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { tag: "Frontend Optimization", size: "text-lg", weight: "font-black" },
                            { tag: "Supabase DB", size: "text-md", weight: "font-bold" },
                            { tag: "User Feedback", size: "text-xl", weight: "font-black" },
                            { tag: "Marketing Strategy", size: "text-sm", weight: "font-medium" },
                            { tag: "Hiring", size: "text-lg", weight: "font-black" },
                            { tag: "API Docs", size: "text-sm", weight: "font-bold" },
                            { tag: "Bug Fixes", size: "text-md", weight: "font-bold" },
                            { tag: "Q3 Planning", size: "text-xl", weight: "font-black" },
                          ].map((t, i) => (
                            <span key={i} className={cn("px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 transition-all cursor-pointer border border-white/5", t.size, t.weight)}>
                              {t.tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Engine */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8">
                      <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6">Suggested Actions</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { title: "Review #design", desc: "12 unread messages about the new logo.", icon: Search },
                          { title: "Connect with Arpit", desc: "He mentioned you in a task 2h ago.", icon: Users },
                          { title: "Draft Update", desc: "Synthesize your daily progress for the team.", icon: Sparkles },
                        ].map((act, i) => (
                          <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all group cursor-pointer">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                              <act.icon className="w-6 h-6 text-white" />
                            </div>
                            <h5 className="font-bold text-white mb-1">{act.title}</h5>
                            <p className="text-xs text-white/40 leading-relaxed">{act.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "flow" && (
                  <motion.div
                    key="flow"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center justify-center h-full text-center space-y-10 py-10"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-orange-500 blur-[100px] opacity-20 animate-pulse" />
                      <div className="w-32 h-32 rounded-[40px] bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center shadow-2xl relative z-10">
                        <Zap className="w-16 h-16 text-white" />
                      </div>
                    </div>

                    <div className="max-w-md">
                      <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Enter Deep Flow</h3>
                      <p className="text-white/50 font-medium text-lg leading-relaxed">
                        Silence the noise. Enable Flow Mode to mute all notifications and let AI prioritize only critical interruptions for the next 90 minutes.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                      <button className="flex-1 py-4 px-8 rounded-2xl bg-white text-black font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">
                        Activate 90m
                      </button>
                      <button className="px-8 py-4 rounded-2xl bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 transition-all">
                        Custom
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/5 w-full max-w-xl">
                      <div className="flex flex-col items-center gap-2">
                        <BellOff className="w-6 h-6 text-white/40" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">All Muted</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="w-6 h-6 text-white/40" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">AI Gatekeeper On</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
