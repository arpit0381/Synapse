"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { Clock, Users, FileText, Download, X, Share2, Sparkles, Brain, ListChecks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onClose: () => void;
}

export function CallSummaryModal({ onClose }: Props) {
  const store = useCallStore();
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<{ summary: string; actions: string[] } | null>(null);
  
  const transcript = store.chatMessages.filter(m => m.type === "system" && m.userId === "system");

  const generateAISummary = async () => {
    setIsSummarizing(true);
    // Simulate AI API call
    await new Promise(r => setTimeout(r, 2000));
    setAiSummary({
      summary: "The team discussed the implementation of Phase 4, focusing on AI meeting insights and cloud storage. Key consensus was reached on using P2P mesh for groups under 10 people.",
      actions: [
        "Finalize the Supabase Storage bucket policies",
        "Implement E2EE toggle in the next sprint",
        "Test Live Captions on mobile browsers"
      ]
    });
    setIsSummarizing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#111214] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-accent/10 to-transparent">
          <div>
            <h2 className="text-white text-2xl font-bold">Meeting Summary</h2>
            <p className="text-white/40 text-sm">Call ended • {new Date().toLocaleTimeString()}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3 text-white/40 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Duration</span>
              </div>
              <p className="text-white text-xl font-bold">24:12</p> 
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3 text-white/40 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Participants</span>
              </div>
              <p className="text-white text-xl font-bold">{Object.keys(store.participants).length + 1}</p>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" /> AI Insights
              </h3>
              {!aiSummary && !isSummarizing && (
                <button
                  onClick={generateAISummary}
                  className="px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider hover:bg-purple-500/30 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-3 h-3" /> Generate AI Summary
                </button>
              )}
            </div>

            {isSummarizing && (
              <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-400/60 text-xs font-medium animate-pulse">Analyzing transcript...</p>
              </div>
            )}

            {aiSummary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                  <p className="text-white/80 text-sm leading-relaxed italic">
                    "{aiSummary.summary}"
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-white/40 mb-1">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Action Items</span>
                  </div>
                  <ul className="space-y-2">
                    {aiSummary.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                        <span className="w-1 h-1 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>

          {/* Transcript */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" /> Transcript
              </h3>
              <button className="text-[10px] text-accent font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                <Download className="w-3 h-3" /> Download TXT
              </button>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 max-h-60 overflow-y-auto">
              {transcript.length > 0 ? (
                transcript.map((t, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-[10px] text-white/20 mt-1 min-w-[40px]">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <p className="text-white/70 text-sm leading-relaxed">{t.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-white/20 text-center text-sm py-4 italic">No transcript generated.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-sm font-bold text-white/60 hover:bg-white/5 transition-all"
          >
            Close
          </button>
          <button
            className="flex-[2] py-4 rounded-2xl bg-accent text-sm font-bold text-white shadow-lg shadow-accent/20 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4" /> Save Meeting Notes to Channel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
