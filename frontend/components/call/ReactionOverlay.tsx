"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { motion, AnimatePresence } from "framer-motion";

export function ReactionOverlay() {
  const reactions = useCallStore((s) => s.activeReactions);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      <AnimatePresence>
        {reactions.map((r) => {
          const xPos = 10 + Math.random() * 80;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: "100%", x: `${xPos}%`, scale: 0.5 }}
              animate={{ opacity: [1, 1, 0], y: ["100%", "20%", "-10%"], scale: [0.5, 1.3, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              className="absolute bottom-0 flex flex-col items-center"
            >
              <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
              <span className="text-[10px] font-medium text-white/70 mt-1 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {r.userName}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
