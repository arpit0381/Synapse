"use client";

import React, { useState, useEffect } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { BarChart2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs
}

interface Poll {
  id: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
}

export function PollsPanel() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const { user } = useAppStore();
  const store = useCallStore();

  useEffect(() => {
    const socket = getSocket();
    socket.on("call-poll-created", (poll: Poll) => {
      setPolls(prev => [poll, ...prev]);
    });
    socket.on("call-poll-voted", ({ pollId, optionId, userId }) => {
      setPolls(prev => prev.map(p => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          options: p.options.map(o => {
            // Remove previous vote from this user in this poll
            const filteredVotes = o.votes.filter(id => id !== userId);
            if (o.id === optionId) {
              return { ...o, votes: [...filteredVotes, userId] };
            }
            return { ...o, votes: filteredVotes };
          })
        };
      }));
    });
    return () => {
      socket.off("call-poll-created");
      socket.off("call-poll-voted");
    };
  }, []);

  const createPoll = () => {
    if (!newQuestion || newOptions.some(o => !o)) return;
    const poll: Poll = {
      id: `poll_${Date.now()}`,
      creatorId: user?.id || "",
      question: newQuestion,
      options: newOptions.map((text, i) => ({ id: `opt_${i}`, text, votes: [] })),
      isActive: true,
    };
    getSocket().emit("call-create-poll", { roomId: store.callRoomId, poll });
    setPolls(prev => [poll, ...prev]);
    setIsCreating(false);
    setNewQuestion("");
    setNewOptions(["", ""]);
  };

  const vote = (pollId: string, optionId: string) => {
    if (!user) return;
    getSocket().emit("call-vote-poll", { roomId: store.callRoomId, pollId, optionId, userId: user.id });
  };

  return (
    <motion.div 
      initial={{ x: "100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col h-full bg-[#1e1f22] call-panel-width"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-accent" /> Polls
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-accent transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 bg-[#111214] rounded-2xl border border-accent/20 space-y-4"
            >
              <input
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent"
              />
              <div className="space-y-2">
                {newOptions.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={e => {
                      const next = [...newOptions];
                      next[i] = e.target.value;
                      setNewOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-white/60 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={createPoll}
                  className="flex-1 py-2 rounded-xl bg-accent text-xs font-bold text-white shadow-lg shadow-accent/20"
                >
                  Launch Poll
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {polls.length === 0 && !isCreating && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-20">
            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
              <BarChart2 className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">No polls active yet.</p>
            <p className="text-white/20 text-xs mt-1">Start one to engage the group.</p>
          </div>
        )}

        {polls.map(poll => (
          <div key={poll.id} className="p-4 bg-[#111214] rounded-2xl border border-white/5 space-y-4">
            <p className="text-white font-medium text-sm">{poll.question}</p>
            <div className="space-y-3">
              {poll.options.map(opt => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                const percentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                const hasVoted = user && opt.votes.includes(user.id);

                return (
                  <button
                    key={opt.id}
                    onClick={() => vote(poll.id, opt.id)}
                    className="w-full text-left relative group"
                  >
                    <div className="relative z-10 flex items-center justify-between px-4 py-2.5 text-xs text-white">
                      <span className="flex items-center gap-2">
                        {opt.text}
                        {hasVoted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                      </span>
                      <span className="font-semibold">{Math.round(percentage)}%</span>
                    </div>
                    {/* Progress Bar Background */}
                    <div className="absolute inset-0 bg-white/5 rounded-xl" />
                    {/* Progress Fill */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={`absolute inset-0 rounded-xl ${hasVoted ? "bg-accent/20" : "bg-white/10"}`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-white/30 text-right">
              {poll.options.reduce((sum, o) => sum + o.votes.length, 0)} votes
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
