"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Hash, Lock, MessageCircle, LayoutDashboard, CheckSquare, FolderOpen,
  Bot, Search, BarChart3, Plus, ChevronDown, ChevronRight, Users, Zap,
  Volume2, Inbox, MoreHorizontal, ArrowUpCircle, LayoutGrid
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { CreateChannelModal } from "@/components/modals/CreateChannelModal";
import { WorkspaceSwitcherModal } from "@/components/modals/WorkspaceSwitcherModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

const STATUS_COLORS = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  dnd: "bg-red-500",
  offline: "bg-muted-foreground/30",
};

const RAIL_ITEMS = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: CheckSquare, label: "Planner", href: "/tasks" },
  { icon: Bot, label: "AI", href: "/ai-assistant" },
  { icon: Users, label: "Teams", href: "/teams" },
  { icon: LayoutGrid, label: "Apps Hub", href: "/apps" },
  { icon: FolderOpen, label: "Files", href: "/files" },
  { icon: BarChart3, label: "Dashboard", href: "/analytics" },
];

const CONTEXT_MENU = [
  { icon: Inbox, label: "Inbox", href: "/inbox" },
  { icon: MessageCircle, label: "Replies", href: "/replies" },
  { icon: CheckSquare, label: "My Tasks", href: "/tasks" },
  { icon: MoreHorizontal, label: "More", href: "/more" },
];

