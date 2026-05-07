"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, UserPlus, Shield, Trash2, Check, X,
  Building2, Globe, Copy, Mail, MoreHorizontal,
  ArrowUpCircle, ArrowDownCircle, ShieldCheck
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const ROLE_CONFIG = {
  owner: { label: "Owner", icon: ShieldCheck, color: "text-red-400", bg: "bg-red-500/10" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
  member: { label: "Member", icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
  guest: { label: "Guest", icon: Globe, color: "text-muted-foreground", bg: "bg-muted" },
};

export default function WorkspaceSettingsPage() {
  const { currentWorkspace, user: currentUser, currentUserRole } = useAppStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"general" | "members">("members");

  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  // ── Fetch Members ──────────────────────────────────────────────
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["workspace_members", currentWorkspace?.id],
    queryFn: () => api.workspaces.getMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const members = membersData?.members || [];

  // ── Mutations ──────────────────────────────────────────────────
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: string }) => 
      api.workspaces.updateMemberRole(currentWorkspace!.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace_members", currentWorkspace?.id] });
      toast.success("Member role updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update role"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.workspaces.removeMember(currentWorkspace!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace_members", currentWorkspace?.id] });
      toast.success("Member removed from workspace");
    },
  });

  const copyInviteCode = () => {
    if (!currentWorkspace?.invite_code) return;
    navigator.clipboard.writeText(currentWorkspace.invite_code);
    toast.success("Invite code copied to clipboard!");
  };

  if (!currentWorkspace) return null;

  return (
    <div className="p-8 space-y-10 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <Building2 className="w-8 h-8 text-accent" />
          Workspace Management
        </h1>
        <p className="text-muted-foreground font-medium">Manage members, roles, and global workspace preferences.</p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border/40">
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "pb-3 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === "members" ? "text-accent" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Team Members
          {activeTab === "members" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "pb-3 text-sm font-bold uppercase tracking-widest transition-all relative",
            activeTab === "general" ? "text-accent" : "text-muted-foreground hover:text-foreground"
          )}
        >
          General Settings
          {activeTab === "general" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-full" />}
        </button>
      </div>

      {activeTab === "members" && (
        <div className="space-y-8">
          {/* Invite Section */}
          <section className="p-6 rounded-3xl bg-accent/5 border border-accent/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-xl shadow-accent/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-foreground">Invite New Members</h3>
                <p className="text-xs text-muted-foreground font-medium">Share your workspace invite code with your team.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-surface border border-border rounded-xl font-mono text-sm font-bold tracking-widest">
                {currentWorkspace.invite_code}
              </div>
              <button onClick={copyInviteCode} className="p-2.5 rounded-xl bg-accent text-white hover:opacity-90 transition-all btn-press">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* Members List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Team ({members.length})</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Filter</span>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>

            <div className="bg-surface/50 border border-border rounded-[32px] overflow-hidden">
              <div className="divide-y divide-border/40">
                {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-20 w-full" />) : 
                  members.map((m: any) => {
                    const rc = ROLE_CONFIG[m.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.member;
                    const isSelf = m.id === currentUser?.id;
                    const canManage = isAdmin && !isSelf && (currentUserRole === 'owner' || m.role !== 'owner');

                    return (
                      <div key={m.id} className="p-5 flex items-center gap-4 hover:bg-muted/30 transition-all group">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-border/40 flex-shrink-0" style={{ backgroundColor: stringToColor(m.full_name || 'U') }}>
                          {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : <span className="text-sm font-black text-white flex items-center justify-center h-full">{getInitials(m.full_name || 'U')}</span>}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-foreground truncate">{m.full_name || 'Unknown User'}</h4>
                            {isSelf && <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-accent text-[9px] font-black uppercase">You</span>}
                          </div>
                          <p className="text-xs text-muted-foreground opacity-60 font-medium">@{m.username || 'user'}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className={cn("px-3 py-1 rounded-full flex items-center gap-2 border transition-all", rc.bg, rc.color, "border-current/20")}>
                            <rc.icon className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{rc.label}</span>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              {/* Promotion/Demotion Buttons */}
                              {currentUserRole === 'owner' && m.role !== 'admin' && (
                                <button 
                                  onClick={() => updateRoleMutation.mutate({ userId: m.id, role: 'admin' })}
                                  className="p-2 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-colors"
                                  title="Promote to Admin"
                                >
                                  <ArrowUpCircle className="w-5 h-5" />
                                </button>
                              )}
                              {currentUserRole === 'owner' && m.role === 'admin' && (
                                <button 
                                  onClick={() => updateRoleMutation.mutate({ userId: m.id, role: 'member' })}
                                  className="p-2 rounded-xl text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                  title="Demote to Member"
                                >
                                  <ArrowDownCircle className="w-5 h-5" />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  if (confirm("Are you sure you want to remove this member?")) {
                                    removeMemberMutation.mutate(m.id);
                                  }
                                }}
                                className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remove from Workspace"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "general" && (
        <div className="space-y-12">
           <section className="p-8 rounded-[32px] bg-surface/50 border border-border space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground">Workspace Identity</h3>
                  <p className="text-sm text-muted-foreground font-medium">Public name and branding.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Workspace Name</label>
                  <input 
                    disabled={!isAdmin}
                    defaultValue={currentWorkspace.name}
                    className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 text-foreground font-bold transition-all disabled:opacity-50"
                  />
                </div>
                {isAdmin && (
                  <button className="px-6 py-3 rounded-2xl bg-foreground text-background text-sm font-black hover:opacity-90 transition-all btn-press">
                    Save Changes
                  </button>
                )}
              </div>
           </section>

           {isOwner && (
             <section className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/20 space-y-6">
                <div className="flex items-center gap-4 mb-4 text-red-400">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Danger Zone</h3>
                    <p className="text-sm opacity-60 font-medium">Irreversible workspace actions.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <div>
                    <h4 className="font-black text-red-400">Delete this workspace</h4>
                    <p className="text-xs text-red-400/60 font-medium">Once deleted, all data is permanently lost.</p>
                  </div>
                  <button className="px-6 py-3 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 uppercase tracking-widest">
                    Delete Workspace
                  </button>
                </div>
             </section>
           )}
        </div>
      )}
    </div>
  );
}
