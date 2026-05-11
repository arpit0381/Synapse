"use client";

import React, { useState } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { Layers, UserPlus, X, Play, StopCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BreakoutPanel() {
  const store = useCallStore();
  const { user } = useAppStore();
  const [roomCount, setRoomCount] = useState(2);
  const [isActive, setIsActive] = useState(Object.keys(store.breakoutRooms).length > 0);

  const startBreakout = () => {
    const participants = Object.values(store.participants).map(p => p.id);
    if (user) participants.push(user.id);

    const rooms: Record<string, string[]> = {};
    for (let i = 1; i <= roomCount; i++) {
      rooms[`room_${i}`] = [];
    }

    // Basic auto-distribution
    participants.forEach((pid, idx) => {
      const roomNum = (idx % roomCount) + 1;
      rooms[`room_${roomNum}`].push(pid);
    });

    getSocket().emit("call-assign-breakout", { 
      roomId: store.callRoomId, 
      rooms 
    });
    setIsActive(true);
  };

  const endBreakout = () => {
    getSocket().emit("call-assign-breakout", { 
      roomId: store.callRoomId, 
      rooms: {} 
    });
    setIsActive(false);
  };

  const joinSubRoom = (subId: string) => {
    store.setSubRoom(subId);
    // In a real SFU, we'd switch transports here.
    // In P2P, we signal a room change to peers.
  };

  return (
    <motion.div 
      initial={{ x: "100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col h-full bg-[#1e1f22] call-panel-width"
    >
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" /> Breakout Rooms
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!isActive ? (
          <div className="space-y-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Number of Rooms</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={roomCount}
                  onChange={e => setRoomCount(parseInt(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="text-xl font-bold text-white">{roomCount}</span>
              </div>
              <p className="text-[10px] text-white/30">Participants will be distributed automatically across {roomCount} rooms.</p>
            </div>

            <button
              onClick={startBreakout}
              className="w-full py-4 rounded-2xl bg-accent text-sm font-bold text-white shadow-lg shadow-accent/20 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4" /> Start Breakout Sessions
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Sessions in Progress
              </span>
              <button onClick={endBreakout} className="text-red-400 text-xs font-bold hover:underline flex items-center gap-1">
                <StopCircle className="w-3.5 h-3.5" /> End All
              </button>
            </div>

            {Object.entries(store.breakoutRooms).map(([id, members]) => (
              <div key={id} className="p-4 bg-[#111214] rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-sm">Room {id.split("_")[1]}</span>
                  <span className="text-[10px] text-white/40">{members.length} members</span>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {members.map(mid => {
                    const p = store.participants[mid] || (mid === user?.id ? user : null);
                    return p ? (
                      <div key={mid} className="px-2 py-1 rounded-lg bg-white/5 text-[10px] text-white/60">
                        {p.name}
                      </div>
                    ) : null;
                  })}
                </div>

                {members.includes(user?.id || "") && (
                  <button
                    onClick={() => joinSubRoom(id)}
                    className="w-full mt-2 py-2 rounded-xl bg-white/5 hover:bg-accent hover:text-white text-accent text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    Join Session <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 text-center">
        <p className="text-[10px] text-white/20 italic">Hosts can broadcast messages to all rooms.</p>
      </div>
    </motion.div>
  );
}
