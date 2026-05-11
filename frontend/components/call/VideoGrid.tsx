"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { VideoTile } from "./VideoTile";
import { AnimatePresence } from "framer-motion";

export function VideoGrid() {
  const store = useCallStore();
  const { user } = useAppStore();

  const remoteEntries = Object.entries(store.remoteStreams);
  const screenShareEntries = Object.entries(store.remoteScreenStreams);
  const totalTiles = 1 + remoteEntries.length;

  // Dynamic grid calculation
  const getGridClass = () => {
    if (totalTiles === 1) return "grid-cols-1 max-w-2xl mx-auto";
    if (totalTiles === 2) return "grid-cols-2 max-w-4xl mx-auto";
    if (totalTiles <= 4) return "grid-cols-2";
    if (totalTiles <= 6) return "grid-cols-3";
    if (totalTiles <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  const iAmSpeaking = user ? store.speakingUserIds.has(user.id) : false;

  return (
    <div className="w-full h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* Screen shares at top */}
      {screenShareEntries.length > 0 && (
        <div className="flex-shrink-0">
          <AnimatePresence>
            {screenShareEntries.map(([uid, stream]) => {
              const p = store.participants[uid];
              return (
                <VideoTile
                  key={`screen-${uid}`}
                  userId={uid}
                  stream={stream}
                  name={`${p?.name || "User"}'s Screen`}
                  isScreenShare
                  isSpeaking={false}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Participant grid */}
      <div
        className={`w-full flex-1 grid gap-3 content-center items-center auto-rows-fr ${getGridClass()} call-grid-mobile`}
        style={{ maxHeight: "100%" }}
      >
        <AnimatePresence mode="popLayout">
          {/* Local tile */}
          <VideoTile
            key="local"
            userId={user?.id || ""}
            stream={store.localStream}
            name={user?.name || "You"}
            isLocal
            isMuted={store.isMuted}
            isCameraOn={store.isCameraOn}
            isSpeaking={iAmSpeaking}
            isHandRaised={store.isHandRaised}
            isPinned={store.pinnedUserId === user?.id}
            networkQuality={store.localNetworkQuality}
          />

          {/* Remote tiles */}
          {remoteEntries.map(([uid, stream]) => {
            const p = store.participants[uid];
            return (
              <VideoTile
                key={uid}
                userId={uid}
                stream={stream}
                name={p?.name || "User"}
                isMuted={p?.isMuted || false}
                isCameraOn={p?.isCameraOn ?? true}
                isSpeaking={p?.isSpeaking || false}
                isHandRaised={p?.isHandRaised || false}
                isPinned={store.pinnedUserId === uid}
                networkQuality={p?.networkQuality || "excellent"}
                role={p?.role}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
