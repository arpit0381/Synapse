"use client";

import { useState, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Smile, Phone, Video, MoreHorizontal, Search, Check, CheckCheck, X, File, Image as ImageIcon, Download, Loader2, FileText, Table, CheckSquare, Bot, Sparkle, AtSign, Users, Hash } from "lucide-react";
import { cn, getInitials, stringToColor, formatTime, getChatDateLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toast } from "react-hot-toast";
import ChatToolbar from "@/components/chat/ChatToolbar";

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
  const { user, currentWorkspace, addFile } = useAppStore();
  const queryClient = useQueryClient();
  const store = useCallStore();
  const router = useRouter();

  // handleCall is defined below after dmUser is available

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [rightPanel, setRightPanel] = useState<"search" | null>(null);
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

  // Clear unread count for this conversation
  useEffect(() => {
    if (currentWorkspace?.id && id) {
      queryClient.setQueryData(["dms", currentWorkspace.id], (old: any) => {
        if (!old?.conversations) return old;
        return {
          ...old,
          conversations: old.conversations.map((c: any) => {
            const partnerId = c.other_user?.id || c.id;
            if (partnerId === id) return { ...c, unread: 0 };
            return c;
          }),
        };
      });
    }
  }, [id, currentWorkspace?.id, queryClient]);

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

    // Clear unread count when DM is opened
    queryClient.setQueryData(["dms", currentWorkspace?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        conversations: old.conversations.map((dm: any) => {
          const dmPartnerId = dm.other_user?.id || dm.id;
          if (dmPartnerId === id) return { ...dm, unread: 0 };
          return dm;
        })
      };
    });
    
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
    mutationFn: async (data: { content: string, metadata?: any, file?: File }) => {
      let finalMetadata = { ...data.metadata };
      
      if (data.file) {
        const { uploadUrl, token, publicUrl } = await api.files.getUploadUrl({
          filename: data.file.name,
          contentType: data.file.type,
          workspaceId: currentWorkspace!.id,
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
      
      return api.dm.send({ 
        workspace_id: currentWorkspace!.id, 
        from_user_id: user!.id, 
        to_user_id: id, 
        content: data.content,
        metadata: finalMetadata 
      });
    },
    onMutate: async (newMsgData) => {
      await queryClient.cancelQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
      
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
        is_read: false,
        from_user_id: user?.id,
        to_user_id: id,
        metadata: { ...newMsgData.metadata, attachment: tempAttachment },
        sender: { id: user?.id, full_name: user?.name, avatar_url: user?.avatar_url }
      };
      queryClient.setQueryData(["dm_messages", currentWorkspace?.id, id], (old: any) => {
        if (!old) return { messages: [tempMsg] };
        return { ...old, messages: [...old.messages, tempMsg] };
      });
    },
    onError: (err: any) => {
      toast.error("Failed to send message: " + err.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
    }
  });

  async function send() {
    if ((!input.trim() && !attachment) || !user || !currentWorkspace) return;
    
    // Stop typing indicator early
    const socket = getSocket();
    if (socket) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit("dm_typing_stop", { toUserId: id, userId: user.id });
    }

    const metadata: any = replyTo ? { reply_to: replyTo } : {};
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
      const contextMessages = messages.slice(-10).map((m: any) => ({
        role: m.metadata?.isAI ? "assistant" : "user",
        content: m.content
      }));
      
      setIsTyping(true);
      
      try {
        const aiRes = await api.ai.chat({
          messages: contextMessages,
          workspace_id: currentWorkspace!.id,
          user_id: user!.id
        });
        
        await api.dm.send({
          workspace_id: currentWorkspace!.id,
          from_user_id: user!.id,
          to_user_id: id,
          content: aiRes.reply,
          metadata: { isAI: true }
        });
        
        queryClient.invalidateQueries({ queryKey: ["dm_messages", currentWorkspace?.id, id] });
      } catch (err) {
        toast.error("Synapse AI failed to respond.");
      } finally {
        setIsTyping(false);
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
      inputRef.current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) setAttachment(file);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (showMentionMenu && mentionMembers.length > 0) {
        e.preventDefault();
        const firstMember = mentionMembers[0];
        insertMention(firstMember.full_name || firstMember.username || "Unknown");
      } else {
        e.preventDefault();
        send();
      }
    } else if (e.key === "Escape") {
      setShowMentionMenu(false);
      setShowSlashMenu(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    const socket = getSocket();
    if (!socket) return;
    
    if (val.trim() && !val.startsWith("/")) {
      socket.emit("dm_typing_start", { toUserId: id, userId: user?.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("dm_typing_stop", { toUserId: id, userId: user?.id });
      }, 2000);
    } else {
      socket.emit("dm_typing_stop", { toUserId: id, userId: user?.id });
    }
  };

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

  // Insert a mention at the tracked @ position
  function insertMention(name: string) {
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
  const mentionMembers = (membersData?.members || []).filter((m: any) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    const name = (m.full_name || m.username || "").toLowerCase();
    return name.includes(q);
  });

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
      <div className="flex items-center gap-3.5 px-5 py-3 border-b border-border/40 glass-strong flex-shrink-0 z-20 sticky top-0">
        <div className="relative group/avatar cursor-pointer">
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden shadow-md ring-2 ring-offset-2 ring-offset-surface transition-all duration-300", currentStatus === "online" ? "ring-green-500/60" : currentStatus === "away" ? "ring-yellow-500/60" : currentStatus === "dnd" ? "ring-red-500/60" : "ring-border/30")} style={{ backgroundColor: dmUser.avatar_url ? "transparent" : stringToColor(dmUser.name) }}>
            {dmUser.avatar_url ? <img src={dmUser.avatar_url} alt="" className="w-full h-full object-cover" /> : getInitials(dmUser.name)}
          </div>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-surface transition-colors", STATUS_COLOR[currentStatus] || STATUS_COLOR.offline, currentStatus === "online" && "animate-pulse")} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-foreground text-[15px] truncate tracking-tight">{dmUser.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground font-medium truncate">
            {isTyping && (
              <div className="flex gap-[3px] items-center mr-1">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            )}
            <span className={cn("transition-all duration-300", isTyping ? "text-accent font-semibold" : isReading ? "text-green-500 font-semibold" : "")}>
              {statusDisplay}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => handleCall("audio")} title="Voice Call" className="p-2.5 rounded-xl text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-all duration-200 hover:scale-105"><Phone className="w-[18px] h-[18px]" /></button>
          <button onClick={() => handleCall("video")} title="Video Call" className="p-2.5 rounded-xl text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all duration-200 hover:scale-105"><Video className="w-[18px] h-[18px]" /></button>
          <div className="w-px h-5 bg-border/50 mx-1" />
          <button onClick={() => setRightPanel(rightPanel === "search" ? null : "search")} title="Search Chat" className={cn("p-2.5 rounded-xl transition-all duration-200", rightPanel === "search" ? "bg-accent/15 text-accent shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")}><Search className="w-[18px] h-[18px]" /></button>
          <button title="More Options" className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"><MoreHorizontal className="w-[18px] h-[18px]" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll py-4 px-4 md:px-6 space-y-3">
        {isLoading && (
          <div className="flex flex-col gap-4 py-8 animate-pulse">
            {[1,2,3].map(i => (
              <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-end" : "justify-start")}>
                <div className={cn("rounded-2xl h-10", i % 2 === 0 ? "bg-accent/15 w-48" : "bg-muted w-56")} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full pb-20">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl" style={{ backgroundColor: stringToColor(dmUser.name) }}>
                {dmUser.avatar_url ? <img src={dmUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(dmUser.name)}
              </div>
              <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-background", STATUS_COLOR[currentStatus] || STATUS_COLOR.offline)} />
            </div>
            <h3 className="font-display font-bold text-xl text-foreground mb-1">{dmUser.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">{dmUser.bio || "This is the beginning of your conversation."}</p>
            <div className="flex gap-3">
              <button onClick={() => inputRef.current?.focus()} className="px-5 py-2.5 rounded-xl accent-gradient text-white text-sm font-semibold shadow-lg hover:shadow-accent/30 hover:scale-105 transition-all duration-200 flex items-center gap-2">
                <Send className="w-4 h-4" /> Say Hello
              </button>
              <button onClick={() => handleCall("audio")} className="px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm font-semibold hover:bg-muted transition-all duration-200 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Call
              </button>
            </div>
          </div>
        )}

        {groups.map(({ label, messages: msgs }) => (
          <div key={label}>
            <div className="flex items-center gap-3 py-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-background/80 px-3.5 py-1 rounded-full border border-border/40 backdrop-blur-sm shadow-sm">{label}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
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
      <div className="flex-shrink-0 px-4 md:px-6 py-3 glass-strong z-10 flex flex-col gap-0">
        <AnimatePresence>
          {replyTo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-t-2xl px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-accent flex-shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-accent">Replying to {replyTo.senderName}</span>
                    <span className="text-xs text-muted-foreground truncate">{replyTo.content}</span>
                  </div>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2"><X className="w-3.5 h-3.5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {attachment && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className={cn("flex items-center justify-between bg-surface border border-border px-4 py-3 shadow-sm", replyTo ? "border-t-0" : "rounded-t-2xl")}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                    {attachment.type.includes("image") ? <ImageIcon className="w-5 h-5" /> : <File className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-foreground truncate">{attachment.name}</span>
                    <span className="text-[11px] text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB • {attachment.type.split('/')[1]?.toUpperCase() || "FILE"}</span>
                  </div>
                </div>
                <button onClick={() => setAttachment(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-2"><X className="w-4 h-4" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn("flex items-end gap-2 bg-surface border border-border/60 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15 transition-all duration-200 shadow-sm relative", (replyTo || attachment) ? "rounded-b-none rounded-t-none" : "rounded-t-2xl rounded-b-none")}>
          {/* Smart Action Bar trigger button */}
          <div className="pl-3 pb-[10px] flex-shrink-0 relative">
            <button
              onClick={() => setShowSlashMenu(!showSlashMenu)}
              className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
              title="Apps Hub Options (/)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Message ${dmUser.name}...`}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[14.5px] text-foreground placeholder:text-muted-foreground/50 py-3.5 px-1 resize-none min-h-[50px] max-h-[200px] chat-scroll"
          />

            <AnimatePresence>
              {showInputEmoji && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-[calc(100%+12px)] right-2 w-[300px] h-[320px] bg-surface border border-border rounded-2xl shadow-2xl overflow-y-auto z-50 p-3"
                >
                  <div className="grid grid-cols-7 gap-0.5">
                    {EMOJI_FULL.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => { setInput(prev => prev + emoji); setShowInputEmoji(false); inputRef.current?.focus(); }}
                        className="flex items-center justify-center aspect-square text-xl hover:bg-muted rounded-xl transition-all hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              onClick={send} 
              disabled={(!input.trim() && !attachment) || sendMutation.isPending} 
              whileTap={{ scale: 0.9 }}
              className={cn("p-2.5 rounded-xl transition-all duration-300 ml-0.5 flex items-center justify-center", 
                (input.trim() || attachment) ? "text-white accent-gradient shadow-lg hover:shadow-accent/30" : "text-muted-foreground bg-muted/50"
              )}
            >
              {sendMutation.isPending ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Send className="w-[18px] h-[18px]" style={{ marginLeft: "2px" }} />}
            </motion.button>

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
                <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-0.5 chat-scroll">
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
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-foreground group-hover:text-accent transition-colors truncate">{memberName}</div>
                          {m.username && <div className="text-[10px] text-muted-foreground font-semibold truncate">@{m.username}</div>}
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
        <div className={cn("bg-surface border border-border/60 border-t-0 rounded-b-2xl overflow-hidden", (replyTo || attachment) ? "" : "")}>
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

// ── Mention Renderer: Highlights @mentions inside messages ────────────
function MentionRenderer({ content, isMe, isAI }: { content: string; isMe: boolean; isAI: boolean }) {
  const { user } = useAppStore();
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

          if (isMe && !isAI) {
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

// ── Message Bubble Component ──────────────────────────────────────────────
function MessageBubble({ msg, isMe, isLast, onRead, onReact, onReply }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!isMe && !msg.is_read && !msg.id.toString().startsWith("temp-")) {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { onRead(msg.id); observer.disconnect(); }
      }, { threshold: 0.5 });
      if (ref.current) observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [isMe, msg.is_read, msg.id]);

  const isAI = msg.metadata?.isAI;
  const reactionsCount = Object.entries(msg.metadata?.reactions || {}).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={cn("flex group w-full relative", isMe && !isAI ? "justify-end" : "justify-start", !isLast && "mb-0.5")}
    >
      <AnimatePresence>
        {showPicker && (
          <motion.div initial={{ opacity: 0, scale: 0.85, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 8 }}
            className={cn("absolute z-30 -top-11 flex items-center gap-0.5 p-1.5 bg-surface/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl", isMe && !isAI ? "right-4" : "left-4")}
            onMouseLeave={() => setShowPicker(false)}
          >
            {EMOJI_QUICK.map(e => (
              <button key={e} onClick={() => { onReact(msg.id, e); setShowPicker(false); }}
                className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-xl transition-all hover:scale-125 text-base">{e}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn("max-w-[75%] relative flex flex-col", isMe && !isAI ? "items-end" : "items-start")}>
        <div ref={ref} onDoubleClick={() => onReact(msg.id, "❤️")}
          className={cn(
            "relative px-4 py-2.5 text-[14.5px] shadow-sm transition-all duration-300 flex flex-col leading-relaxed",
            msg.justRead ? "message-glow-effect" : "",
            isAI ? "bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 text-foreground rounded-2xl rounded-tl-none" :
            isMe ? "accent-gradient text-white rounded-2xl rounded-tr-md" : "bg-surface border border-border/40 text-foreground rounded-2xl rounded-tl-md",
            isLast && (isMe && !isAI ? "rounded-br-md" : "rounded-bl-md")
          )}
        >
          {isAI && (
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-accent uppercase tracking-tighter">
              <Bot className="w-3 h-3" /> Synapse AI <span className="bg-accent/10 px-1 rounded">AI</span>
            </div>
          )}
          {msg.metadata?.reply_to && (
            <div className={cn("mb-2 pl-2.5 border-l-2 text-xs rounded-r-lg py-1 px-2 -mx-1", isMe ? "border-white/40 bg-white/10" : "border-accent bg-accent/5")}>
              <div className="font-bold mb-0.5 text-[11px]">{msg.metadata.reply_to.senderName}</div>
              <div className="truncate max-w-[220px] opacity-80">{msg.metadata.reply_to.content}</div>
            </div>
          )}
          <div className="leading-relaxed whitespace-pre-wrap break-words">
            <MentionRenderer content={msg.content} isMe={isMe} isAI={isAI} />
          </div>

          {msg.metadata?.attachment && (
            <div className="mt-2 relative">
              {msg.metadata.attachment.type?.includes('image') && msg.metadata.attachment.url ? (
                <div className="relative inline-block">
                  <a href={msg.metadata.attachment.isUploading ? "#" : msg.metadata.attachment.url} target={msg.metadata.attachment.isUploading ? "_self" : "_blank"} rel="noopener noreferrer" className={cn("block max-w-[300px] rounded-xl overflow-hidden border border-border/20 mt-1 bg-black/5 hover:opacity-90 transition-opacity", msg.metadata.attachment.isUploading && "opacity-60 pointer-events-none blur-[1px]")}>
                    <img src={msg.metadata.attachment.url} alt={msg.metadata.attachment.name || "Image"} className="w-full h-auto object-contain max-h-[250px]" />
                  </a>
                  {msg.metadata.attachment.isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white font-medium shadow-xl"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Uploading...</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn("relative inline-block", msg.metadata.attachment.isUploading && "opacity-70 pointer-events-none")}>
                  <div className={cn("max-w-[240px] rounded-xl border p-2.5 flex items-start gap-2 shadow-sm cursor-pointer transition-colors", isMe ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-muted/50 border-border hover:bg-muted")} onClick={() => { if(msg.metadata.attachment.url && !msg.metadata.attachment.isUploading) window.open(msg.metadata.attachment.url, '_blank'); }}>
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0", isMe ? "bg-white/20 text-white" : "bg-accent/10 text-accent")}>{msg.metadata.attachment.isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <File className="w-4 h-4" />}</div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[12px] font-semibold truncate">{msg.metadata.attachment.name || "Attachment"}</p>
                      <p className="text-[10px] opacity-80">{msg.metadata.attachment.size ? (msg.metadata.attachment.size / 1024).toFixed(1) + " KB • " : ""}{msg.metadata.attachment.type?.split('/')[1]?.toUpperCase() || "FILE"}</p>
                    </div>
                    {msg.metadata.attachment.url && !msg.metadata.attachment.isUploading && (
                      <button className={cn("p-1.5 rounded-full transition-colors", isMe ? "hover:bg-white/20 text-white" : "hover:bg-background text-muted-foreground")} onClick={(e) => { e.stopPropagation(); window.open(msg.metadata.attachment.url, '_blank'); }}><Download className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* App File Preview */}
          {msg.metadata?.appFile && (
            <div className="mt-2" onClick={(e) => {
              e.stopPropagation();
              window.open(`/apps/${msg.metadata.appFile.type}/${msg.metadata.appFile.id}`, '_blank');
            }}>
              <div className={cn("max-w-[240px] rounded-xl border p-2.5 flex items-start gap-2 shadow-sm cursor-pointer transition-colors group", isMe ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-surface border-border hover:bg-muted")}>
                <div className={cn("p-1.5 rounded-lg flex-shrink-0 text-white", msg.metadata.appFile.type === 'doc' ? 'bg-blue-500' : msg.metadata.appFile.type === 'sheet' ? 'bg-green-500' : 'bg-orange-500')}>
                  {msg.metadata.appFile.type === 'doc' ? <FileText className="w-4 h-4" /> : msg.metadata.appFile.type === 'sheet' ? <Table className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className={cn("text-[12px] font-semibold truncate transition-colors", isMe ? "text-white" : "text-foreground group-hover:text-accent")}>{msg.metadata.appFile.title}</p>
                  <p className={cn("text-[10px] opacity-80 capitalize", isMe ? "text-white/80" : "text-muted-foreground")}>{msg.metadata.appFile.type} app</p>
                </div>
              </div>
            </div>
          )}
          
          <div className={cn("flex items-center gap-1.5 mt-1 select-none", isMe ? "justify-end" : "justify-start")}>
            <span className={cn("text-[10px] font-medium", isMe ? "text-white/70" : "text-muted-foreground/70")}>{formatTime(msg.timestamp)}</span>
            {isMe && (
              <span className="transition-all duration-300">
                {msg.id.toString().startsWith("temp-") ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ) : msg.is_read ? (<CheckCheck className="w-3.5 h-3.5 text-[#4ade80]" />) : (<Check className="w-3.5 h-3.5 text-white/60" />)}
              </span>
            )}
          </div>
        </div>

        <div className={cn("absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5", isMe ? "-left-[72px]" : "-right-[72px]")}>
          <button onClick={() => setShowPicker(true)} className="p-1.5 bg-surface/90 backdrop-blur-sm border border-border/50 shadow-md rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all hover:scale-110"><Smile className="w-3.5 h-3.5" /></button>
          <button onClick={onReply} className="p-1.5 bg-surface/90 backdrop-blur-sm border border-border/50 shadow-md rounded-full text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          </button>
        </div>

        {reactionsCount > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1.5 z-10", isMe ? "justify-end pr-1" : "justify-start pl-1")}>
            {Object.entries(msg.metadata.reactions).map(([emoji, users]: [string, any]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)} className="reaction-pop flex items-center gap-1 px-2 py-0.5 bg-surface/90 backdrop-blur-sm border border-border/50 rounded-full shadow-sm hover:bg-muted hover:scale-105 transition-all">
                <span className="text-xs">{emoji}</span><span className="text-[10px] font-semibold text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
