"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function StrawHatSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-4xl mx-auto">
      <StrawHatLoader label="Sailing to Island..." />

      {/* Message Skeletons with Wave Shimmer */}
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex gap-4 items-start animate-in fade-in duration-500", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className={cn("flex flex-col gap-2 flex-1", i % 2 === 0 ? "items-end" : "items-start")}>
            <Skeleton className="w-24 h-3 rounded-full" />
            <Skeleton className={cn("h-16 w-full max-w-md rounded-2xl", i % 2 === 0 ? "rounded-tr-none" : "rounded-tl-none")} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StrawHatLoader({ label = "Loading...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-6 opacity-60", className)}>
      <motion.div
        animate={{ 
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative"
      >
        <svg width="40" height="28" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 50C10 40 30 35 50 35C70 35 90 40 90 50C90 55 70 60 50 60C30 60 10 55 10 50Z" fill="#E8D4A2" stroke="#B89A67" strokeWidth="2"/>
          <path d="M30 40C30 20 40 10 50 10C60 10 70 20 70 40" fill="#E8D4A2" stroke="#B89A67" strokeWidth="2"/>
          <rect x="30" y="32" width="40" height="4" fill="#D22D2D" />
        </svg>
      </motion.div>
      <span className="text-[9px] font-black uppercase tracking-[0.3em] mt-3 text-muted-foreground animate-pulse">
        {label}
      </span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-muted/30 relative overflow-hidden", className)}>
      <WaveShimmer />
    </div>
  );
}

function WaveShimmer() {
  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{ 
        repeat: Infinity, 
        duration: 2, 
        ease: "linear" 
      }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent skew-x-12"
    />
  );
}
