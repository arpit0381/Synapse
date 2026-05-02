"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Timer, CheckCircle2, X, Play, Pause, RotateCcw, Target, Music, Brain, Coffee, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AMBIENT_SOUNDS = [
  { id: "silence", label: "Silence", icon: "🔇" },
  { id: "rain", label: "Rain", icon: "🌧️" },
  { id: "cafe", label: "Café", icon: "☕" },
  { id: "forest", label: "Forest", icon: "🌲" },
  { id: "lofi", label: "Lo-Fi", icon: "🎵" },
];

const SESSION_PRESETS = [
  { label: "Quick Focus", duration: 25, color: "text-blue-400", bg: "bg-blue-400/10" },
  { label: "Deep Work", duration: 50, color: "text-purple-400", bg: "bg-purple-400/10" },
  { label: "Sprint", duration: 15, color: "text-green-400", bg: "bg-green-400/10" },
];

const FOCUS_TIPS = [
  "One task at a time. Multi-tasking is a myth.",
  "Turn off all notifications until the timer ends.",
  "Your best work happens in uninterrupted blocks.",
  "After focus: reward yourself with a 5-minute break.",
  "Define your ONE goal before starting the timer.",
];

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function FocusModePage() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState("silence");
  const [goal, setGoal] = useState("");
  const [editGoal, setEditGoal] = useState(false);
  const [tip] = useState(() => FOCUS_TIPS[Math.floor(Math.random() * FOCUS_TIPS.length)]);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSeconds = useRef(minutes * 60 + seconds);
  const initialSeconds = useRef(25 * 60);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        totalSeconds.current -= 1;
        if (totalSeconds.current <= 0) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setDone(true);
          setMinutes(0); setSeconds(0);
          setSessions(s => s + 1);
        } else {
          setMinutes(Math.floor(totalSeconds.current / 60));
          setSeconds(totalSeconds.current % 60);
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function start() { totalSeconds.current = minutes * 60 + seconds; initialSeconds.current = totalSeconds.current; setDone(false); setRunning(true); }
  function reset() { setRunning(false); setDone(false); const m = 25; setMinutes(m); setSeconds(0); totalSeconds.current = m * 60; }
  function setPreset(dur: number) { setRunning(false); setDone(false); setMinutes(dur); setSeconds(0); totalSeconds.current = dur * 60; initialSeconds.current = dur * 60; }
  function adjustMinutes(delta: number) { if (running) return; const newM = Math.max(1, Math.min(90, minutes + delta)); setMinutes(newM); totalSeconds.current = newM * 60; }

  const progress = 1 - (totalSeconds.current / initialSeconds.current);
  const circumference = 2 * Math.PI * 110;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.04) 0%, transparent 60%)" }}>
      <div className="max-w-xl mx-auto w-full px-6 py-8 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-accent" />
            <h1 className="font-display font-bold text-xl text-foreground">Focus Mode</h1>
          </div>
          <p className="text-sm text-muted-foreground">{tip}</p>
        </div>

        {/* Presets */}
        <div className="flex gap-3">
          {SESSION_PRESETS.map(p => (
            <button key={p.label} onClick={() => setPreset(p.duration)}
              className={cn("flex flex-col items-center px-4 py-2.5 rounded-xl border border-border hover:border-accent/40 transition-all text-center", p.bg)}>
              <span className={cn("text-lg font-display font-bold", p.color)}>{p.duration}m</span>
              <span className="text-xs text-muted-foreground mt-0.5">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Timer Ring */}
        <div className="relative flex items-center justify-center">
          <svg width="260" height="260" className="-rotate-90">
            <circle cx="130" cy="130" r="110" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <circle cx="130" cy="130" r="110" fill="none" stroke="hsl(var(--accent))" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.5s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => adjustMinutes(1)} disabled={running} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <span className="font-display text-6xl font-bold text-foreground tabular-nums tracking-tight">
                {pad(minutes)}:{pad(seconds)}
              </span>
              <button onClick={() => adjustMinutes(-1)} disabled={running} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
            </div>
            {sessions > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-accent font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />{sessions} session{sessions !== 1 ? "s" : ""} today
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="font-display font-bold text-lg text-foreground">Session complete! 🎉</p>
                <p className="text-sm text-muted-foreground">Take a well-deserved break.</p>
              </div>
              <button onClick={reset} className="flex items-center gap-2 px-6 py-2.5 rounded-xl accent-gradient text-white font-semibold">
                <RotateCcw className="w-4 h-4" /> Start New Session
              </button>
            </motion.div>
          ) : (
            <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
              <button onClick={reset} className="p-3 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={running ? () => setRunning(false) : start}
                className="w-16 h-16 rounded-full accent-gradient flex items-center justify-center shadow-accent-glow text-white">
                {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </motion.button>
              <div className="p-3 rounded-xl bg-muted border border-border text-muted-foreground">
                <Target className="w-5 h-5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goal */}
        <div className="w-full bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Focus Goal</span>
          </div>
          {editGoal ? (
            <div className="flex gap-2">
              <input autoFocus value={goal} onChange={e => setGoal(e.target.value)}
                onBlur={() => setEditGoal(false)} onKeyDown={e => { if (e.key === "Enter") setEditGoal(false); }}
                placeholder="What will you focus on?" className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent/50" />
            </div>
          ) : (
            <button onClick={() => setEditGoal(true)} className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors">
              {goal || "Click to set your focus goal…"}
            </button>
          )}
        </div>

        {/* Ambient Sound */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Ambient Sound</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {AMBIENT_SOUNDS.map(s => (
              <button key={s.id} onClick={() => setSound(s.id)}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all",
                  sound === s.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted-foreground hover:text-foreground hover:border-accent/40")}>
                <span>{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-3 gap-3">
          {[{ label: "Today", value: `${sessions} sessions` }, { label: "Total Focus", value: `${sessions * 25}min` }, { label: "Streak", value: "3 days 🔥" }].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-3 text-center">
              <p className="font-display font-bold text-foreground text-sm mb-0.5">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
