"use client";

import { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Hash, Send, Paperclip, Smile, AtSign, Bot, Search,
  Pin, Users, Settings, Phone, Video, MoreHorizontal,
  Reply, Bookmark, Trash2, Check, Clock, ChevronDown,
  X, File, Image as ImageIcon, Download, Sparkles, Loader2, FileText, Table, CheckSquare, Plus, Sparkle
} from "lucide-react";
import { toast } from "react-hot-toast";
import ChatToolbar from "@/components/chat/ChatToolbar";
import { useRouter } from "next/navigation";

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
  const isAI = msg.metadata?.isAI;
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
    <div className={cn("message-row group", isOwn && !isAI ? "flex-row-reverse" : "flex-row")}>
      {/* Floating Action Bar */}
      <div className={cn("msg-actions", isOwn && !isAI ? "right-full mr-2" : "left-full ml-2")}>
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

      <div className={cn("flex gap-3.5", isOwn && !isAI ? "flex-row-reverse text-right" : "flex-row")}>
        <Avatar name={isAI ? "Synapse AI" : msg.userName} url={isAI ? undefined : msg.avatarUrl} />
        <div className={cn("flex-1 min-w-0 flex flex-col", isOwn && !isAI ? "items-end" : "items-start")}>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-[14px] text-foreground hover:underline cursor-pointer flex items-center gap-1.5">
              {isAI ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-accent" />
                  Synapse AI
                  <span className="bg-accent/10 text-accent text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-tighter">AI</span>
                </>
              ) : msg.userName}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/60">{formatTime(msg.timestamp)}</span>
            {msg.isPinned && <Pin className="w-3 h-3 text-accent" />}
          </div>
          
          <div className={cn(
            "relative px-4 py-2.5 text-[14.5px] leading-[1.65] whitespace-pre-wrap break-words rounded-2xl shadow-sm",
            isAI ? "bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 text-foreground rounded-tl-none" :
            isOwn ? "accent-gradient text-white rounded-tr-none" : 
                   "bg-surface border border-border/60 text-foreground rounded-tl-none shadow-sm"
          )}>
            {msg.metadata?.reply_to && (
              <div className={cn("mb-2 flex items-start gap-2 pl-2.5 border-l-2 text-xs rounded-r-lg py-1.5 px-2 transition-colors -ml-0.5", isOwn && !isAI ? "border-white/40 bg-white/10" : "border-accent/40 bg-accent/5")}>
                <div>
                  <div className={cn("font-bold mb-0.5 text-[11px]", isOwn && !isAI ? "text-white" : "text-accent")}>{msg.metadata.reply_to.senderName}</div>
                  <div className={cn("truncate max-w-[400px]", isOwn && !isAI ? "text-white/80" : "text-muted-foreground")}>{msg.metadata.reply_to.content}</div>
                </div>
              </div>
            )}
            <MentionRenderer content={msg.content} isOwn={isOwn && !isAI} currentUserId={currentUserId} />
          </div>
          
          {/* Reactions */}
          {reactionsCount > 0 && (
            <div className={cn("flex flex-wrap gap-1.5 mt-2 z-10", isOwn && !isAI && "flex-row-reverse")}>
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

// ── Mention Renderer: Highlights @mentions inside messages ────────────
function MentionRenderer({ content, isOwn, currentUserId }: { content: string; isOwn: boolean; currentUserId?: string }) {
  const { user } = useAppStore();
  // Improved regex to capture mentions more reliably, including potential spaces if we wanted to support them,
  // but sticking to standard word characters + dots/underscores for now for technical stability.
  const mentionRegex = /(@[\w.]+)/g;
  const parts = content.split(mentionRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (mentionRegex.test(part)) {
          mentionRegex.lastIndex = 0; // reset regex state
          const name = part.slice(1).toLowerCase();
          const isSelfMention =
            user && (
              (user.name || "").toLowerCase().includes(name) ||
              (user.username || "").toLowerCase().includes(name) ||
              name === "everyone" || name === "channel" || name === "synapse"
            );

          if (isOwn) {
            return <span key={i} className="font-bold underline underline-offset-2">{part}</span>;
          }

          return (
            <span
              key={i}
              className={cn(
                "px-1 rounded-md font-semibold transition-colors",
                isSelfMention 
                  ? "bg-accent/20 text-accent border border-accent/20 shadow-sm animate-pulse-subtle" 
                  : "bg-muted/50 text-foreground border border-border/50"
              )}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, currentWorkspace, presenceMap, onlineUserIds, updateUnreadCount, addFile } = useAppStore();
  const queryClient = useQueryClient();
  const callStore = useCallStore();
  const router = useRouter();

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
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorStart, setMentionCursorStart] = useState(0);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(event.target as Node)) {
        setShowMentionMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Channel Info & Members
  const { data: channelData } = useQuery({
    queryKey: ["channel", id],
    queryFn: () => api.channels.get(id),
  });
  const channel = channelData?.channel || { name: "...", description: "Loading..." };

  // Clear unread count when channel is opened
  useEffect(() => {
    if (id && currentWorkspace?.id) {
      updateUnreadCount(id, 0);
      
      // Also clear in query cache
      queryClient.setQueryData(["channels", currentWorkspace.id], (old: any) => {
        if (!old?.channels) return old;
        return {
          ...old,
          channels: old.channels.map((c: any) => 
            c.id === id ? { ...c, unread_count: 0 } : c
          )
        };
      });
    }
  }, [id, currentWorkspace?.id, updateUnreadCount, queryClient]);

  const { data: membersData } = useQuery({
    queryKey: ["workspace_members", currentWorkspace?.id],
    queryFn: () => api.workspaces.getMembers(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
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

    // AI Check
    if (currentInput.toLowerCase().includes("@synapse")) {
      const query = currentInput.replace(/@synapse/gi, "").trim();
      const contextMessages = rawMessages.slice(-10).map((m: any) => ({
        role: m.metadata?.isAI ? "assistant" : "user",
        content: m.content
      }));
      
      setTypingUsers(prev => ({ ...prev, "ai": "Synapse AI" }));
      
      try {
        const aiRes = await api.ai.chat({
          messages: contextMessages,
          workspace_id: currentWorkspace!.id,
          channel_id: id,
          user_id: user!.id
        });
        
        await api.messages.send({
          channel_id: id,
          content: aiRes.reply,
          user_id: user!.id,
          metadata: { isAI: true }
        });
        
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      } catch (err) {
        toast.error("Synapse AI failed to respond.");
      } finally {
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next["ai"];
          return next;
        });
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (showMentionMenu && mentionMembers.length > 0) {
        e.preventDefault();
        const firstMember = mentionMembers[0];
        insertMention(firstMember.full_name || firstMember.username || "Unknown");
      } else {
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === "Escape") {
      setShowMentionMenu(false);
      setShowSlashMenu(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) setAttachment(file);
      }
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInput(val);
    
    if (val === "/") {
      setShowSlashMenu(true);
    } else if (!val.startsWith("/")) {
      setShowSlashMenu(false);
    }

    // Smart @mention detection: look backward from cursor for the @ symbol
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      // Only trigger if @ is at start or preceded by whitespace
      if (lastAtIndex === 0 || /\s/.test(charBefore)) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        // Only show if there's no space in the query (single word mention)
        if (!/\s/.test(query) || query.length === 0) {
          setShowMentionMenu(true);
          setMentionQuery(query);
          setMentionCursorStart(lastAtIndex);
        } else {
          setShowMentionMenu(false);
          setMentionQuery("");
        }
      } else {
        setShowMentionMenu(false);
        setMentionQuery("");
      }
    } else {
      setShowMentionMenu(false);
      setMentionQuery("");
    }
    
    // Typing indicator throttle
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    const socket = getSocket();
    if (val.trim() && !val.startsWith("/")) {
      socket?.emit("typing_start", { channelId: id, userId: user?.id, userName: user?.name });
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit("typing_stop", { channelId: id, userId: user?.id });
      }, 2000);
    } else {
      socket?.emit("typing_stop", { channelId: id, userId: user?.id });
    }
  }

  // Insert a mention at the tracked @ position
  function insertMention(name: string) {
    // Slugify name for mention if it has spaces (standard practice)
    const mentionName = name.replace(/\s+/g, "").toLowerCase();
    const before = input.substring(0, mentionCursorStart);
    const after = input.substring(mentionCursorStart + 1 + mentionQuery.length);
    const newVal = `${before}@${mentionName} ${after}`;
    setInput(newVal);
    setShowMentionMenu(false);
    setMentionQuery("");
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursor = mentionCursorStart + mentionName.length + 2; // @name + space
      inputRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  // Filtered members for mention dropdown
  const mentionMembers = (() => {
    const all = (membersData?.members || []).map((m: any) => ({
      id: m.id,
      full_name: m.full_name || m.username || "Unknown User",
      username: m.username || "",
      avatar_url: m.avatar_url,
      isSpecial: false
    }));
    
    // Add special tags
    const special = [
      { id: "everyone", full_name: "everyone", username: "everyone", isSpecial: true },
      { id: "channel", full_name: "channel", username: "channel", isSpecial: true },
    ];

    const combined = [...special, ...all];

    if (!mentionQuery) return combined;
    const q = mentionQuery.toLowerCase();
    return combined.filter(m => 
      (m.full_name || "").toLowerCase().includes(q) || 
      (m.username || "").toLowerCase().includes(q)
    );
  })();
  
  const slashCommands: { id: "doc" | "sheet" | "task"; title: string; description: string; icon: any; color: string; bg: string }[] = [
    { id: "doc", title: "Document", description: "Create a new document", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "sheet", title: "Spreadsheet", description: "Create a new spreadsheet", icon: Table, color: "text-green-500", bg: "bg-green-500/10" },
    { id: "task", title: "Task List", description: "Create a new task list", icon: CheckSquare, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  const handleSlashCommand = (type: "doc" | "sheet" | "task") => {
    setShowSlashMenu(false);
    setInput("");
    inputRef.current?.focus();
    
    const newFile = {
      id: crypto.randomUUID(),
      type,
      title: `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: "",
      createdAt: new Date().toISOString(),
    };
    addFile(newFile);
    
    sendMutation.mutate({ 
      content: `I created a new ${type}.`, 
      metadata: { appFile: { id: newFile.id, type: newFile.type, title: newFile.title } } 
    });
    
    router.push(`/apps/${type}/${newFile.id}`);
  };
  
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
        <div className="flex items-center gap-2 px-3 sm:px-5 py-3 border-b border-border/40 glass-strong flex-shrink-0 z-20 sticky top-0 h-16 md:h-20">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Hash className="w-5 h-5 text-accent" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-display font-black text-foreground text-[14px] md:text-[16px] truncate tracking-tight">{channel.name}</h2>
              {channel.description && (
                <p className="text-[10px] md:text-[11px] text-muted-foreground truncate font-medium uppercase tracking-wider opacity-60 hidden xs:block">{channel.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5">
            {/* Active members stack */}
            {membersData?.members && (
              <div className="hidden sm:flex items-center -space-x-2 mr-2">
                {membersData.members.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="w-7 h-7 rounded-lg border-2 border-surface overflow-hidden shadow-sm ring-1 ring-border/20" title={m.full_name}>
                    {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: stringToColor(m.full_name || m.username) }}>{getInitials(m.full_name || m.username)}</div>}
                  </div>
                ))}
                {membersData.members.length > 3 && (
                  <div className="w-7 h-7 rounded-lg border-2 border-surface bg-muted flex items-center justify-center text-[9px] font-black text-muted-foreground shadow-sm ring-1 ring-border/20">
                    +{membersData.members.length - 3}
                  </div>
                )}
              </div>
            )}
            
            <button onClick={() => setRightPanel(rightPanel === "members" ? null : "members")} className={cn("p-2 rounded-xl transition-all duration-200", rightPanel === "members" ? "bg-accent/15 text-accent shadow-sm" : "text-muted-foreground hover:bg-muted")}><Users className="w-[18px] h-[18px]" /></button>
            <button onClick={() => handleCall("audio")} className="p-2 rounded-xl text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-all duration-200"><Phone className="w-[18px] h-[18px]" /></button>
            <button onClick={() => handleCall("video")} className="p-2 rounded-xl text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all duration-200"><Video className="w-[18px] h-[18px]" /></button>
            <div className="w-px h-5 bg-border/40 mx-0.5" />
            <button onClick={() => setRightPanel(rightPanel === "search" ? null : "search")} className={cn("p-2 rounded-xl transition-all duration-200", rightPanel === "search" ? "bg-accent/15 text-accent shadow-sm" : "text-muted-foreground hover:bg-muted")}><Search className="w-[18px] h-[18px]" /></button>
            <button className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-all duration-200"><MoreHorizontal className="w-[18px] h-[18px]" /></button>
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
            
            {/* Smart Action Bar trigger button */}
            <div className="pl-3 pb-[10px] flex-shrink-0 relative">
              <button
                onClick={() => setShowSlashMenu(!showSlashMenu)}
                className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                title="Apps Hub Options (/)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={`Message #${channel.name} (type '/' for apps)`}
              rows={1}
              className="flex-1 bg-transparent text-[14.5px] text-foreground placeholder:text-muted-foreground py-3.5 px-2 resize-none outline-none focus:outline-none max-h-[200px] leading-relaxed"
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

          <AnimatePresence>
            {showMentionMenu && (
              <motion.div 
                ref={mentionMenuRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-[calc(100%+12px)] left-4 w-[280px] max-w-[calc(100vw-40px)] bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
              >
                <div className="px-3.5 pt-3.5 pb-2 flex items-center gap-2 border-b border-border/30">
                  <AtSign className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-widest">Mention</span>
                  {mentionQuery && (
                    <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-bold ml-auto">@{mentionQuery}</span>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5 chat-scroll">
                  <button
                    onClick={() => insertMention("synapse")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-accent/10 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">Synapse AI</div>
                      <div className="text-[10px] text-muted-foreground">Ask anything</div>
                    </div>
                  </button>
                  <button
                    onClick={() => insertMention("everyone")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-accent/10 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">everyone</div>
                      <div className="text-[10px] text-muted-foreground">Notify all members</div>
                    </div>
                  </button>

                  <button
                    onClick={() => insertMention("channel")}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-accent/10 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">channel</div>
                      <div className="text-[10px] text-muted-foreground">Notify in this channel</div>
                    </div>
                  </button>

                  <div className="h-px bg-border/40 my-1.5 mx-2" />

                  {mentionMembers.slice(0, 10).map((m: any) => {
                    const memberName = m.full_name || m.username || "Unknown";
                    const isOnline = onlineUserIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => insertMention(memberName)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-accent/10 transition-colors text-left group"
                      >
                        <div className="relative">
                          {m.isSpecial ? (
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                              {m.id === "everyone" ? <Users className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                            </div>
                          ) : (
                            <>
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-sm"
                                style={{ backgroundColor: m.avatar_url ? "transparent" : stringToColor(memberName) }}
                              >
                                {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(memberName)}
                              </div>
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface",
                                isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                              )} />
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground group-hover:text-accent transition-colors truncate">
                            {m.isSpecial ? `@${memberName}` : memberName}
                          </div>
                          {!m.isSpecial && m.username && (
                            <div className="text-[10px] text-muted-foreground font-semibold truncate">@{m.username}</div>
                          )}
                          {m.isSpecial && (
                            <div className="text-[10px] text-accent font-semibold truncate">Notify everyone in this channel</div>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {mentionMembers.length === 0 && mentionQuery && (
                    <div className="text-center py-4 text-muted-foreground text-xs font-medium">No results for "{mentionQuery}"</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {showSlashMenu && (
              <motion.div 
                ref={slashMenuRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute bottom-[calc(100%+10px)] left-4 w-[260px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 p-2"
              >
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 pt-1">Synapse Apps Hub</div>
                <div className="space-y-1">
                  {slashCommands.filter(c => !input.trim().substring(1) || c.id.includes(input.trim().substring(1).toLowerCase())).map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => handleSlashCommand(cmd.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors text-left group"
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors", cmd.bg, cmd.color, "group-hover:bg-accent group-hover:text-white")}>
                        <cmd.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{cmd.title}</div>
                        <div className="text-[10px] text-muted-foreground">{cmd.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              onMention={(userId, name) => insertMention(name)}
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
