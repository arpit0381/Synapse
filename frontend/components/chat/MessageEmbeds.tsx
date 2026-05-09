"use client";

import React from "react";
import { FileText, Table, CheckSquare, ExternalLink, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface EmbedProps {
  id: string;
  title: string;
}

export function DocumentEmbed({ id, title }: EmbedProps) {
  const router = useRouter();
  return (
    <div 
      onClick={() => router.push(`/apps/doc/${id}`)}
      className="mt-3 bg-background/50 border border-border/60 rounded-xl overflow-hidden cursor-pointer hover:border-accent/40 transition-all group shadow-sm hover:shadow-lg"
    >
      <div className="flex items-center gap-3 p-4 bg-surface/40">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{title}</h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
            <Zap className="w-3 h-3 text-accent fill-accent" /> Live Document
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
      </div>
      <div className="px-4 py-3 border-t border-border/30 bg-muted/5 flex items-center justify-between">
         <div className="flex -space-x-1.5">
           {[1, 2].map(i => (
             <div key={i} className="w-5 h-5 rounded-full border border-background bg-muted text-[8px] flex items-center justify-center font-bold">
               {String.fromCharCode(64+i)}
             </div>
           ))}
         </div>
         <span className="text-[9px] font-black uppercase text-accent">Join Editing</span>
      </div>
    </div>
  );
}

export function SheetEmbed({ id, title }: EmbedProps) {
  const router = useRouter();
  return (
    <div 
      onClick={() => router.push(`/apps/sheet/${id}`)}
      className="mt-3 bg-background/50 border border-border/60 rounded-xl overflow-hidden cursor-pointer hover:border-accent/40 transition-all group shadow-sm hover:shadow-lg"
    >
      <div className="flex items-center gap-3 p-4 bg-surface/40">
        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
          <Table className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{title}</h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
            <Zap className="w-3 h-3 text-accent fill-accent" /> Live Spreadsheet
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
      </div>
      <div className="px-4 py-2 bg-muted/10 border-t border-border/20 grid grid-cols-3 gap-1">
        {[1, 2, 3].map(i => <div key={i} className="h-1.5 rounded-full bg-border/40" />)}
      </div>
    </div>
  );
}

export function TaskEmbed({ id, title }: EmbedProps) {
  const router = useRouter();
  return (
    <div 
      onClick={() => router.push(`/apps/task/${id}`)}
      className="mt-3 bg-background/50 border border-border/60 rounded-xl overflow-hidden cursor-pointer hover:border-accent/40 transition-all group shadow-sm hover:shadow-lg"
    >
      <div className="flex items-center gap-3 p-4 bg-surface/40">
        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{title}</h4>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mt-0.5">
             <Users className="w-3 h-3" /> Project Dashboard
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
      </div>
      <div className="px-4 py-3 border-t border-border/30 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full border-2 border-accent" />
        <div className="h-2 w-24 bg-border/40 rounded-full" />
      </div>
    </div>
  );
}
