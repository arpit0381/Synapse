"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Lock, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/appStore";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateChannelModal({ isOpen, onClose }: CreateChannelModalProps) {
  const { currentWorkspace, user } = useAppStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => api.channels.create(data),
    onSuccess: (data) => {
      // Invalidate channels
      queryClient.invalidateQueries({ queryKey: ["channels", currentWorkspace?.id] });
      // Reset state and close
      setName("");
      setDescription("");
      setIsPrivate(false);
      onClose();
    },
    onError: (err: any) => {
      alert("Failed to create channel: " + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace || !user) return;
    
    mutation.mutate({
      workspace_id: currentWorkspace.id,
      name: name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
      description: description.trim(),
      is_private: isPrivate,
      created_by: user.id
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-lg font-semibold">Create a channel</h2>
            <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Name</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. general, marketing"
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-background">
              <input
                type="checkbox"
                id="privateToggle"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <div className="flex flex-col">
                <label htmlFor="privateToggle" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  Make private <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only selected members will be able to view and join this channel.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-border mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                disabled={mutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || mutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white accent-gradient hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Channel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
