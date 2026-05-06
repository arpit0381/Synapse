"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, LayoutGrid, List, Clock, CheckCircle2, AlertTriangle, X, MoreHorizontal } from "lucide-react";
import { cn, getInitials, stringToColor, PRIORITY_CONFIG } from "@/lib/utils";

type Status = "backlog" | "in_progress" | "in_review" | "done";
type Priority = "urgent" | "high" | "medium" | "low";

interface Task {
  id: string; title: string; status: Status; priority: Priority;
  assignee: string; tags: string[]; due?: Date;
  subtasks?: number; completedSubtasks?: number;
}

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "text-muted-foreground" },
  { id: "in_progress", label: "In Progress", color: "text-blue-400" },
  { id: "in_review", label: "In Review", color: "text-yellow-400" },
  { id: "done", label: "Done", color: "text-green-400" },
];

const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "Implement Socket.io reconnect logic", status: "in_progress", priority: "urgent", assignee: "Aryan S.", tags: ["backend", "realtime"], due: new Date(Date.now() + 86400000), subtasks: 4, completedSubtasks: 2 },
  { id: "t2", title: "Design the onboarding flow v2", status: "in_review", priority: "high", assignee: "Priya K.", tags: ["design", "ux"], due: new Date(Date.now() + 2 * 86400000) },
  { id: "t3", title: "Write unit tests for auth service", status: "backlog", priority: "medium", assignee: "Leo Z.", tags: ["testing"], due: new Date(Date.now() + 5 * 86400000) },
  { id: "t4", title: "Fix mobile sidebar collapse bug", status: "in_progress", priority: "high", assignee: "Aryan S.", tags: ["frontend", "bug"], due: new Date(Date.now() - 86400000) },
  { id: "t5", title: "Add Cloudinary image optimization", status: "backlog", priority: "low", assignee: "Leo Z.", tags: ["backend"] },
  { id: "t6", title: "Set up CI/CD pipeline", status: "done", priority: "high", assignee: "James T.", tags: ["devops"] },
  { id: "t7", title: "User interview analysis", status: "done", priority: "medium", assignee: "Sara M.", tags: ["research"] },
  { id: "t8", title: "API rate limiting middleware", status: "backlog", priority: "medium", assignee: "Leo Z.", tags: ["backend", "security"] },
  { id: "t9", title: "Dashboard analytics charts", status: "in_progress", priority: "medium", assignee: "Aryan S.", tags: ["frontend"], due: new Date(Date.now() + 3 * 86400000), subtasks: 3, completedSubtasks: 1 },
  { id: "t10", title: "WebRTC call integration", status: "backlog", priority: "urgent", assignee: "Leo Z.", tags: ["realtime"] },
  { id: "t11", title: "Dark mode accessibility audit", status: "in_review", priority: "medium", assignee: "Sara M.", tags: ["accessibility"] },
  { id: "t12", title: "Notification email templates", status: "backlog", priority: "low", assignee: "Priya K.", tags: ["design"] },
];

