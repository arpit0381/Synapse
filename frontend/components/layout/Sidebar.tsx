"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Hash, Lock, MessageCircle, LayoutDashboard, CheckSquare, FolderOpen,
  Bot, Phone, Search, BarChart3, Focus, Settings, Plus, ChevronDown,
  ChevronRight, Bell, Circle, X, Users, Zap, Volume2, Bookmark
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { CreateChannelModal } from "@/components/modals/CreateChannelModal";
import { WorkspaceSwitcherModal } from "@/components/modals/WorkspaceSwitcherModal";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const STATUS_COLORS = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  dnd: "bg-red-500",
  offline: "bg-muted",
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks" },
  { icon: FolderOpen, label: "Files", href: "/files" },
  { icon: Bot, label: "AI Assistant", href: "/ai-assistant" },
  { icon: Search, label: "Search", href: "/search", shortcut: "⌘K" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Bookmark, label: "Bookmarks", href: "/bookmarks" },
  { icon: Focus, label: "Focus Mode", href: "/focus-mode" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const store = useAppStore();
  const callStore = useCallStore();
  const {
    user, currentWorkspace, channels, sidebarOpen, workspaces,
    setSidebarOpen, setCurrentWorkspace, setChannels, presenceMap, onlineUserIds
  } = store;

  const [isCreateChannelOpen, setCreateChannelOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);

  useEffect(() => {
    // If we have loaded the workspaces list and it's explicitly empty, force the user to create/join one
    if (workspaces && workspaces.length === 0) {
      setWorkspaceSwitcherOpen(true);
    }
  }, [workspaces]);

  const displayUser = user;
  const displayWorkspace = currentWorkspace;
  const displayChannels = channels;

  const publicChannels = displayChannels.filter((c) => !c.is_private);
  const privateChannels = displayChannels.filter((c) => c.is_private);

  // Fetch real DMs
  const { data: dmsData } = useQuery({
    queryKey: ["dms", currentWorkspace?.id],
    queryFn: () => api.dm.listConversations(currentWorkspace!.id, user!.id),
    enabled: !!currentWorkspace?.id && !!user?.id,
  });

  const dms = dmsData?.conversations || [];


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
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 60 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-30 flex flex-col",
          "bg-surface border-r border-border overflow-hidden",
          "lg:relative lg:z-auto",
          // Mobile: slide in/out
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: sidebarOpen ? 240 : 60 }}
      >
        {/* ── Workspace Header ── */}
        <div 
          onClick={() => setWorkspaceSwitcherOpen(true)}
          className="group flex items-center gap-3 px-4 py-4 border-b border-border flex-shrink-0 cursor-pointer hover:bg-muted/80 transition-all duration-200"
        >
          <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center flex-shrink-0 shadow-sm text-white group-hover:scale-105 transition-transform duration-200">
            <Zap className="w-5 h-5" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0 flex flex-col justify-center"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-[15px] text-foreground truncate tracking-tight">
                    {displayWorkspace?.name || "Join Workspace"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <div className="flex items-center mt-0.5">
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-wider bg-accent/10 px-1.5 py-0.5 rounded-md">
                    Free Plan
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {/* Main Nav */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn("sidebar-item", isActive && "active")}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex-1 flex items-center justify-between min-w-0"
                      >
                        <span className="truncate">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{item.shortcut}</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            );
          })}

          {/* ── Channels ── */}
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-3"
            >
              {/* Section: Channels */}
              <div className="px-3 mb-1 flex items-center justify-between group">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Channels
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  title="Add channel"
                  onClick={() => setCreateChannelOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {publicChannels.map((ch) => {
                const isActive = pathname.includes(ch.id);
                const activeCall = callStore.activeGroupCalls[ch.id];
                return (
                  <Link key={ch.id} href={`/channels/${ch.id}`}>
                    <div className={cn("sidebar-item group/ch", isActive && "active")}>
                      <Hash className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{(ch as any).name}</span>
                      
                      {activeCall && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </div>
                          <Volume2 className="w-3.5 h-3.5 text-green-500 animate-pulse" />
                        </div>
                      )}

                      {((ch as any).unread_count ?? 0) > 0 && !activeCall && (
                        <span className="ml-auto text-xs bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center flex-shrink-0">
                          {(ch as any).unread_count}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* Private channels */}
              {privateChannels.length > 0 && (
                <>
                  <div className="px-3 mb-1 mt-3 flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Private
                    </span>
                  </div>
                  {privateChannels.map((ch) => (
                    <Link key={ch.id} href={`/channels/${ch.id}`}>
                      <div className={cn("sidebar-item", pathname.includes(ch.id) && "active")}>
                        <Lock className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{ch.name}</span>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* ── Direct Messages ── */}
              <div className="px-3 mb-1 mt-4 flex items-center justify-between group">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Direct Messages
                </span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {dms.map((dm: any) => {
                const partner = dm.other_user || dm;
                const partnerName = partner.full_name || partner.name || partner.username || "User";
                return (
                <Link key={partner.id} href={`/dm/${partner.id}`}>
                  <div className={cn("sidebar-item", pathname.includes(partner.id) && "active")}>
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: stringToColor(partnerName) }}
                      >
                        {getInitials(partnerName)}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface",
                        STATUS_COLORS[(presenceMap[partner.id]?.status as keyof typeof STATUS_COLORS) || (onlineUserIds.includes(partner.id) ? "online" : (partner.status as keyof typeof STATUS_COLORS)) || "offline"] || STATUS_COLORS.offline
                      )} />
                    </div>
                    <span className="flex-1 truncate text-sm">{partnerName.split(" ")[0]}</span>
                    {dm.unread > 0 && (
                      <span className="ml-auto text-xs bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center flex-shrink-0">
                        {dm.unread}
                      </span>
                    )}
                  </div>
                </Link>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* ── User Footer ── */}
        <div className="px-2 py-2 border-t border-border flex-shrink-0">
          {displayUser ? (
            <Link href="/settings/profile">
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: stringToColor(displayUser.name) }}
                  >
                    {displayUser.avatar_url ? (
                      <img src={displayUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(displayUser.name)
                    )}
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface",
                    STATUS_COLORS[(presenceMap[displayUser.id]?.status as keyof typeof STATUS_COLORS) || (onlineUserIds.includes(displayUser.id) ? "online" : (displayUser.status as keyof typeof STATUS_COLORS)) || "online"] || STATUS_COLORS.online
                  )} />
                </div>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-xs font-medium text-foreground truncate">{displayUser.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{displayUser.status_message || "Active"}</p>
                  </motion.div>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
               <span className="text-xs text-muted-foreground">Not signed in</span>
            </div>
          )}
        </div>
      </motion.aside>

      <CreateChannelModal isOpen={isCreateChannelOpen} onClose={() => setCreateChannelOpen(false)} />
      <WorkspaceSwitcherModal isOpen={isWorkspaceSwitcherOpen} onClose={() => setWorkspaceSwitcherOpen(false)} />
    </>
  );
}
