"use client";

import { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Hash, Send, Paperclip, Smile, AtSign, Bot, Search,
  Pin, Users, Settings, Phone, Video, MoreHorizontal,
  Reply, Bookmark, Trash2, Check, Clock, ChevronDown,
  X, File, Image as ImageIcon, Download, Sparkles, Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import ChatToolbar from "@/components/chat/ChatToolbar";

import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { cn, getInitials, stringToColor, formatTime, getChatDateLabel } from "@/lib/utils";
import { CallBanner } from "@/components/layout/CallBanner";

// ── Types ─────────────────────────────────────────────────────────────
interface DbMessage {
  id: string;
  user_id: string;
  content: string;
  content_type: string;
  created_at: string;
  is_pinned: boolean;
  metadata?: any;
  profiles?: { id: string; full_name: string; username: string; avatar_url?: string };
  reactions?: { emoji: string; user_id: string }[];
  thread_count?: [{ count: number }];
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  content: string;
  timestamp: Date;
  reactions?: Record<string, string[]>;
  replyCount?: number;
  isPinned?: boolean;
  metadata?: any;
}

const EMOJI_QUICK = ["👍", "❤️", "😂", "😮", "🔥", "🚀", "✅", "👀"];
const EMOJI_FULL = [
  "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰",
  "👍","👎","👏","🙌","👐","🤲","🤝","🙏","✍️","💪","🤌","🤌🏻","🤌🏼","🤌🏽","🤌🏾","🤌🏿",
  "🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","⚓","⛽","🚧","🚥","🚦","🔥",
  "🎉","🎊","🎈","🎂","🎁","🎀","🎄","🎃","🧨","✨","🎋","🎌","🎎"
];

// ── Components ────────────────────────────────────────────────────────
function Avatar({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-9 h-9 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-muted overflow-hidden shadow-sm", sz)} style={{ backgroundColor: url ? "transparent" : stringToColor(name) }}>
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : getInitials(name)}
    </div>
  );
}

