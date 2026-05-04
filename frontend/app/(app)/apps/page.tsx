"use client";

import { motion } from "framer-motion";
import { FileText, Table, CheckSquare, Plus } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";

import { useRouter } from "next/navigation";

const APP_TYPES = [
  {
    id: "doc",
    title: "Documents",
    description: "Collaborative rich text editing",
    icon: FileText,
    color: "bg-blue-500",
  },
  {
    id: "sheet",
    title: "Spreadsheets",
    description: "Powerful data tables and calculations",
    icon: Table,
    color: "bg-green-500",
  },
  {
    id: "task",
    title: "Tasks",
    description: "Track and manage team projects",
    icon: CheckSquare,
    color: "bg-orange-500",
  },
];

export default function AppsHubPage() {
  const router = useRouter();
  const { files, addFile } = useAppStore();
  const [hoveredApp, setHoveredApp] = useState<string | null>(null);

  const handleCreateNew = (type: "doc" | "sheet" | "task") => {
    const newFile = {
      id: crypto.randomUUID(),
      type,
      title: `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: "",
      createdAt: new Date().toISOString(),
    };
    addFile(newFile);
    router.push(`/apps/${type}/${newFile.id}`);
  };

  const handleOpenFile = (id: string, type: string) => {
    router.push(`/apps/${type}/${id}`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Apps Hub</h1>
          <p className="text-muted-foreground mt-2 text-lg">Create, manage, and collaborate on your team's resources.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {APP_TYPES.map((app) => (
            <motion.div
              key={app.id}
              whileHover={{ y: -5, scale: 1.02 }}
              onHoverStart={() => setHoveredApp(app.id)}
              onHoverEnd={() => setHoveredApp(null)}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 cursor-pointer shadow-sm hover:shadow-md transition-shadow group"
              onClick={() => handleCreateNew(app.id as any)}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${app.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <app.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{app.title}</h3>
              <p className="text-muted-foreground">{app.description}</p>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: hoveredApp === app.id ? 1 : 0, x: hoveredApp === app.id ? 0 : -10 }}
                className="absolute bottom-6 right-6 flex items-center text-accent font-semibold text-sm"
              >
                Create New <Plus className="w-4 h-4 ml-1" />
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Recent Files</h2>
          {files.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20">
              <p className="text-muted-foreground">No files created yet. Select an app above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {files.map((file) => {
                const appType = APP_TYPES.find((a) => a.id === file.type);
                const Icon = appType?.icon || FileText;
                
                return (
                  <motion.div
                    key={file.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface cursor-pointer hover:border-accent/50 transition-colors"
                    onClick={() => handleOpenFile(file.id, file.type)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${appType?.color || "bg-gray-500"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{file.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
