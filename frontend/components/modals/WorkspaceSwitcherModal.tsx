import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, LogIn, Building2, Check, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAppStore, Workspace } from "@/store/appStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceSwitcherModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { user, workspaces, currentWorkspace, setCurrentWorkspace, setWorkspaces } = useAppStore();
  const [view, setView] = useState<"list" | "create" | "join">("list");
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.workspaces.create({ name, owner_id: user.id });
      setWorkspaces([...workspaces, res.workspace]);
      setCurrentWorkspace(res.workspace);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      onClose();
      setView("list");
      setName("");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.workspaces.join({ invite_code: inviteCode, user_id: user.id });
      // Refresh workspaces
      const wsRes = await api.workspaces.list(user.id);
      setWorkspaces(wsRes.workspaces);
      setCurrentWorkspace(res.workspace);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      onClose();
      setView("list");
      setInviteCode("");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid invite code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              {view === "list" && "Workspaces"}
              {view === "create" && "Create Workspace"}
              {view === "join" && "Join Workspace"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto max-h-[60vh]">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            {view === "list" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  {workspaces.map((ws: Workspace) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setCurrentWorkspace(ws);
                        onClose();
                        router.push("/dashboard");
                      }}
                      className={cn(
                        "group w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-200",
                        currentWorkspace?.id === ws.id
                          ? "bg-accent/10 border border-accent/20 shadow-sm"
                          : "hover:bg-muted/60 border border-transparent hover:border-border/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-sm",
                        currentWorkspace?.id === ws.id ? "accent-gradient text-white" : "bg-muted text-muted-foreground group-hover:bg-accent/20 group-hover:text-accent"
                      )}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[15px] truncate font-display tracking-tight",
                          currentWorkspace?.id === ws.id ? "text-accent font-bold" : "text-foreground font-semibold"
                        )}>
                          {ws.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {currentWorkspace?.id === ws.id ? "Currently Active" : "Click to switch"}
                        </p>
                      </div>
                      {currentWorkspace?.id === ws.id && (
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-border flex flex-col gap-2">
                  <button
                    onClick={() => setView("join")}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted text-sm font-medium text-foreground transition-colors border border-border"
                  >
                    <LogIn className="w-4 h-4 text-muted-foreground" />
                    Join Workspace with Invite Code
                  </button>
                  <button
                    onClick={() => setView("create")}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted text-sm font-medium text-foreground transition-colors border border-border"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    Create New Workspace
                  </button>
                </div>
              </div>
            )}

            {view === "create" && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Workspace Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    required
                    autoFocus
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setView("list"); setError(""); }}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="px-5 py-2 accent-gradient text-white text-sm font-medium rounded-lg shadow-accent-glow disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            )}

            {view === "join" && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3D4"
                    required
                    autoFocus
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground uppercase outline-none focus:border-accent/50"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setView("list"); setError(""); }}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !inviteCode.trim()}
                    className="px-5 py-2 accent-gradient text-white text-sm font-medium rounded-lg shadow-accent-glow disabled:opacity-50"
                  >
                    {loading ? "Joining..." : "Join"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
