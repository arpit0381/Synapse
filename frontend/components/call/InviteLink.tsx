"use client";

import React, { useState } from "react";
import { useCallStore } from "@/store/callStore";
import { Link, Copy, Check } from "lucide-react";

export function InviteLink() {
  const store = useCallStore();
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/join/${store.callRoomId}`
    : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest">
        <Link className="w-3.5 h-3.5" /> Invite Guests
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate bg-black/20 px-3 py-2 rounded-xl text-xs text-white/60 font-mono">
          {inviteUrl}
        </div>
        <button
          onClick={copyToClipboard}
          className={`p-2 rounded-xl transition-all ${
            copied ? "bg-green-500 text-white" : "bg-accent text-white hover:brightness-110"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-white/20 italic">Sharing this link allows anyone with the URL to join the call.</p>
    </div>
  );
}