// ── Tooltip for Rail Items ──
function RailTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative w-full flex justify-center" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-[100] px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold whitespace-nowrap shadow-xl pointer-events-none"
          >
            {label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[4px] w-2 h-2 rotate-45 bg-foreground rounded-sm" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Collapsible Section ──
function SidebarSection({ title, children, onAdd, defaultOpen = true }: { title: string; children: React.ReactNode; onAdd?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-5 mb-1">
      <div className="flex items-center justify-between px-4 mb-1.5 group cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <span className="text-[12px] font-bold tracking-[0.03em]">{title}</span>
          <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-90")} />
        </div>
        {onAdd && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-all duration-150 text-muted-foreground hover:text-accent p-1 rounded hover:bg-accent/10 btn-press"
            title={`Add ${title}`}
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-[2px]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const store = useAppStore();
  const callStore = useCallStore();
  const {
    user, currentWorkspace, channels, sidebarOpen, workspaces,
    setSidebarOpen, presenceMap, onlineUserIds
  } = store;

  const [isCreateChannelOpen, setCreateChannelOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const queryClient = useQueryClient();

  const isChatRoute = pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/channels") || pathname.startsWith("/dm");

  useEffect(() => {
    if (workspaces && workspaces.length === 0) {
      setWorkspaceSwitcherOpen(true);
    }
  }, [workspaces]);

  // Socket setup for channels
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !channels.length) return;
    channels.forEach((ch) => {
      socket.emit("join_channel", { channelId: ch.id });
    });
  }, [channels]);

  // Socket setup for messages & DMs
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const handleNewMessage = (msg: any) => {
      const channelId = msg.channel_id || msg.channelId;
      const userId = msg.user_id || msg.userId;

      if (pathname === `/channels/${channelId}`) return;
      if (userId !== user.id) {
        // Update Query Cache
        queryClient.setQueryData(["channels", currentWorkspace?.id], (old: any) => {
          if (!old?.channels) return old;
          return {
            ...old,
            channels: old.channels.map((c: any) =>
              c.id === channelId ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c
            )
          };
        });
        // Also update store as fallback
        store.incrementUnreadCount(channelId);
      }
    };

    const handleNewDm = (msg: any) => {
      if (!currentWorkspace || !user) return;
      const fromId = msg.from_user_id || msg.fromUserId || msg.sender_id;
      const toId = msg.to_user_id || msg.toUserId || msg.receiver_id;

      if (!fromId) return;

      const otherUserId = fromId === user.id ? toId : fromId;
      if (pathname === `/dm/${otherUserId}`) return;

      if (fromId !== user.id) {
        queryClient.setQueryData(["dms", currentWorkspace.id], (old: any) => {
          if (!old?.conversations) return old;
          return {
            ...old,
            conversations: old.conversations.map((c: any) => {
              const partnerId = c.other_user?.id || c.id;
              if (partnerId === otherUserId) return { ...c, unread: (c.unread || 0) + 1 };
              return c;
            }),
          };
        });
      }
    };

    const handleNotification = () => {
      store.setUnreadNotifications(store.unreadNotifications + 1);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("new_dm", handleNewDm);
    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("new_dm", handleNewDm);
      socket.off("notification:new", handleNotification);
    };
  }, [pathname, user, currentWorkspace, store, queryClient]);

  const displayUser = user;
  const publicChannels = channels.filter((c) => !c.is_private);
  const privateChannels = channels.filter((c) => c.is_private);

  // Real DMs in real time 
  const { data: dmsData } = useQuery({
    queryKey: ["dms", currentWorkspace?.id],
    queryFn: () => api.dm.listConversations(currentWorkspace!.id, user!.id),
    enabled: !!currentWorkspace?.id && !!user?.id,
  });
  const dms = dmsData?.conversations || [];

  const getStatus = (userId: string) => {
    return (presenceMap[userId]?.status as keyof typeof STATUS_COLORS)
      || (onlineUserIds.includes(userId) ? "online" : "offline");
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed left-0 top-0 bottom-0 z-50 flex h-full transition-transform duration-300 ease-in-out",
        "lg:relative lg:z-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* ── Icon Rail (Primary Nav) ── */}
        <div className="w-[76px] bg-[#4B39EF] dark:bg-[#3B28CC] border-r border-black/10 flex-shrink-0 flex flex-col items-center py-4 z-50 shadow-xl relative">
          {/* Workspace Button */}
          <RailTooltip label="Switch Workspace">
            <button
              onClick={() => setWorkspaceSwitcherOpen(true)}
              className="w-12 h-12 rounded-[14px] bg-white text-[#4B39EF] flex items-center justify-center shadow-lg hover:scale-105 hover:rounded-[10px] transition-all duration-300 btn-press group relative mb-6"
            >
              <Zap className="w-6 h-6 group-hover:animate-pulse" />
            </button>
          </RailTooltip>

          <div className="w-8 h-px bg-white/20 mb-4" />

          {/* Rail Nav Items */}
          <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto hide-scrollbar">
            {RAIL_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <RailTooltip key={item.href} label={item.label}>
                  <Link href={item.href} onClick={() => setSidebarOpen(true)} className="w-full flex flex-col items-center group/rail">
                    <div className="relative flex flex-col items-center py-2 w-full">
                      {/* Active indicator line */}
                      {isActive && (
                        <motion.div layoutId="rail-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                      )}

                      <div className={cn(
                        "w-[46px] h-[46px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group-hover/rail:bg-white/10",
                        isActive ? "bg-white/20 text-white" : "text-white/70"
                      )}>
                        <item.icon className={cn("w-6 h-6 transition-transform duration-200", !isActive && "group-hover/rail:scale-110")} />
                      </div>
                      <span className={cn("text-[10px] font-medium mt-1 tracking-wide", isActive ? "text-white" : "text-white/70")}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </RailTooltip>
              );
            })}
          </div>

          <div className="w-8 h-px bg-white/20 my-4" />

          {/* Profile / Upgrade */}
          <div className="flex flex-col items-center gap-4 w-full">
            <RailTooltip label="Upgrade Plan">
              <button className="flex flex-col items-center group/upgrade btn-press">
                <div className="w-[46px] h-[46px] rounded-2xl bg-gradient-to-tr from-[#8E2DE2] to-[#4A00E0] flex items-center justify-center shadow-lg group-hover/upgrade:scale-105 transition-all duration-300">
                  <ArrowUpCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/90 mt-1">Upgrade</span>
              </button>
            </RailTooltip>

            {displayUser && (
              <RailTooltip label="Profile Settings">
                <Link href="/settings/profile" className="relative group/profile btn-press">
                  <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-br from-white/30 to-white/10 group-hover/profile:from-white group-hover/profile:to-white/50 transition-all duration-300">
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden border-[1.5px] border-[#4B39EF] text-white font-bold text-xs" style={{ backgroundColor: displayUser.avatar_url ? 'transparent' : stringToColor(displayUser.name) }}>
                      {displayUser.avatar_url ? <img src={displayUser.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(displayUser.name)}
                    </div>
                  </div>
                  <div className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#4B39EF]", STATUS_COLORS[getStatus(displayUser.id)] || STATUS_COLORS.online)} />
                </Link>
              </RailTooltip>
            )}
          </div>
        </div>

        {/* ── Context Panel (Secondary Sidebar) ── */}
        <div
          className={cn(
            "bg-surface/95 backdrop-blur-xl border-r border-border/60 overflow-hidden flex flex-col h-full z-40 shadow-2xl lg:shadow-none transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            (sidebarOpen && isChatRoute) ? "w-[260px] opacity-100" : "w-0 border-r-0 opacity-0"
          )}
        >
          <div className="w-[260px] flex flex-col h-full">
            {/* Header Context */}
            <div className="px-5 py-5 border-b border-border/40 flex-shrink-0 flex items-center justify-between">
              <h1 className="font-display font-bold text-lg text-foreground tracking-tight truncate pr-2">
                {currentWorkspace?.name || "Workspace"}
              </h1>
              <div className="flex gap-1.5">
                <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Search className="w-4 h-4" /></button>
                <button onClick={() => setCreateChannelOpen(true)} className="p-1.5 rounded-lg bg-[#4B39EF] text-white shadow-sm hover:opacity-90 hover:scale-105 transition-all"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto chat-scroll py-3">

              {/* Top Context Menu */}
              <div className="px-3 mb-6 space-y-[2px]">
                {CONTEXT_MENU.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.label} href={item.href}>
                      <div className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-[14px] font-medium transition-all duration-200 group relative", isActive ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                        <item.icon className={cn("w-[18px] h-[18px] transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                        <span className="flex-1">{item.label}</span>
                        {item.label === "Inbox" && store.unreadNotifications > 0 && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            {store.unreadNotifications}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Channels */}
              <SidebarSection title="Channels" onAdd={() => setCreateChannelOpen(true)}>
                {publicChannels.map((ch) => {
                  const isActive = pathname.includes(ch.id);
                  const activeCall = callStore.activeGroupCalls[ch.id];
                  const unread = (ch as any).unread_count ?? 0;
                  return (
                    <Link key={ch.id} href={`/channels/${ch.id}`}>
                      <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl mx-2 text-[14px] transition-all duration-200 group/ch", isActive ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                        <Hash className={cn("w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200", isActive ? "text-accent" : "text-muted-foreground/60 group-hover/ch:rotate-12")} />
                        <span className={cn("flex-1 truncate", unread > 0 && !isActive && "text-foreground font-bold")}>{(ch as any).name}</span>

                        {activeCall && (
                          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0 bg-green-500/15 px-2 py-0.5 rounded-full">
                            <div className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></div>
                            <Volume2 className="w-3 h-3 text-green-600 animate-pulse" />
                          </div>
                        )}
                        {unread > 0 && !activeCall && <span className="bg-[#4B39EF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto shadow-sm shadow-accent/20">{unread > 99 ? "99+" : unread}</span>}
                      </div>
                    </Link>
                  );
                })}
              </SidebarSection>

              {/* Private Channels */}
              {privateChannels.length > 0 && (
                <SidebarSection title="Private Channels">
                  {privateChannels.map((ch) => {
                    const isActive = pathname.includes(ch.id);
                    return (
                      <Link key={ch.id} href={`/channels/${ch.id}`}>
                        <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl mx-2 text-[14px] transition-all duration-200", isActive ? "bg-accent/10 text-accent font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                          <Lock className={cn("w-[18px] h-[18px] flex-shrink-0", isActive ? "text-accent" : "text-muted-foreground/60")} />
                          <span className="flex-1 truncate">{ch.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </SidebarSection>
              )}

              {/* Direct Messages */}
              <SidebarSection title="Direct Messages">
                {dms.map((dm: any) => {
                  const partner = dm.other_user || dm;
                  const partnerName = partner.full_name || partner.name || partner.username || "User";
                  const isActive = pathname.includes(partner.id);
                  const status = getStatus(partner.id);
                  const unread = dm.unread || 0;
                  return (
                    <Link key={partner.id} href={`/dm/${partner.id}`}>
                      <div className={cn("flex items-center gap-3 px-3 py-2 rounded-xl mx-2 transition-all duration-200", isActive ? "bg-accent/10 text-accent" : "hover:bg-muted/50")}>
                        <div className="relative flex-shrink-0 shadow-sm">
                          <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden ring-1 ring-border/50" style={{ backgroundColor: stringToColor(partnerName) }}>
                            {partner.avatar_url ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(partnerName)}
                          </div>
                          <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px] border-surface transition-colors", STATUS_COLORS[status] || STATUS_COLORS.offline, status === "online" && "status-online-ring")} />
                        </div>
                        <span className={cn("flex-1 truncate text-[14px]", isActive ? "font-semibold text-accent" : unread > 0 ? "text-foreground font-bold" : "text-muted-foreground font-medium")}>{partnerName}</span>
                        {unread > 0 && <span className="bg-[#4B39EF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto shadow-sm shadow-accent/20">{unread > 99 ? "99+" : unread}</span>}
                      </div>
                    </Link>
                  );
                })}
              </SidebarSection>

            </div>
          </div>
        </div>
      </div>

      <CreateChannelModal isOpen={isCreateChannelOpen} onClose={() => setCreateChannelOpen(false)} />
      <WorkspaceSwitcherModal isOpen={isWorkspaceSwitcherOpen} onClose={() => setWorkspaceSwitcherOpen(false)} />
    </>
  );
}
