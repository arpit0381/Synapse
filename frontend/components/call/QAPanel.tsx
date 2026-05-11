"use client";

import React, { useState, useEffect } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { HelpCircle, ThumbsUp, Send, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string;
  userId: string;
  userName: string;
  text: string;
  upvotes: string[]; // User IDs
  isAnswered: boolean;
  timestamp: number;
}

export function QAPanel() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const { user } = useAppStore();
  const store = useCallStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on("call-sync-state", (state: any) => {
      if (state.questions) {
        setQuestions(state.questions);
      }
    });

    socket.on("call-qa-new", (q: Question) => {
      setQuestions(prev => [q, ...prev]);
    });
    socket.on("call-qa-upvote", ({ questionId, userId }) => {
      setQuestions(prev => prev.map(q => {
        if (q.id !== questionId) return q;
        const upvotes = q.upvotes.includes(userId)
          ? q.upvotes.filter(id => id !== userId)
          : [...q.upvotes, userId];
        return { ...q, upvotes };
      }));
    });
    socket.on("call-qa-answered", ({ questionId, isAnswered }) => {
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, isAnswered } : q));
    });
    return () => {
      socket.off("call-sync-state");
      socket.off("call-qa-new");
      socket.off("call-qa-upvote");
      socket.off("call-qa-answered");
    };
  }, []);

  const askQuestion = () => {
    if (!newQuestion.trim() || !user) return;
    const q: Question = {
      id: `q_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      text: newQuestion,
      upvotes: [],
      isAnswered: false,
      timestamp: Date.now(),
    };
    getSocket().emit("call-qa-ask", { roomId: store.callRoomId, question: q });
    setQuestions(prev => [q, ...prev]);
    setNewQuestion("");
  };

  const upvote = (id: string) => {
    if (!user) return;
    getSocket().emit("call-qa-upvote", { roomId: store.callRoomId, questionId: id, userId: user.id });
  };

  const toggleAnswered = (id: string, current: boolean) => {
    getSocket().emit("call-qa-answered", { roomId: store.callRoomId, questionId: id, isAnswered: !current });
  };

  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isAnswered !== b.isAnswered) return a.isAnswered ? 1 : -1;
    return b.upvotes.length - a.upvotes.length;
  });

  return (
    <motion.div 
      initial={{ x: "100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col h-full bg-[#1e1f22] call-panel-width"
    >
      <div className="p-4 border-b border-white/5">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-accent" /> Q&A
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedQuestions.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-20">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
              <HelpCircle className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">No questions asked.</p>
            <p className="text-white/20 text-xs mt-1">Be the first to ask something!</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {sortedQuestions.map(q => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-2xl border transition-all ${
                q.isAnswered 
                  ? "bg-[#111214]/50 border-white/5 opacity-60" 
                  : "bg-[#111214] border-white/10"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                  {q.userName}
                </span>
                {q.isAnswered && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase">
                    <CheckCircle className="w-3 h-3" /> Answered
                  </span>
                )}
              </div>
              <p className="text-white text-sm leading-relaxed mb-4">{q.text}</p>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => upvote(q.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    user && q.upvotes.includes(user.id)
                      ? "bg-accent text-white"
                      : "bg-white/5 text-[#b5bac1] hover:bg-white/10"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {q.upvotes.length}
                </button>

                {/* Host controls placeholder - in production we check user role */}
                <button
                  onClick={() => toggleAnswered(q.id, q.isAnswered)}
                  className="text-[10px] text-white/30 hover:text-white transition-colors"
                >
                  {q.isAnswered ? "Reopen" : "Mark as Answered"}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-[#111214] border-t border-white/5">
        <div className="relative">
          <textarea
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            placeholder="Ask a question..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent resize-none"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askQuestion(); } }}
          />
          <button
            onClick={askQuestion}
            disabled={!newQuestion.trim()}
            className="absolute bottom-3 right-3 p-2 rounded-lg bg-accent text-white disabled:opacity-30 disabled:bg-white/5 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
