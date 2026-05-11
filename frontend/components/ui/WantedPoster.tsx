"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WantedPosterProps {
  name: string;
  avatarUrl?: string;
  bounty?: number;
  className?: string;
}

export function WantedPoster({ name, avatarUrl, bounty, className }: WantedPosterProps) {
  // Generate a consistent bounty if not provided
  const displayBounty = bounty || (Math.abs(name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) * 100000);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "w-48 h-64 bg-[#dfc98d] border-[6px] border-[#a0855b] p-2.5 shadow-2xl relative overflow-hidden flex flex-col items-center select-none rounded-sm",
        "before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] before:opacity-40",
        className
      )}
    >
      {/* Texture & Aging effects */}
      <div className="absolute inset-0 bg-black/5 mix-blend-multiply pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-black/10" />

      {/* Header */}
      <div className="text-[#2a1d15] font-serif font-[1000] text-3xl tracking-[0.15em] mb-0.5 italic drop-shadow-sm leading-none">WANTED</div>
      
      {/* Sub-header */}
      <div className="text-[#2a1d15] font-serif font-black text-[7px] uppercase tracking-[0.3em] mb-2 border-b border-[#2a1d15]/30 w-full text-center pb-0.5">
        Dead or Alive
      </div>

      {/* Image Frame */}
      <div className="w-full aspect-[4/3] bg-[#3d2b1f]/10 border-2 border-[#3d2b1f] p-0.5 mb-2 relative overflow-hidden group">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover filter sepia-[0.3] contrast-[1.2]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#3d2b1f]/20 text-[#3d2b1f] font-black text-2xl">
            ?
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Name */}
      <div className="w-full px-0.5 mb-1.5 flex-1 flex items-center justify-center">
        <div className="text-[#1a130e] font-serif font-[950] text-lg uppercase tracking-tight leading-[0.9] text-center drop-shadow-[0_1px_0.5px_rgba(255,255,255,0.2)] break-words line-clamp-2">
          {name}
        </div>
      </div>

      {/* Bounty Value */}
      <div className="mt-auto flex flex-col items-center w-full">
        <div className="text-[#2a1d15] font-serif font-black text-[9px] uppercase tracking-[0.3em] mb-0.5">Bounty</div>
        <div className="text-[#1a130e] font-serif font-[1000] text-lg flex items-center gap-1 bg-black/5 px-3 py-0.5 rounded-sm border border-black/5 shadow-inner">
          <span className="text-xl">฿</span>
          {displayBounty.toLocaleString()}
          <span className="text-sm">-</span>
        </div>
      </div>

      {/* Footer text */}
      <div className="absolute bottom-0.5 right-1.5 text-[#2a1d15]/40 font-serif text-[5px] italic uppercase tracking-tighter">
        Marine HQ
      </div>
    </motion.div>
  );
}
