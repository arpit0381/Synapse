"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Check, CheckCheck, MessageCircle, AtSign,
  CheckSquare, X, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, any> = {
  mention: AtSign,
  dm: MessageCircle,
  task_assigned: CheckSquare,
  system: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  mention: "text-purple-400 bg-purple-500/10",
  dm: "text-blue-400 bg-blue-500/10",
  task_assigned: "text-teal-400 bg-teal-500/10",
  system: "text-amber-400 bg-amber-500/10",
};

export function NotificationDropdown() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUnreadNotifications } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.notifications.list(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000, // Poll every 30s
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // Sync global unread count after render (avoids setState-during-render)
  useEffect(() => {
    if (unreadCount !== useAppStore.getState().unreadNotifications) {
      setUnreadNotifications(unreadCount);
    }
  }, [unreadCount, setUnreadNotifications]);

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setUnreadNotifications(0);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  function handleNotificationClick(notif: any) {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
    setIsOpen(false);
  }

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const unread = notifications.filter((n: any) => !n.is_read);
  const read = notifications.filter((n: any) => n.is_read);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full text-[9px] font-bold text-white flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "fixed sm:absolute inset-x-4 sm:inset-auto sm:right-0 top-[15%] sm:top-full mt-0 sm:mt-2",
                "w-auto sm:w-[380px] max-h-[70vh] sm:max-h-[480px]",
                "bg-surface border border-border rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col"
              )}
            >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" />
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs text-accent hover:text-accent/80 font-medium transition-colors flex items-center gap-1"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3" />
                  )}
                  Mark all read
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto sm:max-h-[400px]">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                </div>
              )}

              {!isLoading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs mt-1 opacity-60">You&apos;re all caught up!</p>
                </div>
              )}

              {/* Unread */}
              {unread.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    New ({unread.length})
                  </div>
                  {unread.map((notif: any) => (
                    <NotificationItem key={notif.id} notif={notif} onClick={handleNotificationClick} />
                  ))}
                </>
              )}

              {/* Read */}
              {read.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Earlier
                  </div>
                  {read.map((notif: any) => (
                    <NotificationItem key={notif.id} notif={notif} onClick={handleNotificationClick} />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ notif, onClick }: { notif: any; onClick: (n: any) => void }) {
  const Icon = TYPE_ICONS[notif.type] || Bell;
  const colorClass = TYPE_COLORS[notif.type] || TYPE_COLORS.system;

  return (
    <button
      onClick={() => onClick(notif)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        !notif.is_read && "bg-accent/5"
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", !notif.is_read && "font-semibold")}>{notif.title}</p>
          {!notif.is_read && (
            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
