"use client";

import { useAppStore } from "@/store/appStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MoreVertical, Search, Filter, History, Share2 } from "lucide-react";
import TaskEditor from "@/components/apps/TaskEditor";
import { toast } from "sonner";

export default function TaskPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAppStore();
  const [taskFile, setTaskFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaskFile();
  }, [id]);

  const fetchTaskFile = async () => {
    try {
      // For now, we reuse the docs API to get metadata for "files" of type task
      // or we just fetch from the local store since it's just metadata
      const workspaceId = localStorage.getItem("currentWorkspaceId");
      if (!workspaceId) return;

      // This is a placeholder for real metadata fetching
      setTaskFile({ id, title: "Workspace Objectives", workspace_id: workspaceId });
    } catch (error) {
      toast.error("Failed to load task project");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold animate-pulse">Syncing Task Pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Premium Glass Header */}
      <div className="h-16 border-b border-border flex items-center px-6 bg-surface/80 backdrop-blur-md sticky top-0 z-20 gap-4">
        <button 
          onClick={() => router.push("/apps")}
          className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-border"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col flex-1">
          <h1 className="text-lg font-bold text-foreground px-2">{taskFile?.title || "Tasks"}</h1>
          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Project Management • Agile Workflow
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-accent/20 transition-all">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative p-8 bg-surface/10">
        <TaskEditor workspaceId={taskFile?.workspace_id} />
      </div>
    </div>
  );
}
