"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Sparkles, Bold, Italic, Strikethrough, Code, 
  AtSign, Smile, Mic, MicOff, Paperclip, List, 
  Link2, Quote, FileCode2, X, Search 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatToolbarProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (val: string | ((prev: string) => string)) => void;
  onFileClick: () => void;
  onEmojiClick: () => void;
  showEmoji: boolean;
  members?: { id: string; name: string; avatar_url?: string }[];
  onMention?: (userId: string, name: string) => void;
}

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export default function ChatToolbar({ 
  inputRef, input, setInput, onFileClick, onEmojiClick, showEmoji, members, onMention 
}: ChatToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const wrapSelection = (before: string, after: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = input;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setInput(newText);
    setTimeout(() => {
      el.focus();
      if (selected.length === 0) {
        el.setSelectionRange(start + before.length, start + before.length);
      } else {
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      }
    }, 0);
  };

  const insertText = (text: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const newText = input.substring(0, start) + text + input.substring(start);
    setInput(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        insertText(`🎤 Voice message (${recordTime}s) `);
        setRecordTime(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch {
      // Permission denied or not available
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const filteredMembers = (members || []).filter(m => 
    m.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const formatBtns = [
    { icon: Bold, label: "Bold", action: () => wrapSelection("**", "**") },
    { icon: Italic, label: "Italic", action: () => wrapSelection("_", "_") },
    { icon: Strikethrough, label: "Strikethrough", action: () => wrapSelection("~~", "~~") },
    { icon: Code, label: "Inline Code", action: () => wrapSelection("`", "`") },
  ];

  const moreBtns = [
    { icon: FileCode2, label: "Code Block", action: () => wrapSelection("\n```\n", "\n```\n") },
    { icon: List, label: "Bullet List", action: () => insertText("\n- ") },
    { icon: Quote, label: "Quote", action: () => insertText("\n> ") },
    { icon: Link2, label: "Link", action: () => wrapSelection("[", "](url)") },
  ];

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-t border-border/30">
      {/* Plus / More Actions */}
      <div className="relative">
        <button 
          onClick={() => { setShowMore(!showMore); setShowMentions(false); }}
          className={cn("p-1.5 rounded-lg transition-all duration-200", showMore ? "bg-accent/15 text-accent rotate-45" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
          title="More actions"
        >
          <Plus className="w-4 h-4 transition-transform duration-200" />
        </button>
        <AnimatePresence>
          {showMore && (
            <motion.div 
              initial={{ opacity: 0, y: 6, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              className="absolute bottom-[calc(100%+8px)] left-0 bg-surface border border-border rounded-xl shadow-2xl p-2 z-50 w-[180px]"
            >
              {moreBtns.map(b => (
                <button key={b.label} onClick={() => { b.action(); setShowMore(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <b.icon className="w-4 h-4 text-muted-foreground" /> {b.label}
                </button>
              ))}
              <div className="h-px bg-border my-1" />
              <button onClick={() => { onFileClick(); setShowMore(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" /> Upload File
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border/50 mx-1" />

      {/* Formatting Buttons */}
      {formatBtns.map(b => (
        <button 
          key={b.label} 
          onClick={b.action} 
          title={b.label}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-150"
        >
          <b.icon className="w-3.5 h-3.5" />
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-4 bg-border/50 mx-1" />

      {/* @ Mentions */}
      <div className="relative">
        <button 
          onClick={() => { setShowMentions(!showMentions); setShowMore(false); setMentionFilter(""); }}
          title="Mention someone"
          className={cn("p-1.5 rounded-lg transition-all duration-200", showMentions ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
        >
          <AtSign className="w-3.5 h-3.5" />
        </button>
        <AnimatePresence>
          {showMentions && members && members.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 6, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              className="absolute bottom-[calc(100%+8px)] left-0 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-2 z-50 w-[240px] max-w-[calc(100vw-40px)] max-h-[300px] overflow-hidden flex flex-col"
            >
              <div className="relative mb-2 px-1">
                <AtSign className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <input 
                  type="text" 
                  placeholder="Tag someone..."
                  value={mentionFilter}
                  onChange={e => setMentionFilter(e.target.value)}
                  className="w-full bg-background/50 border border-border/50 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-muted-foreground/50 font-medium"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto flex-1 space-y-0.5 chat-scroll pr-1">
                {filteredMembers.slice(0, 15).map(m => (
                  <button 
                    key={m.id}
                    onClick={() => {
                      // Insert mention with slugified name (standard for tagging systems)
                      const mentionName = m.name.replace(/\s+/g, "").toLowerCase();
                      insertText(`@${mentionName} `);
                      onMention?.(m.id, m.name);
                      setShowMentions(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 text-xs hover:bg-accent/10 rounded-xl transition-all group"
                  >
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm flex-shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: m.avatar_url ? "transparent" : stringToColor(m.name) }}
                    >
                      {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="block truncate font-bold text-foreground group-hover:text-accent transition-colors">{m.name}</span>
                      <span className="block truncate text-[9px] text-muted-foreground font-semibold uppercase tracking-tighter">@{m.name.replace(/\s+/g, "").toLowerCase()}</span>
                    </div>
                  </button>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center opacity-60">
                    <Search className="w-4 h-4 mb-2 text-muted-foreground" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No members</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji */}
      <button 
        onClick={onEmojiClick}
        title="Emoji"
        className={cn("p-1.5 rounded-lg transition-all duration-200", showEmoji ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
      >
        <Smile className="w-3.5 h-3.5" />
      </button>

      {/* Voice Recording */}
      {isRecording ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 ml-1"
        >
          <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {Math.floor(recordTime / 60)}:{(recordTime % 60).toString().padStart(2, '0')}
          </div>
          <button 
            onClick={stopRecording}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            title="Stop Recording"
          >
            <MicOff className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ) : (
        <button 
          onClick={startRecording}
          title="Voice Message"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      )}

      {/* File Attach */}
      <button 
        onClick={onFileClick}
        title="Attach File"
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200"
      >
        <Paperclip className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
