"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function TaskEditor({ content, onChange }: TaskEditorProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    try {
      if (content) {
        setTasks(JSON.parse(content));
      }
    } catch (e) {
      console.error("Failed to parse tasks", e);
    }
  }, [content]);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    onChange(JSON.stringify(newTasks));
  };

  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTask.trim()) return;
    saveTasks([...tasks, { id: crypto.randomUUID(), text: newTask.trim(), completed: false }]);
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
      <form onSubmit={handleAddTask} className="flex gap-2 mb-8">
        <input 
          type="text" 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
        />
        <button 
          type="submit"
          disabled={!newTask.trim()}
          className="bg-accent text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${task.completed ? 'bg-surface/50 border-transparent' : 'bg-surface border-border'}`}
            >
              <button 
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${task.completed ? 'bg-accent border-accent text-white' : 'border-muted-foreground/50 hover:border-accent'}`}
              >
                {task.completed && <Check className="w-4 h-4" />}
              </button>
              <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.text}
              </span>
              <button 
                onClick={() => deleteTask(task.id)}
                className="text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No tasks yet. Create one above!
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
