"use client";

import { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Smile, Phone, Video, MoreHorizontal, Search, Check, CheckCheck } from "lucide-react";
import { cn, getInitials, stringToColor, formatTime, getChatDateLabel } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

const STATUS_COLOR: Record<string, string> = { online: "bg-green-500", away: "bg-yellow-500", dnd: "bg-red-500", offline: "bg-muted" };
const STATUS_LABEL: Record<string, string> = { online: "Active now", away: "Away", dnd: "Do Not Disturb", offline: "Offline" };
const EMOJI_QUICK = ["👍", "❤️", "😂", "😮", "🔥"];

export default function DmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, currentWorkspace } = useAppStore();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all members to find this user
  const { data: membersData } = useQuery({
    queryKey: ["workspace_members", currentWorkspace?.id],
    queryFn: () => api.workspaces.getMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });
  
  const dmUserRaw = membersData?.members?.find((m: any) => m.id === id);
  const dmUser = dmUserRaw ? {
    id: dmUserRaw.id,
    name: dmUserRaw.full_name || dmUserRaw.username || "Unknown User",
    status: dmUserRaw.status || "offline",
    bio: dmUserRaw.bio || "No bio available",
    timezone: dmUserRaw.timezone || "UTC",
    avatar_url: dmUserRaw.avatar_url
  } : {
    id, name: "Loading...", status: "offline", bio: "...", timezone: "...", avatar_url: undefined
  };

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["dm_messages", currentWorkspace?.id, id],
    queryFn: () => api.dm.listMessages(currentWorkspace!.id, user!.id, id),
    enabled: !!currentWorkspace?.id && !!user?.id && !!id,
  });

  const rawMessages = messagesData?.messages || [];
  const messages = rawMessages.map((m: any) => ({
    id: m.id,
    from: m.sender?.id === user?.id || m.from_user_id === user?.id ? "me" : "them",
    content: m.content,
    timestamp: new Date(m.created_at),
    is_read: m.is_read,
    metadata: m.metadata || {},
  }));

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Read Receipts logic (Intersection Observer)
  const onMessageRead = (msgId: string) => {
    // Optimistically update
    queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.map((m: any) => m.id === msgId ? { ...m, is_read: true } : m) };
    });
    // Send to backend
    api.dm.markRead(msgId).catch(console.error);
  };

  const onReact = (msgId: string, emoji: string) => {
    if (!user) return;
    // Optimistic update
    queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => {
          if (m.id !== msgId) return m;
          const meta = { ...(m.metadata || {}) };
          const reactions = { ...(meta.reactions || {}) };
          let users = reactions[emoji] || [];
          
          if (users.includes(user.id)) {
            users = users.filter((u: string) => u !== user.id);
          } else {
            users = [...users, user.id];
          }
          
          if (users.length === 0) delete reactions[emoji];
          else reactions[emoji] = users;
          
          return { ...m, metadata: { ...meta, reactions } };
        })
      }
    });
    // Call backend
    api.dm.toggleReaction(msgId, user.id, emoji).catch(console.error);
  };

  // Socket.io Integration
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    socket.emit("join_dm", { userId: user.id });
    
    // Broadcast reading status
    socket.emit("reading_start", { channelId: `dm_${id}`, userId: user.id });

    const handleNewDm = (msg: any) => {
      if (
        msg.workspace_id === currentWorkspace?.id &&
        (msg.from_user_id === id || msg.to_user_id === id)
      ) {
        queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (oldData: any) => {
          if (!oldData) return oldData;
          if (oldData.messages.find((m: any) => m.id === msg.id)) return oldData;
          
          const filteredMessages = oldData.messages.filter((m: any) => 
            !(m.id.toString().startsWith("temp-") && m.content === msg.content)
          );
          return { ...oldData, messages: [...filteredMessages, msg] };
        });
        
        queryClient.invalidateQueries({ queryKey: ["dms", currentWorkspace?.id] });
      }
    };

    const handleMessageRead = ({ messageId }: any) => {
      queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
        if (!old) return old;
        return { ...old, messages: old.messages.map((m: any) => m.id === messageId ? { ...m, is_read: true, justRead: true } : m) };
      });
      // Remove glow flag after animation (1.5s)
      setTimeout(() => {
        queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m: any) => m.id === messageId ? { ...m, justRead: false } : m) };
        });
      }, 1500);
    };

    const handleReaction = ({ messageId, emoji, userId: reactorId, action }: any) => {
      // If we are the reactor, we already did optimistic update
      if (reactorId === user.id) return;

      queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) => {
            if (m.id !== messageId) return m;
            const meta = { ...(m.metadata || {}) };
            const reactions = { ...(meta.reactions || {}) };
            let users = reactions[emoji] || [];
            if (action === "added" && !users.includes(reactorId)) users = [...users, reactorId];
            else if (action === "removed") users = users.filter((u: string) => u !== reactorId);
            
            if (users.length === 0) delete reactions[emoji];
            else reactions[emoji] = users;
            
            return { ...m, metadata: { ...meta, reactions } };
          })
        };
      });
    };

    const handleTypingStart = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${user.id}`) setIsTyping(true); };
    const handleTypingStop = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${user.id}`) setIsTyping(false); };
    const handleReadingStart = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${user.id}`) setIsReading(true); };
    const handleReadingStop = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${user.id}`) setIsReading(false); };

    socket.on("new_dm", handleNewDm);
    socket.on("message_read", handleMessageRead);
    socket.on("dm_reaction_updated", handleReaction);
    socket.on("user_typing", handleTypingStart);
    socket.on("user_stopped_typing", handleTypingStop);
    socket.on("user_reading", handleReadingStart);
    socket.on("user_stopped_reading", handleReadingStop);

    return () => {
      socket.emit("reading_stop", { channelId: `dm_${id}`, userId: user.id });
      socket.off("new_dm", handleNewDm);
      socket.off("message_read", handleMessageRead);
      socket.off("dm_reaction_updated", handleReaction);
      socket.off("user_typing", handleTypingStart);
      socket.off("user_stopped_typing", handleTypingStop);
      socket.off("user_reading", handleReadingStart);
      socket.off("user_stopped_reading", handleReadingStop);
    };
  }, [id, user?.id, currentWorkspace?.id, queryClient]);

  // Send Mutation
  const sendMutation = useMutation({
    mutationFn: (content: string) => api.dm.send({ 
      workspace_id: currentWorkspace!.id, 
      from_user_id: user!.id, 
      to_user_id: id, 
      content 
    }),
    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
      const tempMsg = {
        id: `temp-${Date.now()}`,
        content: newContent,
        created_at: new Date().toISOString(),
        is_read: false,
        from_user_id: user?.id,
        to_user_id: id,
        sender: { id: user?.id, full_name: user?.name, avatar_url: user?.avatar_url }
      };
      queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
        if (!old) return { messages: [tempMsg] };
        return { ...old, messages: [...old.messages, tempMsg] };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
    }
  });

  function send() {
    if (!input.trim() || !user || !currentWorkspace) return;
    sendMutation.mutate(input.trim());
    setInput("");
    inputRef.current?.focus();
  }

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    
    socket.emit("typing_start", { channelId: `dm_${id}`, userId: user?.id, userName: user?.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", { channelId: `dm_${id}`, userId: user?.id });
    }, 2000);
  };

  const groups: { label: string; messages: any[] }[] = [];
  let cur = "";
  messages.forEach((m: any) => {
    const l = getChatDateLabel(m.timestamp);
    if (l !== cur) { cur = l; groups.push({ label: l, messages: [m] }); }
    else groups[groups.length - 1].messages.push(m);
  });

  // Calculate status display string
  let statusDisplay = STATUS_LABEL[dmUser.status] || STATUS_LABEL.offline;
  if (isTyping) statusDisplay = "Typing...";
  else if (isReading) statusDisplay = "Reading...";

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 z-20 sticky top-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-sm" style={{ backgroundColor: dmUser.avatar_url ? "transparent" : stringToColor(dmUser.name) }}>
            {dmUser.avatar_url ? <img src={dmUser.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(dmUser.name)}
          </div>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-surface", STATUS_COLOR[dmUser.status] || STATUS_COLOR.offline)} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-foreground text-[15px] truncate">{dmUser.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-medium truncate">
            {isTyping && (
              <div className="flex gap-0.5 items-center mr-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            <span className={cn("transition-colors duration-300", isTyping ? "text-accent font-semibold" : isReading ? "text-green-500 font-semibold" : "")}>
              {statusDisplay}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-2 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"><Phone className="w-4 h-4" /></button>
          <button className="p-2 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"><Video className="w-4 h-4" /></button>
          <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Search className="w-4 h-4" /></button>
          <button className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll py-4 px-4 space-y-4">
        {isLoading && <div className="text-center text-sm text-muted-foreground py-4 skeleton w-32 mx-auto rounded-full">Loading...</div>}

        {groups.map(({ label, messages: msgs }) => (
          <div key={label}>
            <div className="flex items-center gap-2 py-3">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-surface/50 px-3 py-1 rounded-full border border-border/50 backdrop-blur-sm">{label}</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="space-y-1.5">
              {msgs.map((msg, i) => {
                const isLastInGroup = i === msgs.length - 1 || msgs[i + 1].from !== msg.from;
                return (
                  <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    isMe={msg.from === "me"} 
                    isLast={isLastInGroup}
                    onRead={onMessageRead}
                    onReact={onReact}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-end gap-2 bg-surface rounded-2xl border border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all shadow-sm">
          <div className="flex items-center gap-1 px-3 py-2.5 flex-shrink-0 self-end">
            <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"><Paperclip className="w-4 h-4" /></button>
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTyping}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground py-3.5 resize-none outline-none max-h-[160px] leading-relaxed"
            style={{ minHeight: "48px" }}
          />
          <div className="flex items-center gap-1 px-2 py-2 flex-shrink-0 self-end z-10">
            <button className="p-2 text-muted-foreground hover:text-accent rounded-full hover:bg-accent/10 transition-colors"><Smile className="w-4 h-4" /></button>
            <button 
              onClick={send} 
              disabled={!input.trim() || sendMutation.isPending} 
              className={cn("p-2 rounded-full transition-all duration-300 ml-1 flex items-center justify-center h-[36px] w-[36px]", 
                input.trim() ? "text-white accent-gradient shadow-lg hover:shadow-accent/30 hover:scale-105" : "text-muted-foreground bg-muted"
              )}
            >
              <Send className="w-4 h-4" style={{ marginLeft: "2px" }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble Component ──────────────────────────────────────────────
function MessageBubble({ msg, isMe, isLast, onRead, onReact }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Intersection Observer for Read Receipts
  useEffect(() => {
    if (!isMe && !msg.is_read && !msg.id.toString().startsWith("temp-")) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          onRead(msg.id);
          observer.disconnect();
        }
      }, { threshold: 0.5 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [isMe, msg.is_read, msg.id]);

  const reactionsCount = Object.entries(msg.metadata?.reactions || {}).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={cn("flex group w-full relative", isMe ? "justify-end" : "justify-start", !isLast && "mb-0.5")}
    >
      {/* Reaction Picker Overlay */}
      <AnimatePresence>
        {showPicker && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 5 }}
            className={cn(
              "absolute z-30 -top-10 flex items-center gap-1 p-1 bg-surface border border-border shadow-xl rounded-full",
              isMe ? "right-4" : "left-4"
            )}
            onMouseLeave={() => setShowPicker(false)}
          >
            {EMOJI_QUICK.map(e => (
              <button
                key={e}
                onClick={() => { onReact(msg.id, e); setShowPicker(false); }}
                className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full transition-transform hover:scale-110 text-base"
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("max-w-[75%] relative flex flex-col", isMe ? "items-end" : "items-start")}>
        <div 
          ref={ref}
          onDoubleClick={() => onReact(msg.id, "❤️")}
          className={cn(
            "relative px-4 py-2.5 text-[15px] shadow-sm transition-all duration-300",
            msg.justRead ? "message-glow-effect" : "",
            isMe 
              ? "accent-gradient text-white rounded-2xl rounded-tr-sm" 
              : "bg-surface border border-border/50 text-foreground rounded-2xl rounded-tl-sm",
            isLast && (isMe ? "rounded-br-sm" : "rounded-bl-sm")
          )}
        >
          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          
          <div className={cn("flex items-center gap-1.5 mt-1 select-none", isMe ? "justify-end" : "justify-start")}>
            <span className={cn("text-[10px] font-medium", isMe ? "text-white/80" : "text-muted-foreground/80")}>
              {formatTime(msg.timestamp)}
            </span>
            
            {/* Read Receipt Ticks */}
            {isMe && !msg.id.toString().startsWith("temp-") && (
              <span className={cn("transition-colors duration-300", msg.is_read ? "text-white" : "text-white/40")}>
                {msg.is_read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              </span>
            )}
          </div>
        </div>

        {/* Action Button (Hover) */}
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          isMe ? "-left-10" : "-right-10"
        )}>
          <button 
            onClick={() => setShowPicker(true)}
            className="p-1.5 bg-surface border border-border shadow-sm rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reactions Render */}
        {reactionsCount > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1 z-10", isMe ? "justify-end pr-1" : "justify-start pl-1")}>
            {Object.entries(msg.metadata.reactions).map(([emoji, users]: [string, any]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className="reaction-pop flex items-center gap-1 px-2 py-0.5 bg-surface border border-border rounded-full shadow-sm hover:bg-muted transition-colors"
              >
                <span className="text-xs">{emoji}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
