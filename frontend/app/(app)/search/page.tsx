"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Search, Hash, MessageCircle, CheckSquare, Users, Filter, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor, formatTime } from "@/lib/utils";

type SearchType = "all" | "messages" | "channels" | "tasks";

export default function SearchPage() {
  const router = useRouter();
  const { currentWorkspace } = useAppStore();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", query, type, currentWorkspace?.id],
    queryFn: () => api.search.query(query, currentWorkspace!.id, type),
    enabled: !!query.trim() && !!currentWorkspace?.id,
  });

  const tabs: { id: SearchType; label: string; icon: any; count: number }[] = [
    { id: "all", label: "All", icon: Search, count: (data?.messages?.length || 0) + (data?.channels?.length || 0) + (data?.tasks?.length || 0) + (data?.members?.length || 0) },
    { id: "messages", label: "Messages", icon: MessageCircle, count: data?.messages?.length || 0 },
    { id: "channels", label: "Channels", icon: Hash, count: data?.channels?.length || 0 },
    { id: "tasks", label: "Tasks", icon: CheckSquare, count: data?.tasks?.length || 0 },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2"><Search className="w-6 h-6 text-accent" />Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find anything in {currentWorkspace?.name || "your workspace"}</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages, channels, tasks…" className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3.5 text-[15px] focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all" autoFocus />
        {isFetching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setType(tab.id)} className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors", type === tab.id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}{query.trim() && tab.count > 0 && <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Results */}
      {!query.trim() && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Search className="w-16 h-16 mb-4 opacity-15" />
          <p className="font-semibold text-lg">Search your workspace</p>
          <p className="text-sm mt-1 opacity-60">Type above to find messages, channels, tasks, and people</p>
          <p className="text-xs mt-3 opacity-40">Tip: Press ⌘K anywhere for quick search</p>
        </div>
      )}

      {query.trim() && !isLoading && (
        <div className="space-y-6">
          {/* Messages */}
          {(type === "all" || type === "messages") && (data?.messages?.length || 0) > 0 && (
            <ResultSection title="Messages" icon={MessageCircle}>
              {data!.messages.map((m: any) => (
                <button key={m.id} onClick={() => router.push(`/channels/${m.channel?.id || ""}`)} className="w-full flex items-start gap-3 p-3 bg-background rounded-xl border border-border hover:border-accent/30 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: stringToColor(m.user?.full_name || "U") }}>{m.user?.avatar_url ? <img src={m.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(m.user?.full_name || "U")}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-semibold text-sm">{m.user?.full_name || "User"}</span>{m.channel?.name && <span className="text-xs text-muted-foreground">in #{m.channel.name}</span>}<span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.created_at).toLocaleDateString()}</span></div>
                    <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{m.snippet || m.content}</p>
                  </div>
                </button>
              ))}
            </ResultSection>
          )}

          {/* Channels */}
          {(type === "all" || type === "channels") && (data?.channels?.length || 0) > 0 && (
            <ResultSection title="Channels" icon={Hash}>
              {data!.channels.map((c: any) => (
                <button key={c.id} onClick={() => router.push(`/channels/${c.id}`)} className="w-full flex items-center gap-3 p-3 bg-background rounded-xl border border-border hover:border-accent/30 transition-colors text-left">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Hash className="w-4 h-4 text-accent" /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{c.name}</p>{c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}</div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </ResultSection>
          )}

          {/* Tasks */}
          {(type === "all" || type === "tasks") && (data?.tasks?.length || 0) > 0 && (
            <ResultSection title="Tasks" icon={CheckSquare}>
              {data!.tasks.map((t: any) => (
                <button key={t.id} onClick={() => router.push("/tasks")} className="w-full flex items-center gap-3 p-3 bg-background rounded-xl border border-border hover:border-accent/30 transition-colors text-left">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center"><CheckSquare className="w-4 h-4 text-teal-500" /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{t.title}</p><p className="text-xs text-muted-foreground">{t.status} • {t.priority}</p></div>
                </button>
              ))}
            </ResultSection>
          )}

          {/* Members */}
          {type === "all" && (data?.members?.length || 0) > 0 && (
            <ResultSection title="People" icon={Users}>
              {data!.members.map((m: any) => (
                <button key={m.id} onClick={() => router.push(`/dm/${m.id}`)} className="w-full flex items-center gap-3 p-3 bg-background rounded-xl border border-border hover:border-accent/30 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: stringToColor(m.full_name || "U") }}>{m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(m.full_name || "U")}</div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{m.full_name}</p><p className="text-xs text-muted-foreground capitalize">{m.role}</p></div>
                </button>
              ))}
            </ResultSection>
          )}

          {/* No results */}
          {!isLoading && (data?.messages?.length || 0) === 0 && (data?.channels?.length || 0) === 0 && (data?.tasks?.length || 0) === 0 && (data?.members?.length || 0) === 0 && (
            <div className="text-center py-12 text-muted-foreground"><Search className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No results found for &ldquo;{query}&rdquo;</p></div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{title}</h3>
      <div className="space-y-2">{children}</div>
    </motion.div>
  );
}
