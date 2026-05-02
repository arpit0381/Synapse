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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2"><Settings className="w-6 h-6 text-accent" />Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{currentWorkspace.name}</p>
      </div>

      {/* Invite Code */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-semibold text-sm mb-3">Invite Code</h3>
        <p className="text-xs text-muted-foreground mb-3">Share this code to invite people to your workspace</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted/30 border border-border rounded-lg px-4 py-2.5 font-mono text-sm tracking-widest">{currentWorkspace.invite_code}</div>
          <button onClick={copyInviteCode} className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            {copiedInvite ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy</>}
          </button>
        </div>
      </motion.div>

      {/* Members */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-accent" />Members ({members.length})</h3>
          {!canManageMembers && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md">View only</span>}
        </div>
        <div className="divide-y divide-border">
          {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="px-6 py-4"><div className="skeleton h-10 rounded-lg" /></div>) :
          members.map((m: any) => {
            const profile = m.profiles || m;
            const name = profile.full_name || profile.username || "User";
            const role = m.role || "member";
            const RoleIcon = ROLE_ICONS[role] || Users;
            const isCurrentUser = m.user_id === user?.id;
            const canChangeRole = canManageMembers && !isCurrentUser && role !== "owner";
            return (
              <div key={m.user_id || m.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/20 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: profile.avatar_url ? "transparent" : stringToColor(name) }}>
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{name}{isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username || "user"}</p>
                </div>
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", ROLE_COLORS[role])}>
                  <RoleIcon className="w-3 h-3" />{role}
                </div>
                {canChangeRole && (
                  <div className="flex items-center gap-1">
                    <select value={role} onChange={(e) => roleChangeMutation.mutate({ userId: m.user_id, role: e.target.value })} className="bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:border-accent">
                      <option value="guest">Guest</option><option value="member">Member</option><option value="admin">Admin</option>
                    </select>
                    <button onClick={() => { if (confirm(`Remove ${name} from workspace?`)) removeMutation.mutate(m.user_id); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"><UserMinus className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
