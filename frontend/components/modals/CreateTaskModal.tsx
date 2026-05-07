"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckSquare, AlignLeft, Calendar, Tag, UserPlus,
  AlertCircle, ChevronDown, Trash2, CheckCircle2
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn, stringToColor, getInitials } from "@/lib/utils";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialStatus?: string;
}

const PRIORITIES = [
  { id: "low", label: "Low", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { id: "medium", label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { id: "high", label: "High", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  { id: "urgent", label: "Urgent", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
];

const STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

export function CreateTaskModal({ isOpen, onClose, onSuccess, initialStatus = "backlog" }: CreateTaskModalProps) {
  const { user, currentWorkspace } = useAppStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  useEffect(() => {
    if (isOpen && currentWorkspace?.id) {
      api.workspaces.getMembers(currentWorkspace.id)
        .then(res => {
          if (res && res.members) {
            setMembers(res.members);
          } else {
            setMembers([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch members:", err);
          setMembers([]);
        });
    }
  }, [isOpen, currentWorkspace?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentWorkspace || !user) return;

    setLoading(true);
    try {
      await api.tasks.create({
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        title,
        description,
        status,
        priority,
        due_date: dueDate || undefined,
        assignee_ids: assigneeIds,
      });
      toast.success("Task created successfully");
      setTitle("");
      setDescription("");
      setAssigneeIds([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (uid: string) => {
    setAssigneeIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-surface border border-border shadow-2xl rounded-2xl"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Create New Task</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  placeholder="Task title..."
                  className="w-full text-2xl font-black bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="flex items-start gap-3 text-muted-foreground focus-within:text-foreground group">
                  <AlignLeft className="w-5 h-5 mt-1 transition-colors" />
                  <textarea
                    placeholder="Add a detailed description..."
                    rows={3}
                    className="w-full bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status</label>
                  <div className="relative">
                    <select
                      className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm appearance-none outline-none focus:ring-2 focus:ring-accent/20"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Priority</label>
                  <div className="flex gap-1.5">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight border transition-all",
                          priority === p.id ? cn(p.bg, p.border, p.color) : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                    <UserPlus className="w-3 h-3" /> Assignees
                  </label>
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex -space-x-2">
                      {members.filter(m => assigneeIds.includes(m.id)).map(m => (
                        <div
                          key={m.id}
                          className="w-8 h-8 rounded-full border-2 border-surface bg-muted overflow-hidden transition-transform hover:translate-y-[-2px] hover:z-10"
                          title={m.full_name}
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: stringToColor(m.full_name || 'U') }}>
                              {getInitials(m.full_name || 'U')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMemberSelector(!showMemberSelector)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground transition-all",
                          showMemberSelector ? "border-accent/40 text-accent bg-accent/5" : "hover:bg-accent/10 hover:text-accent hover:border-accent/40"
                        )}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {showMemberSelector && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 top-full mt-2 w-56 max-h-60 overflow-y-auto bg-surface border border-border rounded-xl shadow-2xl z-[110] p-2 custom-scrollbar"
                          >
                            <div className="px-2 py-1.5 mb-1 border-b border-border/50">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Select Members</span>
                            </div>
                            {members.length === 0 ? (
                              <div className="p-4 text-center">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">No members found</p>
                              </div>
                            ) : (
                              members.map(m => (
                                <div
                                  key={m.id}
                                  onClick={() => toggleAssignee(m.id)}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                                    assigneeIds.includes(m.id) ? "bg-accent/10 text-accent" : "hover:bg-muted"
                                  )}
                                >
                                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: stringToColor(m.full_name || 'U') }}>
                                    {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[8px] text-white flex items-center justify-center h-full font-black">{getInitials(m.full_name || 'U')}</span>}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-xs font-bold truncate">{m.full_name}</span>
                                    {m.username && <span className="text-[10px] text-muted-foreground truncate italic">@{m.username}</span>}
                                  </div>
                                  {assigneeIds.includes(m.id) && <CheckCircle2 className="w-3 h-3 ml-auto text-accent" />}
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold shadow-lg shadow-accent/20 hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all btn-press"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}
