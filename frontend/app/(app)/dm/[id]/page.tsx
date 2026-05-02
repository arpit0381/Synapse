"use client";

import { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Smile, Phone, Video, MoreHorizontal, Search, Check, CheckCheck, X, File, Image as ImageIcon, Download } from "lucide-react";
import { cn, getInitials, stringToColor, formatTime, getChatDateLabel } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toast } from "react-hot-toast";

const STATUS_COLOR: Record<string, string> = { online: "bg-green-500", away: "bg-yellow-500", dnd: "bg-red-500", offline: "bg-muted" };
const STATUS_LABEL: Record<string, string> = { online: "Active now", away: "Away", dnd: "Do Not Disturb", offline: "Offline" };
const EMOJI_QUICK = ["👍", "❤️", "😂", "😮", "🔥"];
const EMOJI_FULL = [
  "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰",
  "👍","👎","👏","🙌","👐","🤲","🤝","🙏","✍️","💪","🤌","🤌🏻","🤌🏼","🤌🏽","🤌🏾","🤌🏿",
  "🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","⚓","⛽","🚧","🚥","🚦","🔥",
  "🎉","🎊","🎈","🎂","🎁","🎀","🎄","🎃","🧨","✨","🎋","🎌","🎎"
];

export default function DmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, currentWorkspace } = useAppStore();
  const queryClient = useQueryClient();
  const store = useCallStore();

  // handleCall is defined below after dmUser is available

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [rightPanel, setRightPanel] = useState<"search" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleCall = async (type: "audio" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === "video", audio: true });
      store.setLocalStream(stream);
      const roomId = [user?.id, id].sort().join("_");
      store.upsertParticipant({ id, name: dmUser.name, isMuted: false, isSpeaking: false });
      store.setCalling({ isCalling: true, roomId, isGroupCall: false, callType: type });
      const socket = getSocket();
      socket.emit("call-user", {
        userToCall: id,
        fromUserId: user?.id,
        fromUserName: user?.name,
        type,
        isGroupCall: false,
        callRoomId: roomId,
      });
      // Join the room ourselves to hear broadcasts (mute/speaking)
      socket.emit("join-call", {
        roomId,
        userId: user?.id,
        userName: user?.name,
      });
    } catch (e: any) {
      console.error("Failed to get media", e);
      toast.error(e.message === "Permission denied" ? "Microphone/Camera permission denied" : "Could not access media devices");
    }
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
    const emitReading = () => {
      socket.emit("dm_reading_start", { toUserId: id, userId: user.id });
    };
    
    if (socket.connected) emitReading();
    socket.on("connect", emitReading);
    
    // Heartbeat to ensure sync if users join at different times
    const readingInterval = setInterval(emitReading, 5000);

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
        
        // Force hard invalidation to ensure UI always updates if cache logic fails
        queryClient.invalidateQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
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

    const handleTypingStart = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${uid}`) setIsTyping(true); };
    const handleTypingStop = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${uid}`) setIsTyping(false); };
    const handleReadingStart = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${uid}`) setIsReading(true); };
    const handleReadingStop = ({ userId: uid, channelId: cid }: any) => { if (uid === id && cid === `dm_${uid}`) setIsReading(false); };

    socket.on("new_dm", handleNewDm);
    socket.on("message_read", handleMessageRead);
    socket.on("dm_reaction_updated", handleReaction);
    socket.on("user_typing", handleTypingStart);
    socket.on("user_stopped_typing", handleTypingStop);
    socket.on("user_reading", handleReadingStart);
    socket.on("user_stopped_reading", handleReadingStop);

    return () => {
      clearInterval(readingInterval);
      socket.off("connect", emitReading);
      socket.emit("dm_reading_stop", { toUserId: id, userId: user.id });
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
    mutationFn: (data: { content: string, metadata?: any }) => api.dm.send({ 
      workspace_id: currentWorkspace!.id, 
      from_user_id: user!.id, 
      to_user_id: id, 
      content: data.content,
      metadata: data.metadata 
    }),
    onMutate: async (newMsgData) => {
      await queryClient.cancelQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
      const tempMsg = {
        id: `temp-${Date.now()}`,
        content: newMsgData.content,
        created_at: new Date().toISOString(),
        is_read: false,
        from_user_id: user?.id,
        to_user_id: id,
        metadata: newMsgData.metadata || {},
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
    if ((!input.trim() && !attachment) || !user || !currentWorkspace) return;
    
    const metadata: any = replyTo ? { reply_to: replyTo } : {};
    
    // Simulate Attachment Upload
    if (attachment) {
      metadata.attachment = {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        url: "#" // Fake URL for simulation
      };
    }
    
    sendMutation.mutate({ content: input.trim() || " ", metadata });
    
    setInput("");
    setReplyTo(null);
    setAttachment(null);
    inputRef.current?.focus();
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
      inputRef.current?.focus();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    
    socket.emit("dm_typing_start", { toUserId: id, userId: user?.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("dm_typing_stop", { toUserId: id, userId: user?.id });
    }, 2000);
  };

  const groups: { label: string; messages: any[] }[] = [];
  let cur = "";
  messages.forEach((m: any) => {
    const l = getChatDateLabel(m.timestamp);
    if (l !== cur) { cur = l; groups.push({ label: l, messages: [m] }); }
    else groups[groups.length - 1].messages.push(m);
  });

  const searchResults = messages.filter((m: any) => searchQuery.trim() && m.content.toLowerCase().includes(searchQuery.toLowerCase()));

  // Calculate status display string
  const { onlineUserIds, presenceMap } = useAppStore();
  const currentStatus = presenceMap[dmUser.id]?.status || (onlineUserIds.includes(dmUser.id) ? "online" : dmUser.status) || "offline";
  
  let statusDisplay = STATUS_LABEL[currentStatus] || STATUS_LABEL.offline;
  if (isTyping) statusDisplay = "Typing...";
  else if (isReading) statusDisplay = "In chat";

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 z-20 sticky top-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-sm" style={{ backgroundColor: dmUser.avatar_url ? "transparent" : stringToColor(dmUser.name) }}>
            {dmUser.avatar_url ? <img src={dmUser.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(dmUser.name)}
          </div>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-surface", STATUS_COLOR[currentStatus] || STATUS_COLOR.offline)} />
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
          <button onClick={() => handleCall("audio")} className="p-2 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"><Phone className="w-4 h-4" /></button>
          <button onClick={() => handleCall("video")} className="p-2 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"><Video className="w-4 h-4" /></button>
          <button 
            onClick={() => setRightPanel(rightPanel === "search" ? null : "search")}
            className={cn("p-2 rounded-xl transition-colors", rightPanel === "search" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
          >
            <Search className="w-4 h-4" />
          </button>
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
                    onReply={() => setReplyTo({ id: msg.id, content: msg.content, senderName: msg.from === "me" ? "You" : dmUser.name })}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-background/80 backdrop-blur-md z-10 flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center justify-between bg-surface border border-border rounded-t-xl px-4 py-2 mx-2 shadow-sm">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                Replying to {replyTo.senderName}
              </span>
              <span className="text-xs text-muted-foreground truncate">{replyTo.content}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {attachment && (
          <div className={cn("flex items-center justify-between bg-surface border border-border px-4 py-3 mx-2 shadow-sm", replyTo ? "border-t-0" : "rounded-t-xl")}>
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

        <div className={cn("flex items-end gap-2 bg-surface border border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all shadow-sm relative", (replyTo || attachment) ? "rounded-b-2xl rounded-tr-none rounded-tl-none mx-2" : "rounded-2xl mx-0")}>
          <div className="flex items-center gap-1 px-3 py-2.5 flex-shrink-0 self-end">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"><Paperclip className="w-4 h-4" /></button>
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
          <div className="flex items-center gap-1 px-2 py-2 flex-shrink-0 self-end z-10 relative">
            <button 
              onClick={() => setShowInputEmoji(!showInputEmoji)}
              className={cn("p-2 rounded-full transition-colors", showInputEmoji ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-accent hover:bg-accent/10")}
            >
              <Smile className="w-4 h-4" />
            </button>

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
              onClick={send} 
              disabled={(!input.trim() && !attachment) || sendMutation.isPending} 
              className={cn("p-2 rounded-full transition-all duration-300 ml-1 flex items-center justify-center h-[36px] w-[36px]", 
                (input.trim() || attachment) ? "text-white accent-gradient shadow-lg hover:shadow-accent/30 hover:scale-105" : "text-muted-foreground bg-muted"
              )}
            >
              <Send className="w-4 h-4" style={{ marginLeft: "2px" }} />
            </button>
          </div>
        </div>
      </div>
      
      {/* ── Right Panel (Search) ── */}
      <AnimatePresence>
        {rightPanel === "search" && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 border-l border-border bg-surface flex flex-col overflow-hidden shadow-2xl z-30"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-[15px] flex items-center gap-2">
                <Search className="w-4 h-4 text-accent" /> Search Chat
              </h3>
              <button onClick={() => setRightPanel(null)} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 flex flex-col h-full">
              <div className="p-4 border-b border-border">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder={`Search with ${dmUser.name}...`} 
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
                    <span className="text-sm text-center">Type to search in this chat</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-10">No messages found.</div>
                ) : (
                  searchResults.map((msg: any) => (
                    <div key={msg.id} className="p-3 bg-background rounded-xl border border-border shadow-sm hover:border-accent/30 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-xs">{msg.from === "me" ? "You" : dmUser.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-sm line-clamp-3 text-foreground/90">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Message Bubble Component ──────────────────────────────────────────────
function MessageBubble({ msg, isMe, isLast, onRead, onReact, onReply }: any) {
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
            "relative px-4 py-2.5 text-[15px] shadow-sm transition-all duration-300 flex flex-col",
            msg.justRead ? "message-glow-effect" : "",
            isMe 
              ? "accent-gradient text-white rounded-2xl rounded-tr-sm" 
              : "bg-surface border border-border/50 text-foreground rounded-2xl rounded-tl-sm",
            isLast && (isMe ? "rounded-br-sm" : "rounded-bl-sm")
          )}
        >
          {msg.metadata?.reply_to && (
            <div className={cn("mb-1.5 pl-2 border-l-2 text-xs opacity-80", isMe ? "border-white/50" : "border-accent")}>
              <div className="font-bold mb-0.5">{msg.metadata.reply_to.senderName}</div>
              <div className="truncate max-w-[200px]">{msg.metadata.reply_to.content}</div>
            </div>
          )}
          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>

          {/* Attachment Preview */}
          {msg.metadata?.attachment && (
            <div className={cn("mt-2 max-w-[240px] rounded-xl border p-2.5 flex items-start gap-2 shadow-sm cursor-pointer transition-colors",
              isMe ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-muted/50 border-border hover:bg-muted"
            )}>
              <div className={cn("p-1.5 rounded-lg flex-shrink-0", isMe ? "bg-white/20 text-white" : "bg-accent/10 text-accent")}>
                {msg.metadata.attachment.type.includes('image') ? <ImageIcon className="w-4 h-4" /> : <File className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate">{msg.metadata.attachment.name}</p>
                <p className="text-[10px] opacity-80">{(msg.metadata.attachment.size / 1024).toFixed(1)} KB • {msg.metadata.attachment.type.split('/')[1]?.toUpperCase()}</p>
              </div>
              <button className={cn("p-1.5 rounded-full transition-colors", isMe ? "hover:bg-white/20 text-white" : "hover:bg-background text-muted-foreground")}><Download className="w-3.5 h-3.5" /></button>
            </div>
          )}
          
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
          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1",
          isMe ? "-left-16" : "-right-16"
        )}>
          <button 
            onClick={() => setShowPicker(true)}
            className="p-1.5 bg-surface border border-border shadow-sm rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onReply}
            className="p-1.5 bg-surface border border-border shadow-sm rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
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
