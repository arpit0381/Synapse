"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCallStore, CallChatMessage } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { X, Send, Smile } from "lucide-react";
import { motion } from "framer-motion";

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function strHsl(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 60%, 65%)`;
}

export function CallChatPanel() {
  const store = useCallStore();
  const { user } = useAppStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight);
  }, [store.chatMessages.length]);

  useEffect(() => { store.resetUnreadChat(); }, []); // eslint-disable-line

  const send = () => {
    if (!input.trim() || !user || !store.callRoomId) return;
    const msg: CallChatMessage = {
      id: `cm_${Date.now()}`, userId: user.id, userName: user.name,
      content: input.trim(), timestamp: Date.now(),
    };
    store.addChatMessage(msg);
    getSocket().emit("call-chat-message", { roomId: store.callRoomId, ...msg });
    setInput("");
  };

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col h-full flex-shrink-0 call-panel-width"
      style={{ background: "rgba(17,18,20,0.95)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">In-Call Chat</h3>
        <button onClick={() => store.setActivePanel(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#949ba4] hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 hide-scrollbar">
        {store.chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Smile className="w-6 h-6 text-[#949ba4] mb-2" />
            <p className="text-[#949ba4] text-xs">No messages yet</p>
          </div>
        ) : store.chatMessages.map((msg) => {
          const isMe = msg.userId === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: strHsl(msg.userName) }}>{msg.userName[0]?.toUpperCase()}</div>}
              <div>
                {!isMe && <p className="text-[10px] font-medium mb-0.5" style={{ color: strHsl(msg.userName) }}>{msg.userName}</p>}
                <div className={`px-3 py-1.5 rounded-2xl text-[13px] ${isMe ? "bg-accent/20 text-white rounded-br-sm" : "bg-white/5 text-[#dbdee1] rounded-bl-sm"}`}>{msg.content}</div>
                <p className="text-[9px] mt-0.5" style={{ color: "#5c5e66" }}>{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Send a message..." className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#949ba4]/50 outline-none" />
          <button onClick={send} disabled={!input.trim()} className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors disabled:opacity-30"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </motion.div>
  );
}
