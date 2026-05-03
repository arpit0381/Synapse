"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Hash, Search, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";

export default function RepliesPage() {
  const router = useRouter();
  const { user, currentWorkspace } = useAppStore();

  const { data, isLoading } = useQuery({
    queryKey: ["replies", user?.username, currentWorkspace?.id],
    queryFn: () => api.search.query(`@${user!.username}`, currentWorkspace!.id, "messages"),
    enabled: !!user?.username && !!currentWorkspace?.id,
  });

  const messages = data?.messages || [];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 h-full overflow-y-auto chat-scroll hide-scrollbar">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-accent" />Replies & Mentions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Messages where you were mentioned in {currentWorkspace?.name || "this workspace"}.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-muted/50 h-32 rounded-xl" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground h-[40vh]">
          <Search className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-semibold text-lg mb-1">No mentions found</p>
          <p className="text-sm">You haven't been mentioned in any recent messages.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg: any, i: number) => {
            const author = msg.profiles;
            const channel = msg.channels;
            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.04 }} 
                className="bg-surface border border-border/60 rounded-xl p-5 hover:border-accent/40 transition-all duration-200 group relative shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5 shadow-sm" 
                    style={{ backgroundColor: author?.avatar_url ? "transparent" : stringToColor(author?.full_name || "U") }}
                  >
                    {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(author?.full_name || "U")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-[15px]">{author?.full_name || "User"}</span>
                      {channel && (
                        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium ml-1">
                          <Hash className="w-3 h-3" />
                          <span>{channel.name}</span>
                        </div>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {new Date(msg.created_at).toLocaleDateString()} at {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
                
                {channel && (
                  <button 
                    onClick={() => router.push(`/channels/${channel.id}`)}
                    className="absolute top-1/2 -translate-y-1/2 right-4 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-md translate-x-2 group-hover:translate-x-0"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
