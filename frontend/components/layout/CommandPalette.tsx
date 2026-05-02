"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Hash, CheckSquare, MessageCircle, Users, X, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "message" | "channel" | "task" | "member";
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  avatar?: { name: string; url?: string };
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, currentWorkspace } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [commandPaletteOpen]);

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || !currentWorkspace?.id) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await api.search.query(q, currentWorkspace.id);
      const mapped: SearchResult[] = [];

      // Channels
      (data.channels || []).forEach((c: any) => {
        mapped.push({
          id: c.id,
          type: "channel",
          title: `#${c.name}`,
          subtitle: c.description || "Channel",
          snippet: c.snippet,
          href: `/channels/${c.id}`,
        });
      });

      // Messages
      (data.messages || []).forEach((m: any) => {
        mapped.push({
          id: m.id,
          type: "message",
          title: m.user?.full_name || "User",
          subtitle: m.channel?.name ? `#${m.channel.name}` : "Message",
          snippet: m.snippet || m.content?.slice(0, 120),
          href: `/channels/${m.channel?.id || ""}`,
          avatar: { name: m.user?.full_name || "U", url: m.user?.avatar_url },
        });
      });

      // Tasks
      (data.tasks || []).forEach((t: any) => {
        mapped.push({
          id: t.id,
          type: "task",
          title: t.title,
          subtitle: `${t.status} • ${t.priority}`,
          snippet: t.snippet,
          href: "/tasks",
        });
      });

      // Members
      (data.members || []).forEach((m: any) => {
        mapped.push({
          id: m.id,
          type: "member",
          title: m.full_name || m.username || "User",
          subtitle: m.role || "Member",
          href: `/dm/${m.id}`,
          avatar: { name: m.full_name || "U", url: m.avatar_url },
        });
      });

      setResults(mapped);
      setSelectedIdx(0);
    } catch (err) {
      console.error("[Search] Error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      navigate(results[selectedIdx].href);
    }
  }

  function navigate(href: string) {
    setCommandPaletteOpen(false);
    router.push(href);
  }

  const TYPE_ICONS = {
    message: MessageCircle,
    channel: Hash,
    task: CheckSquare,
    member: Users,
  };

  const TYPE_LABELS = {
    message: "Messages",
    channel: "Channels",
    task: "Tasks",
    member: "Members",
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Flat index mapping for keyboard nav
  let flatIdx = 0;

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-surface border border-border rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages, channels, tasks, people…"
                className="flex-1 bg-transparent text-foreground text-[15px] placeholder:text-muted-foreground outline-none"
                autoFocus
              />
              <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 bg-muted text-muted-foreground text-[10px] font-mono rounded-md border border-border">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {!query.trim() && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Start typing to search</p>
                  <p className="text-xs mt-1 opacity-60">Search across messages, channels, tasks, and people</p>
                </div>
              )}

              {query.trim() && isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching…</span>
                </div>
              )}

              {query.trim() && !isSearching && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
                </div>
              )}

              {Object.entries(grouped).map(([type, items]) => {
                const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
                const label = TYPE_LABELS[type as keyof typeof TYPE_LABELS];
                return (
                  <div key={type}>
                    <div className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />
                      {label}
                    </div>
                    {items.map((item) => {
                      const idx = flatIdx++;
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.href)}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            isSelected ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"
                          )}
                        >
                          {item.avatar ? (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: item.avatar.url ? "transparent" : stringToColor(item.avatar.name) }}
                            >
                              {item.avatar.url ? (
                                <img src={item.avatar.url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                getInitials(item.avatar.name)
                              )}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-accent" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{item.title}</span>
                              {item.subtitle && (
                                <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                              )}
                            </div>
                            {item.snippet && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.snippet}</p>
                            )}
                          </div>
                          {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer hints */}
            {results.length > 0 && (
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> Navigate</span>
                <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> Open</span>
                <span className="flex items-center gap-1">ESC Close</span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
