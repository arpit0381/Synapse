import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useTaskSync(workspaceId: string) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    fetchTasks();

    const channel = supabase
      .channel(`tasks:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) => prev.map(t => t.id === payload.new.id ? payload.new : t));
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assignments:task_assignments ( user:profiles ( id, full_name, avatar_url ) ),
        subtasks:subtasks ( * ),
        comments:task_comments ( * )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (data) setTasks(data);
    setLoading(false);
  };

  const createTask = async (task: any) => {
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...task, workspace_id: workspaceId })
      .select()
      .single();
    return { data, error };
  };

  const updateTask = async (taskId: string, updates: any) => {
    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);
    return { data, error };
  };

  return { tasks, loading, createTask, updateTask };
}
