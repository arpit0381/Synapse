"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user, isAuthenticated, setWorkspaces, setCurrentWorkspace } = useAppStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      // Save the invite code to redirect back after login
      sessionStorage.setItem("pendingInvite", code);
      router.push(`/login?redirect=/invite/${code}`);
      return;
    }

    const joinWorkspace = async () => {
      try {
        const { workspace, message } = await api.workspaces.join(code, user!.id);
        setWorkspaceName(workspace.name);
        
        // Refresh workspace list
        const { workspaces } = await api.workspaces.list(user!.id);
        setWorkspaces(workspaces);
        
        // Find the joined workspace in the list to get full data
        const joined = workspaces.find((w: any) => w.id === workspace.id);
        if (joined) setCurrentWorkspace(joined);
        
        setStatus("success");
        toast.success(`Welcome to ${workspace.name}!`);
        
        // Redirect after a short delay to show success state
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.response?.data?.error || "Failed to join workspace. The link might be invalid or expired.");
      }
    };

    joinWorkspace();
  }, [code, isAuthenticated, user, router, setWorkspaces, setCurrentWorkspace]);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center">
          {status === "loading" && (
            <>
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 relative">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl"
                />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Joining Workspace...</h1>
              <p className="text-slate-400">Please wait while we set up your access. You're almost there!</p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">You're in! 🎉</h1>
              <p className="text-slate-400 mb-8">
                Welcome to <span className="text-indigo-400 font-bold">{workspaceName}</span>. 
                We're taking you to your dashboard now.
              </p>
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-full bg-[#4B39EF] hover:bg-[#3B28CC] text-white py-4 rounded-2xl font-bold transition-all group flex items-center justify-center"
              >
                Go to Workspace
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
              <p className="text-slate-400 mb-8">{errorMessage}</p>
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all"
                >
                  Back to My Workspaces
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[#4B39EF] hover:text-[#3B28CC] font-bold text-sm py-2"
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex items-center gap-2"
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-slate-500 font-bold tracking-tight">Synapse Lite</span>
      </motion.div>
    </div>
  );
}
