"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, CheckSquare, MessageCircle, ArrowUpRight, ArrowDownRight, Trophy, Activity } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = { backlog: "Backlog", in_progress: "In Progress", in_review: "In Review", done: "Done" };
const STATUS_COLORS: Record<string, string> = { backlog: "#94a3b8", in_progress: "#7F77DD", in_review: "#EF9F27", done: "#1D9E75" };

function StatCard({ icon: Icon, label, value, change, color, bgColor }: { icon: any; label: string; value: string | number; change?: number; color: string; bgColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-2xl p-5 hover:border-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgColor)}><Icon className={cn("w-5 h-5", color)} /></div>
        {change !== undefined && change !== 0 && (
          <div className={cn("flex items-center gap-0.5 text-xs font-medium", change > 0 ? "text-green-500" : "text-red-500")}>
            {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { currentWorkspace } = useAppStore();
  const [messageDays, setMessageDays] = useState(30);
  const { data: msgData } = useQuery({ queryKey: ["analytics", "messages", currentWorkspace?.id, messageDays], queryFn: () => api.analytics.messages(currentWorkspace!.id, messageDays), enabled: !!currentWorkspace?.id });
  const { data: memberData } = useQuery({ queryKey: ["analytics", "members", currentWorkspace?.id], queryFn: () => api.analytics.members(currentWorkspace!.id), enabled: !!currentWorkspace?.id });
  const { data: taskData } = useQuery({ queryKey: ["analytics", "tasks", currentWorkspace?.id], queryFn: () => api.analytics.tasks(currentWorkspace!.id), enabled: !!currentWorkspace?.id });
  const { data: contribData } = useQuery({ queryKey: ["analytics", "contributors", currentWorkspace?.id], queryFn: () => api.analytics.contributors(currentWorkspace!.id), enabled: !!currentWorkspace?.id });

  const messageStats = msgData?.data || [];
  const totalMessages = messageStats.reduce((a: number, b: { count: number }) => a + b.count, 0);
  const todayMessages = messageStats[messageStats.length - 1]?.count || 0;
  const yesterdayMessages = messageStats[messageStats.length - 2]?.count || 0;
  const msgChange = yesterdayMessages > 0 ? Math.round(((todayMessages - yesterdayMessages) / yesterdayMessages) * 100) : 0;
  const maxMsgCount = Math.max(...messageStats.map((d: any) => d.count), 1);
  const contributors = contribData?.data || [];
  const maxContribCount = contributors[0]?.count || 1;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-fluid-2xl tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-accent" />
            Analytics
          </h1>
          <p className="text-fluid-xs font-medium text-muted-foreground mt-1.5 opacity-70">Workspace activity for {currentWorkspace?.name || "workspace"}</p>
        </div>
        <select value={messageDays} onChange={(e) => setMessageDays(Number(e.target.value))} className="bg-surface border border-border/60 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-accent/50 transition-all shadow-sm">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard icon={MessageCircle} label="Total Messages" value={totalMessages} change={msgChange} color="text-purple-400" bgColor="bg-purple-500/10" />
        <StatCard icon={Users} label="Team Members" value={memberData?.total || 0} color="text-blue-400" bgColor="bg-blue-500/10" />
        <StatCard icon={CheckSquare} label="Total Tasks" value={taskData?.total || 0} color="text-teal-400" bgColor="bg-teal-500/10" />
        <StatCard icon={Activity} label="Completion Rate" value={`${taskData?.completion_rate || 0}%`} color="text-amber-400" bgColor="bg-amber-500/10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent" />Message Activity</h3>
          <div className="flex items-end gap-[2px] h-[200px]">
            {messageStats.map((d: any, i: number) => (
              <motion.div key={d.date} initial={{ height: 0 }} animate={{ height: `${(d.count / maxMsgCount) * 100}%` }} transition={{ delay: i * 0.015, duration: 0.3 }} className="flex-1 min-w-[3px] bg-accent/70 rounded-t-sm hover:bg-accent transition-colors cursor-pointer group relative" title={`${d.date}: ${d.count} messages`}>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-foreground text-background text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 font-medium shadow-lg">{d.date}: {d.count}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground"><span>{messageStats[0]?.date || ""}</span><span>{messageStats[messageStats.length - 1]?.date || ""}</span></div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-accent" />Task Status</h3>
          {taskData?.breakdown && (
            <div className="space-y-4">
              {Object.entries(taskData.breakdown).map(([status, count]) => {
                const pct = Math.round(((count as number) / (taskData.total || 1)) * 100);
                return (<div key={status}><div className="flex items-center justify-between text-xs mb-1.5"><span className="font-medium">{STATUS_LABELS[status]}</span><span className="text-muted-foreground font-mono">{count as number} ({pct}%)</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} /></div></div>);
              })}
              <div className="flex items-center justify-center pt-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" /><motion.circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" stroke={STATUS_COLORS.done} strokeDasharray={`${2*Math.PI*40}`} initial={{strokeDashoffset:2*Math.PI*40}} animate={{strokeDashoffset:2*Math.PI*40*(1-(taskData.completion_rate||0)/100)}} transition={{duration:1}} strokeLinecap="round" /></svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold">{taskData.completion_rate||0}%</span><span className="text-[9px] text-muted-foreground">Done</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" />Top Contributors (30 days)</h3>
        {contributors.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p> : (
          <div className="space-y-3">{contributors.map((c: any, i: number) => (
            <motion.div key={c.userId} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{backgroundColor:c.avatar_url?"transparent":stringToColor(c.name)}}>{c.avatar_url?<img src={c.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/>:getInitials(c.name)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{c.name}</p><div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1"><motion.div initial={{width:0}} animate={{width:`${(c.count/maxContribCount)*100}%`}} transition={{duration:0.5,delay:i*0.1}} className="h-full bg-accent rounded-full"/></div></div>
              <span className="text-xs font-mono text-muted-foreground">{c.count} msgs</span>
            </motion.div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