function TaskCard({ task, onMove }: { task: Task; onMove: (id: string, status: Status) => void }) {
  const pc = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.due && task.due < new Date() && task.status !== "done";
  const [menu, setMenu] = useState(false);

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="bg-surface border border-border rounded-xl p-3 hover:border-accent/30 hover:shadow-lg transition-all group relative">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", pc.color, pc.bg, pc.border)}>{pc.label}</span>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              {COLUMNS.filter(c => c.id !== task.status).map(c => (
                <button key={c.id} onClick={() => { onMove(task.id, c.id); setMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
                  Move to {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-sm font-medium text-foreground leading-snug mb-2">{task.title}</p>
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">{t}</span>)}
        </div>
      )}
      {task.subtasks && task.subtasks > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Subtasks</span><span>{task.completedSubtasks}/{task.subtasks}</span>
          </div>
          <div className="h-1 bg-muted rounded-full">
            <div className="h-full accent-gradient rounded-full" style={{ width: `${((task.completedSubtasks ?? 0) / task.subtasks) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className={cn("flex items-center gap-1 text-[10px]", isOverdue ? "text-red-400 font-medium" : "text-muted-foreground")}>
          <Clock className="w-3 h-3" />
          {task.due ? (isOverdue ? "Overdue" : task.due.toLocaleDateString([], { month: "short", day: "numeric" })) : "No due date"}
        </span>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
          style={{ backgroundColor: stringToColor(task.assignee) }}>{getInitials(task.assignee)}</div>
      </div>
    </motion.div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState<Status>("backlog");

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  function moveTask(id: string, status: Status) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  function addTask() {
    if (!newTitle.trim()) return;
    setTasks(prev => [...prev, { id: `t${Date.now()}`, title: newTitle.trim(), status: newStatus, priority: "medium", assignee: "Aryan S.", tags: [] }]);
    setNewTitle(""); setShowNew(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 py-4 border-b border-border flex-shrink-0 gap-4">
        <div>
          <h1 className="font-display font-bold text-lg text-foreground">Tasks</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{filtered.filter(t => t.status !== "done").length} open · {filtered.filter(t => t.status === "done").length} done</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="relative flex-1 md:flex-none min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
              className="bg-muted border border-border rounded-lg pl-9 pr-3 py-2 md:py-1.5 text-xs text-foreground outline-none focus:border-accent/50 w-full md:w-44" />
          </div>
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button onClick={() => setView("kanban")} className={cn("p-1.5 rounded-md transition-colors", view === "kanban" ? "bg-surface text-accent" : "text-muted-foreground")}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-surface text-accent" : "text-muted-foreground")}><List className="w-3.5 h-3.5" /></button>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowNew(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl accent-gradient text-white text-xs sm:text-sm font-semibold shadow-accent-glow">
            <Plus className="w-4 h-4" /> New Task
          </motion.button>
        </div>
      </div>

      {/* Quick add */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-border bg-muted/30 overflow-hidden flex-shrink-0">
            <div className="flex items-center gap-3 px-6 py-3">
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowNew(false); }}
                placeholder="Task title…" className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50" />
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as Status)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button onClick={addTask} className="px-4 py-2 rounded-lg accent-gradient text-white text-sm font-medium">Add</button>
              <button onClick={() => setShowNew(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban */}
      {view === "kanban" && (
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full px-4 sm:px-6 py-4 kanban-scroll">
            {COLUMNS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="flex flex-col w-72 flex-shrink-0 kanban-column-mobile">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("font-semibold text-sm", col.color)}>{col.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{colTasks.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <AnimatePresence>
                      {colTasks.map(task => <TaskCard key={task.id} task={task} onMove={moveTask} />)}
                    </AnimatePresence>
                    <button onClick={() => { setNewStatus(col.id); setShowNew(true); }}
                      className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-muted/30 transition-all text-sm">
                      <Plus className="w-4 h-4" /> Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.id);
            if (!colTasks.length) return null;
            return (
              <div key={col.id} className="mb-6">
                <div className={cn("font-semibold text-sm mb-2", col.color)}>{col.label} <span className="text-muted-foreground font-normal">({colTasks.length})</span></div>
                {colTasks.map(task => {
                  const pc = PRIORITY_CONFIG[task.priority];
                  const isOverdue = task.due && task.due < new Date() && task.status !== "done";
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl mb-1 hover:border-accent/30 transition-colors group">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", pc.color.replace("text-", "bg-"))} />
                      <span className="flex-1 text-sm text-foreground">{task.title}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">{t}</span>)}
                      </div>
                      <span className={cn("text-xs", isOverdue ? "text-red-400 font-medium" : "text-muted-foreground")}>
                        {task.due ? (isOverdue ? "Overdue" : task.due.toLocaleDateString([], { month: "short", day: "numeric" })) : "—"}
                      </span>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: stringToColor(task.assignee) }}>{getInitials(task.assignee)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
