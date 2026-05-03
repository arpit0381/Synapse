"use client";

import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, CheckCircle2, Loader2, Bell } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function InboxPage() {
  const { user } = useAppStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.notifications.list(user!.id, 50),
    enabled: !!user?.id,
  });
  const notifications = data?.notifications || [];

  const readMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(user!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("All marked as read"); },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 h-full overflow-y-auto chat-scroll hide-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-accent" />Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your notifications and updates across all workspaces.</p>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={() => readAllMutation.mutate()} 
            disabled={readAllMutation.isPending} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-sm font-medium hover:bg-muted transition-colors btn-press"
          >
            {readAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />} Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse bg-muted/50 h-20 rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground h-[40vh]">
          <Bell className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-semibold text-lg mb-1">You're all caught up!</p>
          <p className="text-sm">No new notifications right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any, i: number) => (
            <motion.div 
              key={n.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.04 }} 
              className={cn(
                "bg-surface border rounded-xl p-4 transition-all duration-200 group flex items-start gap-4", 
                n.is_read ? "border-border/50 opacity-60 hover:opacity-100" : "border-accent/40 shadow-sm shadow-accent/5"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                n.is_read ? "bg-muted text-muted-foreground" : "bg-[#4B39EF]/10 text-[#4B39EF]"
              )}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("font-semibold text-[15px]", !n.is_read && "text-foreground")}>{n.title || "Notification"}</span>
                  <span className="text-[11px] text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{n.content}</p>
              </div>
              {!n.is_read && (
                <button 
                  onClick={() => readMutation.mutate(n.id)} 
                  disabled={readMutation.isPending} 
                  className="p-1.5 text-green-500 hover:bg-green-500/15 rounded-md transition-all opacity-0 group-hover:opacity-100 btn-press" 
                  title="Mark as read"
                >
                  {readMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
