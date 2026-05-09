"use client";

import { motion } from "framer-motion";
import { FileText, Table, CheckSquare, Plus, Clock, Star, ShieldCheck, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const APP_TYPES = [
  {
    id: "doc",
    title: "Documents",
    description: "Collaborative rich text editing",
    icon: FileText,
    color: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "sheet",
    title: "Spreadsheets",
    description: "Powerful data tables and calculations",
    icon: Table,
    color: "bg-green-500",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    id: "task",
    title: "Tasks",
    description: "Track and manage team projects",
    icon: CheckSquare,
    color: "bg-orange-500",
    gradient: "from-orange-500 to-amber-600",
  },
];

export default function AppsHubPage() {
  const router = useRouter();
  const { user, currentWorkspace } = useAppStore();
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [currentWorkspace?.id]);

  const fetchFiles = async () => {
    try {
      const workspaceId = currentWorkspace?.id;
      if (!workspaceId) return;

      const [docsRes, sheetsRes] = await Promise.all([
        fetch(`/api/apps/docs?workspace_id=${workspaceId}`),
        fetch(`/api/apps/sheets?workspace_id=${workspaceId}`),
      ]);

      const docsData = await docsRes.json();
      const sheetsData = await sheetsRes.json();

      const combined = [
        ...(docsData.documents || []).map((d: any) => ({ ...d, type: "doc" })),
        ...(sheetsData.sheets || []).map((s: any) => ({ ...s, type: "sheet" })),
      ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setFiles(combined);
    } catch (error) {
      toast.error("Failed to fetch hub resources");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async (type: "doc" | "sheet" | "task") => {
    if (type === "task") {
      // For tasks, we just redirect to the main task project for now
      router.push(`/apps/task/workspace-objectives`);
      return;
    }

    const workspaceId = currentWorkspace?.id;
    if (!workspaceId) {
      toast.error("Please select a workspace first");
      return;
    }

    setCreating(type);
    console.log(`[Hub] Creating ${type} for workspace ${workspaceId} by user ${user?.id}`);
    try {
      const res = await fetch(`/api/apps/${type}s`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          title: `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          created_by: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[Hub] Creation failed:", data);
        throw new Error(data.error || "Creation failed");
      }
      const newFile = data.document || data.sheet;
      if (newFile) {
        router.push(`/apps/${type}/${newFile.id}`);
      } else {
        throw new Error("Resource metadata missing in response");
      }
    } catch (error: any) {
      toast.error(`Failed to create ${type}: ${error.message}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto no-scrollbar pb-20">
      {/* Hero Section */}
      <div className="relative p-8 md:p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto w-full relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-accent fill-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">Production Grade Productivity</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display text-foreground tracking-tight leading-[1.1]">
            Apps <span className="text-accent">Hub</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-xl font-medium max-w-2xl leading-relaxed">
            Transforming your ideas into reality with high-performance real-time collaboration engines.
          </p>
        </div>
      </div>

      <div className="px-8 md:px-12 max-w-6xl mx-auto w-full">
        {!user && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-500 text-sm font-bold flex items-center gap-3">
            <Zap className="w-4 h-4" /> Authenticating your session...
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {APP_TYPES.map((app) => (
            <motion.div
              key={app.id}
              whileHover={{ y: -8, scale: 1.01 }}
              onHoverStart={() => setHoveredApp(app.id)}
              onHoverEnd={() => setHoveredApp(null)}
              className={cn(
                "relative overflow-hidden rounded-3xl border border-border bg-surface p-8 cursor-pointer shadow-sm hover:shadow-2xl hover:border-accent/40 transition-all group",
                creating === app.id && "opacity-50 pointer-events-none"
              )}
              onClick={() => handleCreateNew(app.id as any)}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 bg-gradient-to-br ${app.gradient} shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-500`}>
                <app.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">{app.title}</h3>
              <p className="text-muted-foreground font-medium leading-relaxed mb-4">{app.description}</p>
              
              <div className="flex items-center gap-2 mt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent px-2 py-0.5 bg-accent/10 rounded-md">Enterprise Ready</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">v2.0</span>
              </div>

              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: (hoveredApp === app.id || creating === app.id) ? 1 : 0, x: (hoveredApp === app.id || creating === app.id) ? 0 : -10 }}
                className="absolute bottom-8 right-8 flex items-center gap-2 text-accent font-black text-xs uppercase tracking-widest"
              >
                {creating === app.id ? "Creating..." : <>Launch <Plus className="w-4 h-4" /></>}
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent" />
              <h2 className="text-2xl font-black text-foreground tracking-tight">Recent Resources</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-green-500" /> End-to-End Encrypted</span>
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500" /> Starred</span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 rounded-[32px] border-2 border-dashed border-border bg-muted/5 group hover:bg-muted/10 transition-colors">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-bold text-lg">No synchronized files detected.</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Select an engine above to initialize your first resource.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((file) => {
                const appType = APP_TYPES.find((a) => a.id === file.type);
                const Icon = appType?.icon || FileText;
                
                return (
                  <Link
                    key={file.id}
                    href={`/apps/${file.type}/${file.id}`}
                    className="flex flex-col"
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="flex flex-col p-6 rounded-3xl border border-border bg-surface cursor-pointer hover:border-accent/40 transition-all hover:shadow-xl hover:shadow-accent/5 group h-full"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br ${appType?.gradient || "from-gray-500 to-gray-600"} shadow-lg group-hover:rotate-6 transition-transform`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground truncate text-lg group-hover:text-accent transition-colors">{file.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">
                               Edited {new Date(file.updated_at || file.created_at).toLocaleDateString()}
                             </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-border/40">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full border-2 border-surface bg-muted flex items-center justify-center text-[8px] font-bold">
                            {file.creator?.full_name?.[0] || "?"}
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-opacity">Open Resource</span>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
