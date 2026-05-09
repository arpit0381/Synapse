"use client";

import { useAppStore } from "../../../../../store/appStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DocumentEditor from "../../../../../components/apps/DocumentEditor";
import { ArrowLeft, Share2, MoreVertical, Search, History } from "lucide-react";
import { toast } from "sonner";

export default function DocumentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAppStore();
  const [documentData, setDocumentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoc();
  }, [id]);

  const fetchDoc = async () => {
    try {
      const res = await fetch(`/api/apps/docs/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      
      if (data.document) {
        setDocumentData(data.document);
      } else {
        toast.error("Document not found");
        router.push("/apps");
      }
    } catch (error) {
      toast.error("Failed to load document");
      router.push("/apps");
    } finally {
      setLoading(false);
    }
  };

  const updateTitle = async (title: string) => {
    setDocumentData({ ...documentData, title });
    try {
      await fetch(`/api/apps/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch (error) {
      toast.error("Failed to sync title");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold animate-pulse">Synchronizing Workspace...</p>
        </div>
      </div>
    );
  }

  if (!documentData) return null;

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
          <input 
            type="text" 
            value={documentData.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-lg font-bold text-foreground px-2 py-0.5 rounded hover:bg-muted/50 transition-colors"
          />
          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Last edited {documentData.updated_at ? new Date(documentData.updated_at).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <History className="w-4 h-4" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-accent/20 transition-all">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface/10 pattern-dots">
        {documentData && (
          <DocumentEditor 
            docId={id as string} 
            initialContent={documentData.content} 
          />
        )}
      </div>
    </div>
  );
}