function MessageBubble({ msg, isOwn, currentUserId, onReact, onReply, onBookmark, onPin }: { msg: Message; isOwn: boolean; currentUserId?: string; onReact: (id: string, emoji: string) => void; onReply: () => void; onBookmark?: (id: string) => void; onPin?: (id: string) => void }) {
  const [showEmoji, setShowEmoji] = useState(false);
  
  const isSystem = msg.userId === "system" || msg.metadata?.type === "system";

  if (isSystem) {
    return (
      <div className="flex items-center gap-3 px-8 py-3 group">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground/80 bg-muted/30 px-4 py-1.5 rounded-full border border-border/40 backdrop-blur-sm">
          <span className="text-accent">{msg.content}</span>
          <span className="text-[10px] opacity-60">• {formatTime(msg.timestamp)}</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      </div>
    );
  }

  const reactionsCount = Object.keys(msg.reactions || {}).length;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="message-row group">
      {/* Floating Action Bar */}
      <div className="msg-actions">
        <div className="relative">
          <button onClick={() => setShowEmoji(!showEmoji)} className="msg-action-btn" title="React">
            <Smile className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showEmoji && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 4 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                className="absolute right-0 top-full mt-2 bg-surface/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-2 flex flex-wrap gap-0.5 z-50 w-[200px]"
              >
                {EMOJI_QUICK.map(e => (
                  <button key={e} onClick={() => { onReact(msg.id, e); setShowEmoji(false); }}
                    className="w-9 h-9 flex items-center justify-center text-lg hover:bg-muted rounded-xl transition-all hover:scale-125">{e}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={onReply} className="msg-action-btn" title="Reply"><Reply className="w-4 h-4" /></button>
        {onBookmark && <button onClick={() => onBookmark(msg.id)} className="msg-action-btn" title="Bookmark"><Bookmark className="w-4 h-4" /></button>}
        {onPin && <button onClick={() => onPin(msg.id)} className="msg-action-btn" title="Pin"><Pin className="w-4 h-4" /></button>}
        <div className="w-px h-5 bg-border mx-0.5" />
        <button onClick={copyToClipboard} className="msg-action-btn" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      </div>

      <div className="flex gap-3.5">
        <Avatar name={msg.userName} url={msg.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-[14px] text-foreground hover:underline cursor-pointer">{msg.userName}</span>
            {msg.isPinned && <Pin className="w-3 h-3 text-accent" />}
            <span className="text-[11px] font-medium text-muted-foreground/60">{formatTime(msg.timestamp)}</span>
          </div>
          
          {msg.metadata?.reply_to && (
            <div className="mb-2 flex items-start gap-2 pl-2.5 border-l-2 border-accent/40 text-xs rounded-r-lg py-1.5 px-2 bg-accent/5 cursor-pointer hover:bg-accent/10 transition-colors -ml-0.5">
              <div>
                <div className="font-bold mb-0.5 text-accent text-[11px]">{msg.metadata.reply_to.senderName}</div>
                <div className="truncate max-w-[400px] text-muted-foreground">{msg.metadata.reply_to.content}</div>
              </div>
            </div>
          )}

          <div className="text-[14.5px] text-foreground/90 leading-[1.65] whitespace-pre-wrap break-words">
            {msg.content}
          </div>
          
          {/* Attachment Preview */}
          {msg.metadata?.attachment && (
            <div className="mt-2 relative">
              {msg.metadata.attachment.type?.includes('image') && msg.metadata.attachment.url ? (
                <div className="relative inline-block">
                  <a href={msg.metadata.attachment.isUploading ? "#" : msg.metadata.attachment.url} target={msg.metadata.attachment.isUploading ? "_self" : "_blank"} rel="noopener noreferrer" className={cn("block max-w-[400px] rounded-xl overflow-hidden border border-border/30 mt-1 bg-black/5 hover:opacity-90 transition-opacity shadow-sm", msg.metadata.attachment.isUploading && "opacity-60 pointer-events-none blur-[1px]")}>
                    <img src={msg.metadata.attachment.url} alt={msg.metadata.attachment.name || "Image attachment"} className="w-full h-auto object-contain max-h-[300px]" />
                  </a>
                  {msg.metadata.attachment.isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white font-medium shadow-xl"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Uploading...</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn("relative inline-block", msg.metadata.attachment.isUploading && "opacity-70 pointer-events-none")}>
                  <div className="max-w-sm rounded-xl border border-border bg-surface/80 p-3 flex items-start gap-3 hover:bg-muted/50 transition-all cursor-pointer shadow-sm" onClick={() => { if(msg.metadata.attachment.url && !msg.metadata.attachment.isUploading) window.open(msg.metadata.attachment.url, '_blank'); }}>
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">{msg.metadata.attachment.isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <File className="w-5 h-5" />}</div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-semibold truncate text-foreground">{msg.metadata.attachment.name || "Attachment"}</p>
                      <p className="text-xs text-muted-foreground">{msg.metadata.attachment.size ? (msg.metadata.attachment.size / 1024).toFixed(1) + " KB • " : ""}{msg.metadata.attachment.type?.split('/')[1]?.toUpperCase() || "FILE"}</p>
                    </div>
                    {msg.metadata.attachment.url && !msg.metadata.attachment.isUploading && (
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors btn-press" onClick={(e) => { e.stopPropagation(); window.open(msg.metadata.attachment.url, '_blank'); }}><Download className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reactions */}
          {reactionsCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 z-10">
              {Object.entries(msg.reactions!).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={cn(
                    "reaction-pop flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs transition-all duration-200 hover:scale-105 btn-press",
                    currentUserId && users.includes(currentUserId)
                      ? "bg-accent/10 border-accent/30 text-accent font-semibold shadow-sm" 
                      : "bg-surface/80 border-border/50 text-muted-foreground hover:bg-muted hover:border-border"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] font-semibold">{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, currentWorkspace, presenceMap, onlineUserIds, updateUnreadCount } = useAppStore();
  const queryClient = useQueryClient();
  const callStore = useCallStore();

  const handleCall = async (type: "audio" | "video") => {
    if (callStore.isCalling && callStore.callRoomId === id) return; // already in this call
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === "video", audio: true });
      callStore.setLocalStream(stream);
      callStore.setCalling({ isCalling: true, roomId: id, isGroupCall: true, callType: type, channelName: channel.name });
      const socket = getSocket();
      socket.emit("join-call", {
        roomId: id,
        userId: user?.id,
        userName: user?.name,
        channelName: channel.name,
        workspaceId: currentWorkspace?.id
      });
    } catch (e) {
      console.error("Failed to get media", e);
    }
  };
  
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // id -> name
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Right Sidebar States
  const [rightPanel, setRightPanel] = useState<"members" | "search" | "pins" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Channel Info & Members
  const { data: channelData } = useQuery({
    queryKey: ["channel", id],
    queryFn: () => api.channels.get(id),
  });
  const channel = channelData?.channel || { name: "...", description: "Loading..." };

  // Clear unread count when channel is opened
  useEffect(() => {
    updateUnreadCount(id, 0);
  }, [id, updateUnreadCount]);

  const { data: membersData } = useQuery({
    queryKey: ["channel_members", id],
    queryFn: () => api.channels.getMembers(id),
  });

  // 2. Fetch Messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.messages.list(id),
  });

  const rawMessages: DbMessage[] = messagesData?.messages || [];
  
  const displayMessages: Message[] = rawMessages.map(m => {
    const reactionsMap: Record<string, string[]> = {};
    m.reactions?.forEach((r: any) => {
      if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];
      reactionsMap[r.emoji].push(r.user_id);
    });

    const isSys = m.user_id === "system" || m.metadata?.type === "system";

    return {
      id: m.id,
      userId: isSys ? "system" : (m.profiles?.id || m.user_id),
      userName: isSys ? "System" : (m.profiles?.full_name || m.profiles?.username || "Unknown User"),
      avatarUrl: m.profiles?.avatar_url,
      content: m.content,
      timestamp: new Date(m.created_at),
      isPinned: m.is_pinned,
      metadata: m.metadata || {},
      reactions: reactionsMap,
    };
  });

  // Derived Search Results
  const searchResults = displayMessages.filter(m => searchQuery.trim() && m.content.toLowerCase().includes(searchQuery.toLowerCase()));

  // Auto-scroll on new messages
  useEffect(() => {
    if (!rightPanel) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, rightPanel]);

  // 3. Socket.io Integration
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    const joinChannel = () => {
      socket.emit("join_channel", { channelId: id });
    };

    if (socket.connected) joinChannel();
    socket.on("connect", joinChannel);

    const handleNewMessage = (msg: any) => {
      if (msg.channel_id === id) {
        // Optimistically update react-query cache
        queryClient.setQueryData(["messages", id], (oldData: any) => {
          if (!oldData) return oldData;
          if (oldData.messages.find((m: any) => m.id === msg.id)) return oldData;
          
          const filteredMessages = oldData.messages.filter((m: any) => 
            !(m.id.toString().startsWith("temp-") && m.content === msg.content)
          );

          return { ...oldData, messages: [...filteredMessages, msg] };
        });
        
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
        
        // Remove typing indicator if it was this user
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[msg.profiles?.id || msg.user_id];
          return next;
        });
      }
    };

    const handleReactionChange = (messageId: string, emoji: string, reactorId: string, action: "added" | "removed") => {
      if (reactorId === user.id) return;
      
      queryClient.setQueryData(["messages", id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m: any) => {
            if (m.id !== messageId) return m;
            const currentReactions = m.reactions ? [...m.reactions] : [];
            const filteredReactions = currentReactions.filter((r: any) => !(r.emoji === emoji && r.user_id === reactorId));
            
            if (action === "added") {
              filteredReactions.push({ emoji, user_id: reactorId });
            }
            return { ...m, reactions: filteredReactions };
          })
        };
      });
    };

    const handleReactionAdded = (data: any) => handleReactionChange(data.messageId, data.emoji, data.userId, "added");
    const handleReactionRemoved = (data: any) => handleReactionChange(data.messageId, data.emoji, data.userId, "removed");

    const handleTypingStart = ({ userId, userName }: any) => {
      if (userId !== user?.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: userName }));
      }
    };

    const handleTypingStop = ({ userId }: any) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("new_message", handleNewMessage);
    socket.on("reaction_added", handleReactionAdded);
    socket.on("reaction_removed", handleReactionRemoved);
    socket.on("user_typing", handleTypingStart);
    socket.on("user_stopped_typing", handleTypingStop);

    return () => {
      socket.off("connect", joinChannel);
      socket.off("new_message", handleNewMessage);
      socket.off("reaction_added", handleReactionAdded);
      socket.off("reaction_removed", handleReactionRemoved);
      socket.off("user_typing", handleTypingStart);
      socket.off("user_stopped_typing", handleTypingStop);
    };
  }, [id, user?.id, queryClient]);

  const onReact = (msgId: string, emoji: string) => {
    if (!user) return;
    
    // Optimistic update
    queryClient.setQueryData(["messages", id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.map((m: any) => {
          if (m.id !== msgId) return m;
          
          const currentReactions = m.reactions ? [...m.reactions] : [];
          const existingIdx = currentReactions.findIndex((r: any) => r.emoji === emoji && r.user_id === user.id);
          
          if (existingIdx !== -1) {
            currentReactions.splice(existingIdx, 1);
          } else {
            currentReactions.push({ emoji, user_id: user.id });
          }
          
          return { ...m, reactions: currentReactions };
        })
      };
    });
    
    // Call backend
    api.messages.toggleReaction(msgId, user.id, emoji).catch(console.error);
  };

  // 4. Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async (data: { content: string, metadata?: any, file?: File }) => {
      let finalMetadata = { ...data.metadata };
      
      if (data.file) {
        const { uploadUrl, token, publicUrl } = await api.files.getUploadUrl({
          filename: data.file.name,
          contentType: data.file.type,
          workspaceId: currentWorkspace!.id,
          channelId: id,
          userId: user!.id,
          sizeBytes: data.file.size
        });
        
        await api.files.upload(uploadUrl, data.file, token);
        
        finalMetadata.attachment = {
          name: data.file.name,
          size: data.file.size,
          type: data.file.type,
          url: publicUrl
        };
      }
      
      return api.messages.send({ channel_id: id, content: data.content || " ", user_id: user!.id, metadata: finalMetadata });
    },
    onMutate: async (newMsgData) => {
      // Optimitic update
      await queryClient.cancelQueries({ queryKey: ["messages", id] });
      const previous = queryClient.getQueryData(["messages", id]);
      
      let tempAttachment = newMsgData.metadata?.attachment;
      if (newMsgData.file) {
        tempAttachment = {
          name: newMsgData.file.name,
          size: newMsgData.file.size,
          type: newMsgData.file.type,
          url: URL.createObjectURL(newMsgData.file),
          isUploading: true
        };
      }
      
      const tempMsg = {
        id: `temp-${Date.now()}`,
        content: newMsgData.content,
        created_at: new Date().toISOString(),
        metadata: { ...newMsgData.metadata, attachment: tempAttachment },
        profiles: { id: user?.id, full_name: user?.name, avatar_url: user?.avatar_url }
      };

      queryClient.setQueryData(["messages", id], (old: any) => {
        if (!old) return { messages: [tempMsg] };
        return { ...old, messages: [...old.messages, tempMsg] };
      });
      return { previous };
    },
    onError: (err, newMsg, context: any) => {
      toast.error("Failed to send message: " + err.message);
      if (context?.previous) {
        queryClient.setQueryData(["messages", id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    }
  });

  async function handleSend() {
    if (!input.trim() && !attachment) return;
    
    // Stop typing indicator early
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    getSocket()?.emit("typing_stop", { channelId: id, userId: user?.id });

    const metadata: any = {};
    if (replyTo) metadata.reply_to = replyTo;
    
    let currentInput = input.trim();
    let currentAttachment = attachment;

    // Clear input early so user can continue typing
    setInput("");
    setReplyTo(null);
    setAttachment(null);
    inputRef.current?.focus();
    
    sendMutation.mutate({ content: currentInput || " ", metadata, file: currentAttachment || undefined });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    
    // Typing indicator throttle
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    const socket = getSocket();
    if (e.target.value.trim()) {
      socket?.emit("typing_start", { channelId: id, userId: user?.id, userName: user?.name });
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit("typing_stop", { channelId: id, userId: user?.id });
      }, 2000);
    } else {
      socket?.emit("typing_stop", { channelId: id, userId: user?.id });
    }
  }
  
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
      inputRef.current?.focus();
    }
  }

  // Group messages
  const groupedMessages: { label: string; messages: Message[] }[] = [];
  let currentLabel = "";
  displayMessages.forEach(msg => {
    const label = getChatDateLabel(msg.timestamp);
    if (label !== currentLabel) {
      currentLabel = label;
      groupedMessages.push({ label, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex h-full w-full relative">
      <div className="flex flex-col flex-1 h-full bg-background relative min-w-0">
        {/* ── TopBar ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 glass-strong flex-shrink-0 z-20 sticky top-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Hash className="w-4 h-4 text-accent" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-display font-bold text-foreground text-[15px] truncate tracking-tight">{channel.name}</h2>
              {channel.description && (
                <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{channel.description}</p>
              )}
            </div>
          </div>

          {/* Active members stack */}
          {membersData?.members && (
            <div className="hidden md:flex items-center -space-x-2 mr-2">
              {membersData.members.slice(0, 4).map((m: any) => {
                const isOn = onlineUserIds.includes(m.id);
                return (
                  <div key={m.id} className={cn("w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[9px] font-bold text-white transition-all", isOn ? "ring-1 ring-green-500/40" : "opacity-60")} style={{ backgroundColor: stringToColor(m.full_name || m.username || "U") }} title={m.full_name || m.username}>
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(m.full_name || m.username || "U")}
                  </div>
                );
              })}
              {membersData.members.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-surface bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">+{membersData.members.length - 4}</div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={async () => { if (isSummarizing) return; setIsSummarizing(true); try { const data = await api.ai.summarize({ messages: displayMessages.map(m => ({ user: m.userName, content: m.content })), channel_name: channel.name }); setAiSummary(data.summary); } catch (e) { console.error(e); } finally { setIsSummarizing(false); } }} className={cn("p-2 rounded-lg transition-all btn-press", isSummarizing ? "text-accent animate-pulse" : "text-muted-foreground hover:text-accent hover:bg-accent/10")} title="AI Summarize">{isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}</button>
            <button onClick={() => handleCall("audio")} className="p-2 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all btn-press" title="Audio Call"><Phone className="w-4 h-4" /></button>
            <button onClick={() => handleCall("video")} className="p-2 rounded-lg text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-all btn-press" title="Video Call"><Video className="w-4 h-4" /></button>
            <div className="w-px h-5 bg-border/40 mx-1" />
            <button onClick={() => setRightPanel(rightPanel === "pins" ? null : "pins")} className={cn("p-2 rounded-lg transition-all btn-press", rightPanel === "pins" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Pins"><Pin className="w-4 h-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "search" ? null : "search")} className={cn("p-2 rounded-lg transition-all btn-press", rightPanel === "search" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Search"><Search className="w-4 h-4" /></button>
            <button onClick={() => setRightPanel(rightPanel === "members" ? null : "members")} className={cn("p-2 rounded-lg transition-all btn-press", rightPanel === "members" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted")} title="Members"><Users className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto chat-scroll py-4">
          {/* AI Summary Banner */}
          <AnimatePresence>
            {aiSummary && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mx-5 mb-3 bg-accent/5 border border-accent/20 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2"><span className="text-xs font-bold text-accent flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Summary</span><button onClick={() => setAiSummary(null)} className="p-0.5 rounded hover:bg-muted text-muted-foreground"><X className="w-3 h-3" /></button></div>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Call banner */}
          <CallBanner channelId={id} channelName={channel.name} />
          {isLoading && (
            <div className="flex flex-col gap-4 p-6">
              <div className="skeleton h-12 w-3/4 rounded-2xl opacity-50" />
              <div className="skeleton h-12 w-1/2 rounded-2xl opacity-50" />
              <div className="skeleton h-24 w-2/3 rounded-2xl opacity-50" />
            </div>
          )}

          {!isLoading && displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-10">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-5 text-accent shadow-inner">
                <Hash className="w-10 h-10" />
              </div>
              <h3 className="font-display font-bold text-2xl mb-2 tracking-tight">Welcome to #{channel.name}!</h3>
              <p className="text-muted-foreground text-[15px] max-w-sm">
                This is the start of the #{channel.name} channel. Be the first to break the ice!
              </p>
            </div>
          )}

          {groupedMessages.map(({ label, messages: msgs }) => (
            <div key={label}>
              <div className="flex items-center gap-3 px-5 py-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
                <span className="text-[10px] text-muted-foreground/80 font-bold border border-border/40 bg-surface/80 backdrop-blur-sm px-3 py-1 rounded-full uppercase tracking-[0.08em]">{label}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
              </div>
              <div className="space-y-0.5">
                {msgs.map(msg => (
                  <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    isOwn={msg.userId === user?.id} 
                    currentUserId={user?.id}
                    onReact={onReact}
                    onReply={() => setReplyTo({ id: msg.id, content: msg.content, senderName: msg.userName })}
                    onBookmark={(msgId) => { api.bookmarks.toggle(user!.id, msgId).then(r => { toast.success(r.action === 'added' ? 'Bookmarked!' : 'Removed bookmark'); }).catch(console.error); }}
                    onPin={(msgId) => { api.pins.add(id, msgId, user!.id).then(() => toast.success('Pinned!')).catch((e: any) => toast.error(e.message)); }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Live Typing Indicator */}
          <AnimatePresence>
            {typingNames.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex items-center gap-3 px-5 py-2 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted/50 rounded-2xl rounded-bl-sm border border-border/50">
                  {[0, 1, 2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  <strong className="text-foreground">{typingNames.join(", ")}</strong> {typingNames.length === 1 ? "is" : "are"} typing…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} className="h-4" />
        </div>

        {/* ── Input Area ── */}
        <div className="flex-shrink-0 px-5 py-3 glass-strong z-10">
          
          {replyTo && (
            <div className="flex items-center justify-between bg-surface border border-border rounded-t-2xl px-4 py-2.5 mx-1 -mb-1 shadow-sm">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] font-bold text-accent flex items-center gap-1 uppercase tracking-wider">
                  <Reply className="w-3 h-3" /> Replying to {replyTo.senderName}
                </span>
                <span className="text-[13px] text-muted-foreground truncate mt-0.5 font-medium">{replyTo.content}</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {attachment && (
            <div className={cn("flex items-center justify-between bg-surface border border-border px-4 py-3 mx-1 -mb-1 shadow-sm", replyTo ? "border-t-0" : "rounded-t-2xl")}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                  {attachment.type.includes("image") ? <ImageIcon className="w-5 h-5" /> : <File className="w-5 h-5" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-foreground truncate">{attachment.name}</span>
                  <span className="text-[11px] text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <button onClick={() => setAttachment(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className={cn("flex items-end gap-2 bg-surface border border-border focus-within:border-accent/80 focus-within:ring-4 focus-within:ring-accent/10 transition-all shadow-sm relative", (replyTo || attachment) ? "rounded-b-none rounded-t-none" : "rounded-t-2xl rounded-b-none")}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={`Message #${channel.name}`}
              rows={1}
              className="flex-1 bg-transparent text-[14.5px] text-foreground placeholder:text-muted-foreground py-3.5 px-4 resize-none outline-none max-h-[200px] leading-relaxed"
              style={{ minHeight: "48px" }}
            />

            <div className="flex items-center gap-1 px-2 py-2 flex-shrink-0 self-end z-10 relative">
              <AnimatePresence>
                {showInputEmoji && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-[calc(100%+10px)] right-0 w-[280px] h-[300px] bg-surface border border-border rounded-xl shadow-2xl overflow-y-auto z-50 p-3"
                  >
                    <div className="grid grid-cols-6 gap-1">
                      {EMOJI_FULL.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setInput(prev => prev + emoji);
                            setShowInputEmoji(false);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center justify-center aspect-square text-xl hover:bg-muted rounded-lg transition-transform hover:scale-110"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={handleSend} 
                disabled={(!input.trim() && !attachment) || sendMutation.isPending} 
                className={cn("p-2 rounded-full transition-all duration-300 ml-1 flex items-center justify-center h-[36px] w-[36px]", 
                  (input.trim() || attachment) ? "text-white accent-gradient shadow-lg hover:shadow-accent/30 hover:scale-105" : "text-muted-foreground bg-muted"
                )}
              >
                <Send className="w-4 h-4" style={{ marginLeft: "2px" }} />
              </button>
            </div>
          </div>
          {/* Toolbar */}
          <div className="bg-surface border border-border border-t-0 rounded-b-2xl overflow-hidden">
            <ChatToolbar 
              inputRef={inputRef}
              input={input}
              setInput={setInput}
              onFileClick={() => fileInputRef.current?.click()}
              onEmojiClick={() => setShowInputEmoji(!showInputEmoji)}
              showEmoji={showInputEmoji}
              members={(membersData?.members || []).map((m: any) => ({ id: m.id, name: m.full_name || m.username || "Unknown", avatar_url: m.avatar_url }))}
            />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        </div>
      </div>

      {/* ── Right Panel (Members / Search) ── */}
      <AnimatePresence>
        {rightPanel && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-border bg-surface flex-shrink-0 flex flex-col h-full overflow-hidden shadow-2xl z-30 relative"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-[15px] flex items-center gap-2">
                {rightPanel === "members" ? <><Users className="w-4 h-4 text-accent" /> Members</> : rightPanel === "pins" ? <><Pin className="w-4 h-4 text-accent" /> Pinned Messages</> : <><Search className="w-4 h-4 text-accent" /> Search Channel</>}
              </h3>
              <button onClick={() => setRightPanel(null)} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {rightPanel === "members" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {membersData?.members ? (
                  membersData.members.map((member: any) => {
                    const isOnline = onlineUserIds.includes(member.id);
                    const currentStatus = presenceMap[member.id]?.status || (isOnline ? "online" : member.status) || "offline";
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                        <div className="relative">
                          <Avatar name={member.full_name || member.username} url={member.avatar_url} />
                          <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface", 
                            currentStatus === "online" ? "bg-green-500" : 
                            currentStatus === "away" ? "bg-yellow-500" : 
                            currentStatus === "dnd" ? "bg-red-500" : "bg-muted-foreground")} 
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{member.full_name || member.username}</span>
                          <span className="text-xs text-muted-foreground capitalize">{currentStatus}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-10">Loading members...</div>
                )}
              </div>
            )}

            {rightPanel === "pins" && (
              <PinnedMessagesPanel channelId={id} />
            )}

            {rightPanel === "search" && (
              <div className="flex-1 flex flex-col h-full">
                <div className="p-4 border-b border-border">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search messages..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!searchQuery.trim() ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 pb-20">
                      <Search className="w-12 h-12 mb-3" />
                      <span className="text-sm">Type to search in #{channel.name}</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-10">No messages found.</div>
                  ) : (
                    searchResults.map(msg => (
                      <div key={msg.id} className="p-3 bg-background rounded-xl border border-border shadow-sm hover:border-accent/30 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar name={msg.userName} url={msg.avatarUrl} size="sm" />
                          <span className="font-semibold text-xs">{msg.userName}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="text-sm line-clamp-3 text-foreground/90">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pinned Messages Panel ───────────────────────────────────────────
function PinnedMessagesPanel({ channelId }: { channelId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pins", channelId],
    queryFn: () => api.pins.list(channelId),
  });
  const pins = data?.pins || [];

  async function handleUnpin(messageId: string) {
    try {
      await api.pins.remove(channelId, messageId);
      queryClient.invalidateQueries({ queryKey: ["pins", channelId] });
      toast.success("Unpinned");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm py-10">Loading…</div>
      ) : pins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Pin className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm font-medium">No pinned messages</p>
          <p className="text-xs mt-1 opacity-60">Pin important messages for easy access</p>
        </div>
      ) : (
        pins.map((pin: any) => {
          const msg = pin.messages;
          if (!msg) return null;
          const author = msg.profiles;
          return (
            <div key={pin.id} className="p-3 bg-background rounded-xl border border-border group hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar name={author?.full_name || "User"} url={author?.avatar_url} />
                <span className="font-semibold text-xs">{author?.full_name || "User"}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-foreground/90 line-clamp-3">{msg.content}</p>
              <button onClick={() => handleUnpin(msg.id)} className="mt-2 text-[10px] text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <X className="w-3 h-3" />Unpin
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
