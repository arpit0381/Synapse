"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Upload, Search, Grid3X3, List, FileText, Image as ImageIcon, File, Trash2, Download, X, Loader2, Filter } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import { toast } from "react-hot-toast";

const FILE_TYPE_ICONS: Record<string, any> = { "image/": ImageIcon, "application/pdf": FileText, default: File };
function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return File;
}
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const { currentWorkspace, user } = useAppStore();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["files", currentWorkspace?.id, typeFilter, search],
    queryFn: () => api.files.list(currentWorkspace!.id, typeFilter || undefined, undefined, search || undefined),
    enabled: !!currentWorkspace?.id,
  });
  const files = data?.files || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.files.delete(id, user!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["files"] }); toast.success("File deleted"); setSelectedFile(null); },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace || !user) return;
    setUploading(true);
    try {
      const urlData = await api.files.getUploadUrl({ filename: file.name, contentType: file.type, workspaceId: currentWorkspace.id, userId: user.id, sizeBytes: file.size });
      await api.files.upload(urlData.uploadUrl, file, urlData.token);
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File uploaded!");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight flex items-center gap-2"><FolderOpen className="w-6 h-6 text-accent" />Files</h1>
          <p className="text-sm text-muted-foreground mt-1">{files.length} files in {currentWorkspace?.name}</p>
        </div>
        <label className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm cursor-pointer transition-all", uploading ? "bg-muted text-muted-foreground" : "accent-gradient text-white hover:opacity-90 shadow-lg")}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Upload File"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent/50" />
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
          {[{ label: "All", value: "" }, { label: "Images", value: "images" }, { label: "Docs", value: "docs" }].map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", typeFilter === t.value ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground")}>{t.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5">
          <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-md transition-colors", view === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground")}><Grid3X3 className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground")}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Files Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-semibold text-lg mb-1">No files yet</p>
          <p className="text-sm">Upload files to share with your team</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((f: any, i: number) => {
            const Icon = getFileIcon(f.mime_type);
            const isImage = f.mime_type?.startsWith("image/");
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedFile(f)} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-all cursor-pointer group hover:shadow-lg">
                <div className="h-32 bg-muted/30 flex items-center justify-center overflow-hidden">
                  {isImage && f.url ? <img src={f.url} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <Icon className="w-10 h-10 text-muted-foreground/40" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(f.size_bytes)} • {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {files.map((f: any) => {
            const Icon = getFileIcon(f.mime_type);
            return (
              <div key={f.id} onClick={() => setSelectedFile(f)} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-b-0">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-accent" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{f.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(f.size_bytes)}</p></div>
                <div className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</div>
                {f.uploader && <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: stringToColor(f.uploader.full_name || "U") }}>{getInitials(f.uploader.full_name || "U")}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* File Detail Drawer */}
      <AnimatePresence>
        {selectedFile && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedFile(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-sm">File Details</h3>
                <button onClick={() => setSelectedFile(null)} className="p-1 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selectedFile.mime_type?.startsWith("image/") && selectedFile.url && <img src={selectedFile.url} alt={selectedFile.name} className="w-full rounded-xl border border-border" />}
                <div><p className="font-bold text-lg">{selectedFile.name}</p><p className="text-sm text-muted-foreground mt-1">{formatFileSize(selectedFile.size_bytes)} • {selectedFile.mime_type}</p><p className="text-xs text-muted-foreground mt-1">Uploaded {new Date(selectedFile.created_at).toLocaleString()}</p></div>
                {selectedFile.uploader && <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg"><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: stringToColor(selectedFile.uploader.full_name || "U") }}>{getInitials(selectedFile.uploader.full_name || "U")}</div><div><p className="text-sm font-medium">{selectedFile.uploader.full_name}</p><p className="text-xs text-muted-foreground">@{selectedFile.uploader.username}</p></div></div>}
                <div className="flex gap-2">
                  {selectedFile.url && <a href={selectedFile.url} target="_blank" className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"><Download className="w-4 h-4" />Download</a>}
                  {selectedFile.uploaded_by === user?.id && <button onClick={() => deleteMutation.mutate(selectedFile.id)} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-1">{deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Delete</button>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
