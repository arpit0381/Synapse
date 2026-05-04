"use client";

import { useAppStore } from "@/store/appStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import SheetEditor from "@/components/apps/SheetEditor";

export default function SheetPage() {
  const { id } = useParams();
  const router = useRouter();
  const { files, updateFile } = useAppStore();
  const [file, setFile] = useState<any>(null);

  useEffect(() => {
    const f = files.find((f) => f.id === id);
    if (f && f.type === "sheet") {
      setFile(f);
    } else if (f) {
      router.push(`/apps/${f.type}/${f.id}`);
    } else {
      router.push("/apps");
    }
  }, [id, files, router]);

  if (!file) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-14 border-b border-border flex items-center px-4 bg-surface gap-4 flex-shrink-0 z-10">
        <button 
          onClick={() => router.push("/apps")}
          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <input 
          type="text" 
          value={file.title}
          onChange={(e) => updateFile(file.id, { title: e.target.value })}
          className="bg-transparent border-none focus:outline-none text-lg font-semibold text-foreground px-2 py-1 rounded hover:bg-muted transition-colors flex-1"
        />
      </div>
      <div className="flex-1 overflow-hidden relative">
        <SheetEditor 
          content={file.content} 
          onChange={(newContent) => updateFile(file.id, { content: newContent })} 
        />
      </div>
    </div>
  );
}
