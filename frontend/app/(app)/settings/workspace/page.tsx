"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Users, Crown, Shield, UserMinus, Copy, Check, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { toast } from "react-hot-toast";

const ROLE_ICONS: Record<string, any> = { owner: Crown, admin: Shield, member: Users, guest: Users };
const ROLE_COLORS: Record<string, string> = { owner: "text-amber-400 bg-amber-500/10", admin: "text-purple-400 bg-purple-500/10", member: "text-blue-400 bg-blue-500/10", guest: "text-gray-400 bg-gray-500/10" };
const ROLE_HIERARCHY = ["guest", "member", "admin", "owner"];

export default function WorkspaceSettingsPage() {
  const { currentWorkspace, user, currentUserRole } = useAppStore();
  const queryClient = useQueryClient();
  const [copiedInvite, setCopiedInvite] = useState(false);
  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["workspace_members", currentWorkspace?.id],
    queryFn: () => api.workspaces.getMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });
  const members = membersData?.members || [];

  const roleChangeMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => api.workspaces.updateMemberRole(currentWorkspace!.id, userId, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workspace_members"] }); toast.success("Role updated"); },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.workspaces.removeMember(currentWorkspace!.id, userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workspace_members"] }); toast.success("Member removed"); },
    onError: (err: any) => toast.error(err.message),
  });

  function copyInviteCode() {
    if (currentWorkspace?.invite_code) {
      navigator.clipboard.writeText(currentWorkspace.invite_code);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
      toast.success("Invite code copied!");
    }
  }

  if (!currentWorkspace) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl md:text-4xl tracking-tight flex items-center gap-3 text-foreground">
            <div className="p-2 md:p-2.5 rounded-2xl bg-accent/10">
              <Settings className="w-6 h-6 md:w-8 md:h-8 text-accent" />
            </div>
            Workspace Settings
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-2 md:mt-3 px-1">{currentWorkspace.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Invite & Info */}
        <div className="xl:col-span-4 space-y-6 md:space-y-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-bold text-[15px]">Invite Code</h3>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground mb-6">Share this unique code to instantly invite teammates to your digital sanctum.</p>
            
            <div className="space-y-3">
              <div className="w-full bg-background/50 border border-border/40 rounded-xl px-4 py-3.5 font-mono text-sm tracking-[0.2em] text-center text-foreground font-bold shadow-inner">
                {currentWorkspace.invite_code}
              </div>
              <button 
                onClick={copyInviteCode} 
                className={cn(
                  "w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 btn-press shadow-lg shadow-accent/10",
                  copiedInvite ? "bg-green-500 text-white" : "accent-gradient text-white"
                )}
              >
                {copiedInvite ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy Invite Code</>}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Members List */}
        <div className="xl:col-span-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface/50 backdrop-blur-sm border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
            <div className="px-6 md:px-8 py-5 md:py-6 border-b border-border/40 flex items-center justify-between bg-surface/30">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-[15px] md:text-lg">Members <span className="text-muted-foreground font-medium text-sm ml-1 opacity-60">({members.length})</span></h3>
              </div>
              {!canManageMembers && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/40">View only</span>}
            </div>
            
            <div className="divide-y divide-border/30">
              {isLoading ? [...Array(3)].map((_, i) => (
                <div key={i} className="px-6 md:px-8 py-6"><div className="skeleton h-12 w-full rounded-2xl" /></div>
              )) :
              members.map((m: any) => {
                const profile = m.profiles || m;
                const name = profile.full_name || profile.username || "User";
                const role = m.role || "member";
                const RoleIcon = ROLE_ICONS[role] || Users;
                const isCurrentUser = m.user_id === user?.id;
                const canChangeRole = canManageMembers && !isCurrentUser && role !== "owner";
                
                return (
                  <div key={m.user_id || m.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 md:px-8 py-5 hover:bg-muted/10 transition-colors group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md transition-transform group-hover:scale-105" style={{ backgroundColor: profile.avatar_url ? "transparent" : stringToColor(name) }}>
                        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14.5px] font-bold text-foreground truncate">{name}</p>
                          {isCurrentUser && <span className="text-[9px] font-black uppercase tracking-tighter bg-accent/10 text-accent px-1.5 py-0.5 rounded-md border border-accent/20">You</span>}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium opacity-60 truncate">@{profile.username || "user"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:min-w-max ml-14 sm:ml-0">
                      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all", ROLE_COLORS[role].replace("bg-", "border-").replace("/10", "/20"), ROLE_COLORS[role])}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        {role}
                      </div>

                      {canChangeRole && (
                        <div className="flex items-center gap-2">
                          <select 
                            value={role} 
                            onChange={(e) => roleChangeMutation.mutate({ userId: m.user_id, role: e.target.value })} 
                            className="bg-muted/30 border border-border/40 rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer"
                          >
                            <option value="guest">Guest</option>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button 
                            onClick={() => { if (confirm(`Remove ${name} from workspace?`)) removeMutation.mutate(m.user_id); }} 
                            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all btn-press"
                            title="Remove from workspace"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
