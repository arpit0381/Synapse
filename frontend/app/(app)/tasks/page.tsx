"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, LayoutGrid, List, Clock, CheckCircle2,
  AlertTriangle, X, MoreHorizontal, Calendar, Users, Star, User
} from "lucide-react";
import { useAppStore, Task } from "@/store/appStore";
import { cn, getInitials, stringToColor, PRIORITY_CONFIG } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import toast from "react-hot-toast";

type Status = "backlog" | "in_progress" | "in_review" | "done" | "overdue";

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "text-muted-foreground" },
  { id: "in_progress", label: "In Progress", color: "text-blue-400" },
  { id: "in_review", label: "In Review", color: "text-yellow-400" },
  { id: "done", label: "Done", color: "text-green-400" },
];

function TaskCard({ task, onMove }: { task: Task; onMove: (id: string, status: Status) => void }) {
  const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const due = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = due && due < new Date() && task.status !== "done";
  const [menu, setMenu] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="bg-surface border border-border rounded-xl p-3 hover:border-accent/30 hover:shadow-lg transition-all group relative cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", pc.color, pc.bg, pc.border)}>
          {pc.label}
        </span>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              {COLUMNS.filter(c => c.id !== task.status).map(c => (
                <button
                  key={c.id}
                  onClick={() => { onMove(task.id, c.id); setMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Move to {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground leading-snug mb-2 group-hover:text-accent transition-colors">
        {task.title}
      </p>

      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-accent/5 text-accent/70 rounded-md border border-accent/10">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {task.assignees && task.assignees.length > 0 ? (
              task.assignees.map((a: any) => (
                <div
                  key={a.id}
                  className="w-6 h-6 rounded-full border-2 border-surface overflow-hidden shadow-sm"
                  title={a.full_name}
                >
                  {a.avatar_url ? (
                    <img src={a.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: stringToColor(a.full_name) }}>
                      {getInitials(a.full_name)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground/40">
                <Users className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        <span className={cn("flex items-center gap-1 text-[10px]", isOverdue ? "text-red-400 font-bold" : "text-muted-foreground font-medium")}>
          <Clock className="w-3 h-3" />
          {due ? (isOverdue ? "Overdue" : due.toLocaleDateString([], { month: "short", day: "numeric" })) : "No due date"}
        </span>
      </div>
    </motion.div>
  );
}

export default function TasksPage() {
  const { currentWorkspace, user, currentUserRole } = useAppStore();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [isModalOpen, setModalOpen] = useState(false);
  const [onlyMe, setOnlyMe] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<string>("backlog");

  const queryClient = useQueryClient();

  // Fetch real tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", currentWorkspace?.id, onlyMe],
    queryFn: () => api.tasks.list(currentWorkspace!.id, undefined, onlyMe ? user?.id : undefined),
    enabled: !!currentWorkspace?.id,
  });

  const tasks = tasksData?.tasks || [];

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.tasks.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", currentWorkspace?.id] }),
  });

  const filtered = tasks.filter((t: Task) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = currentUserRole === "owner" || currentUserRole === "admin";

  const handleMove = (id: string, status: Status) => {
    updateMutation.mutate({ id, updates: { status } });
    toast.success(`Task moved to ${status.replace("_", " ")}`);
  };

  const openCreateModal = (status = "backlog") => {
    if (!canCreate) {
      toast.error("You don't have permission to create tasks");
      return;
    }
    setModalInitialStatus(status);
    setModalOpen(true);
  };

  if (!currentWorkspace) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-6 border-b border-border/60 bg-surface/30 flex-shrink-0 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-black text-2xl text-foreground tracking-tight">Tasks</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-wider">
              <Star className="w-3 h-3 fill-accent" /> Premium
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span className="text-foreground">{filtered.filter((t: Task) => t.status !== "done").length} active</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>{filtered.filter((t: Task) => t.status === "done").length} completed</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter tasks by name or description…"
              className="bg-muted/50 border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 w-full transition-all"
            />
          </div>

          <button
            onClick={() => setOnlyMe(!onlyMe)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider",
              onlyMe 
                ? "bg-accent/10 border-accent/40 text-accent shadow-sm shadow-accent/5" 
                : "bg-muted/50 border-border/80 text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="w-4 h-4" />
            {onlyMe ? "My Tasks Only" : "All Tasks"}
          </button>

          <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border">
            <button
              onClick={() => setView("kanban")}
              className={cn("p-2 rounded-lg transition-all", view === "kanban" ? "bg-surface text-accent shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("p-2 rounded-lg transition-all", view === "list" ? "bg-surface text-accent shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, translateY: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openCreateModal()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl accent-gradient text-white text-sm font-bold shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3px]" /> NEW TASK
          </motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Loading Workspace Tasks...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Kanban View */}
          {view === "kanban" && (
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex h-full p-6 gap-6 min-w-max">
                {COLUMNS.map(col => {
                  const colTasks = filtered.filter((t: Task) => t.status === col.id);
                  return (
                    <div key={col.id} className="flex flex-col w-80 bg-muted/20 border border-border/40 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-5 px-1">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-2 h-2 rounded-full", col.color.replace("text-", "bg-"))} />
                          <span className="font-black text-xs uppercase tracking-widest text-foreground">{col.label}</span>
                          <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span>
                        </div>
                        {canCreate && (
                          <button onClick={() => openCreateModal(col.id)} className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-accent transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 chat-scroll">
                        <AnimatePresence mode="popLayout">
                          {colTasks.map((task: Task) => (
                            <TaskCard key={task.id} task={task} onMove={handleMove} />
                          ))}
                        </AnimatePresence>
                        {colTasks.length === 0 && (
                          <div className="h-24 rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                            <CheckCircle2 className="w-5 h-5 opacity-50" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">No tasks here</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List View */}
          {view === "list" && (
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
              {COLUMNS.map(col => {
                const colTasks = filtered.filter((t: Task) => t.status === col.id);
                if (!colTasks.length && view === "list") return null;
                return (
                  <div key={col.id}>
                    <div className="flex items-center gap-3 mb-4 px-2">
                      <h3 className={cn("text-xs font-black uppercase tracking-[0.2em]", col.color)}>{col.label}</h3>
                      <div className="h-px flex-1 bg-border/40" />
                      <span className="text-[10px] font-bold text-muted-foreground">{colTasks.length} tasks</span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map((task: Task) => {
                        const pc = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                        const due = task.due_date ? new Date(task.due_date) : null;
                        const isOverdue = due && due < new Date() && task.status !== "done";
                        return (
                          <motion.div
                            layout
                            key={task.id}
                            className="flex items-center gap-4 px-5 py-4 bg-surface border border-border/60 rounded-2xl hover:border-accent/40 hover:shadow-md transition-all group"
                          >
                            <div className={cn("w-1.5 h-6 rounded-full flex-shrink-0", pc.color.replace("text-", "bg-"))} />
                            <div className="flex-1 min-w-0">
                              <span className="block text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">{task.title}</span>
                              {task.description && <span className="block text-xs text-muted-foreground truncate opacity-60">{task.description}</span>}
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="flex -space-x-1.5">
                                {task.assignees?.map((a: any) => (
                                  <div key={a.id} className="w-7 h-7 rounded-full border-2 border-surface overflow-hidden shadow-sm">
                                    {a.avatar_url ? <img src={a.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: stringToColor(a.full_name) }}>{getInitials(a.full_name)}</div>}
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center gap-4 w-32 justify-end">
                                <span className={cn("text-[10px] flex items-center gap-1.5 font-bold", isOverdue ? "text-red-400" : "text-muted-foreground/60")}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  {due ? due.toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                                </span>
                                <div className="relative">
                                  <button className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        initialStatus={modalInitialStatus}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tasks", currentWorkspace?.id] })}
      />
    </div>
  );
}
