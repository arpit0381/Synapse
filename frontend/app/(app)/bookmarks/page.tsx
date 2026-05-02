"use client";

import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2, Hash, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor, formatTime } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function BookmarksPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => api.bookmarks.list(user!.id),
    enabled: !!user?.id,
  });
  const bookmarks = data?.bookmarks || [];

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.bookmarks.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks"] }); toast.success("Bookmark removed"); },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2"><Bookmark className="w-6 h-6 text-accent" />Bookmarks</h1>
        <p className="text-sm text-muted-foreground mt-1">Your saved messages</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bookmark className="w-16 h-16 mb-4 opacity-15" />
          <p className="font-semibold text-lg mb-1">No bookmarks yet</p>
          <p className="text-sm">Save messages to find them later</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((b: any, i: number) => {
            const msg = b.messages;
            if (!msg) return null;
            const author = msg.profiles;
            const channel = msg.channels;
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: author?.avatar_url ? "transparent" : stringToColor(author?.full_name || "U") }}>
                    {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(author?.full_name || "U")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{author?.full_name || "User"}</span>
                      {channel && <button onClick={() => router.push(`/channels/${channel.id}`)} className="flex items-center gap-0.5 text-xs text-accent hover:underline"><Hash className="w-3 h-3" />{channel.name}</button>}
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(msg.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <button onClick={() => removeMutation.mutate(b.id)} disabled={removeMutation.isPending} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                    {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
