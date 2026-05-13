"use client";

import { useState } from "react";
import { 
  Plus, Check, Trash2, Calendar, User as UserIcon, 
  Flag, MoreVertical, Search, Filter, LayoutGrid, List as ListIcon 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTaskSync } from "@/lib/task-sync";
import { useAppStore } from "@/store/appStore";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { format } from "date-fns";

interface TaskEditorProps {
  workspaceId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-blue-500 bg-blue-500/10",
  medium: "text-orange-500 bg-orange-500/10",
  high: "text-red-500 bg-red-500/10",
  urgent: "text-purple-500 bg-purple-500/10",
};

const STATUS_ICONS: Record<string, any> = {
  todo: "○",
  in_progress: "◑",
  done: "●",
  backlog: "◌",
};

export default function TaskEditor({ workspaceId }: TaskEditorProps) {
  const { user } = useAppStore();
  const { tasks, loading, createTask, updateTask } = useTaskSync(workspaceId);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await createTask({
      title: newTaskTitle.trim(),
      status: "todo",
      priority: "medium",
      created_by: user?.id
    });
    setNewTaskTitle("");
  };

  const toggleStatus = async (task: any) => {
    const nextStatus: Record<string, string> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    await updateTask(task.id, { status: nextStatus[task.status] || "todo" });
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full h-full flex flex-col gap-6">
      {/* Header / Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Team Operations</h2>
          <p className="text-sm text-muted-foreground font-medium">Manage and track high-priority objectives.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface p-1 rounded-2xl border border-border">
          <button 
            onClick={() => setView("list")}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <ListIcon className="w-3.5 h-3.5" /> List
          </button>
          <button 
            onClick={() => setView("kanban")}
            className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2", view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleCreateTask} className="flex gap-2 group">
        <div className="relative flex-1">
          <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add an objective..."
            className="w-full bg-surface border border-border rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent/30 text-foreground font-medium transition-all"
          />
        </div>
        <button 
          type="submit"
          disabled={!newTaskTitle.trim()}
          className="bg-accent text-white px-6 py-3 rounded-2xl font-black text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-accent/20 transition-all active:scale-95"
        >
          Create
        </button>
      </form>

      {/* Tasks Grid/List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-8 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.div 
              key={task.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "group flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border transition-all duration-300",
                task.status === "done" ? "bg-surface/30 border-transparent opacity-60" : "bg-surface border-border hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
              )}
            >
              <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={() => toggleStatus(task)}
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-sm font-black transition-all border-2",
                    task.status === "done" ? "bg-accent border-accent text-white" : "border-muted-foreground/30 hover:border-accent text-muted-foreground/0 hover:text-accent"
                  )}
                >
                  <Check className={cn("w-3.5 h-3.5 transition-transform", task.status === "done" ? "scale-100" : "scale-0")} />
                </button>
                
                <div className="flex flex-col gap-0.5">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground/60")}>
                    SYM-{task.id.slice(0, 4)}
                  </span>
                  <span className={cn("font-bold text-foreground transition-all", task.status === "done" && "line-through text-muted-foreground")}>
                    {task.title}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Priority */}
                <div className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5", PRIORITY_COLORS[task.priority] || "bg-muted text-muted-foreground")}>
                  <Flag className="w-3 h-3" />
                  {task.priority}
                </div>

                {/* Due Date */}
                {task.due_date && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(task.due_date), "MMM d")}
                  </div>
                )}

                {/* Assignees */}
                <div className="flex -space-x-2">
                  {task.assignments?.map((a: any) => (
                    <div 
                      key={a.user.id} 
                      className="w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-sm"
                      style={{ backgroundColor: stringToColor(a.user.full_name) }}
                      title={a.user.full_name}
                    >
                      {a.user.avatar_url ? (
                        <img src={a.user.avatar_url} alt={a.user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(a.user.full_name)
                      )}
                    </div>
                  ))}
                  {(!task.assignments || task.assignments.length === 0) && (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground border-2 border-surface">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <button className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-muted">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <CheckSquare className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Zero Task Inertia</h3>
              <p className="text-muted-foreground text-sm max-w-[250px] mt-1">Your objectives list is clear. Add a new goal to start building.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CheckSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
////////////////////
////////////////////