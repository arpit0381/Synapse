"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Filter, Plus, 
  LayoutGrid, List, Sparkles, TrendingUp,
  Activity, ArrowUpRight
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MemberCard } from "@/components/team/MemberCard";
import { MemberDetailModal } from "@/components/modals/MemberDetailModal";
import { InviteModal } from "@/components/modals/InviteModal";
import { cn } from "@/lib/utils";

export default function TeamsPage() {
  const { currentWorkspace, user, onlineUserIds, currentUserRole } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["workspace-members", currentWorkspace?.id],
    queryFn: () => api.workspaces.getMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const members = membersData?.members || [];

  const filteredMembers = useMemo(() => {
    return members.filter((m: any) => {
      const name = (m.full_name || m.name || "").toLowerCase();
      const username = (m.username || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = name.includes(query) || username.includes(query);
      const matchesRole = filterRole === "all" || m.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, filterRole]);

  const onlineCount = members.filter((m: any) => onlineUserIds.includes(m.id)).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] overflow-hidden">
      {/* Dynamic Header Section */}
      <div className="relative flex-shrink-0 pt-6 md:pt-10 pb-8 md:pb-12 px-4 md:px-8 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/5 blur-[100px] -ml-20 -mb-20 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12">
            <div className="space-y-3 md:space-y-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Team Intelligence</span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-5xl font-black text-white tracking-tight"
              >
                Workspace <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Collective</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm md:text-lg text-white/40 font-medium max-w-2xl leading-relaxed"
              >
                Connect, collaborate, and sync with your team members in real-time.
              </motion.p>
            </div>

            {(currentUserRole === "owner" || currentUserRole === "admin") && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4"
              >
                <button 
                  onClick={() => setInviteModalOpen(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-black font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                >
                  <Plus className="w-5 h-5" />
                  Invite
                </button>
              </motion.div>
            )}
          </div>

          {/* Stats Bar - More compact on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Total", value: members.length, icon: Users, color: "text-blue-400" },
              { label: "Online", value: onlineCount, icon: Activity, color: "text-emerald-400" },
              { label: "Active", value: Math.round(members.length * 0.8), icon: TrendingUp, color: "text-orange-400" },
              { label: "Guests", value: members.filter((m: any) => m.role === "guest").length, icon: Users, color: "text-purple-400" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="bg-white/[0.02] border border-white/5 p-3 md:p-5 rounded-[20px] md:rounded-[24px] hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                  <div className={cn("p-1.5 rounded-lg bg-white/5", stat.color)}>
                    <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/30">{stat.label}</span>
                </div>
                <div className="text-xl md:text-2xl font-black text-white flex items-baseline gap-2">
                  {stat.value}
                  <span className="text-[9px] md:text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                    <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    12%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Section */}
      <div className="px-4 md:px-8 pb-4 md:pb-6 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 py-4 md:py-6 border-y border-white/5">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search collective..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-2.5 md:py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
            />
          </div>

          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-xl whitespace-nowrap">
              {["all", "owner", "admin", "member", "guest"].map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={cn(
                    "px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                    filterRole === role ? "bg-white/10 text-white shadow-sm" : "text-white/30 hover:text-white/60"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-white/5 mx-1 hidden md:block" />

            <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-xl flex-shrink-0">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 md:p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60")}
              >
                <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 md:p-2 rounded-lg transition-all", viewMode === "list" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60")}
              >
                <List className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 md:pb-10 scrollbar-hide">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[240px] md:h-[280px] bg-white/[0.02] border border-white/5 rounded-[20px] md:rounded-[24px]" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <motion.div 
              layout
              className={cn(
                "grid gap-4 md:gap-6",
                viewMode === "grid" 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1"
              )}
            >
              <AnimatePresence mode="popLayout">
                {filteredMembers.map((member: any) => (
                  <MemberCard 
                    key={member.id} 
                    member={member} 
                    onClick={() => setSelectedMember(member)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[32px] bg-white/5 flex items-center justify-center mb-6">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-white/20" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">No members found</h3>
              <p className="text-sm text-white/40 max-w-sm">
                Try adjusting your filters or searching for someone else.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <MemberDetailModal 
        isOpen={!!selectedMember}
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}
