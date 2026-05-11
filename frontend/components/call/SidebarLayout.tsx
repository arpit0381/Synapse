"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { VideoTile } from "./VideoTile";
import { AnimatePresence } from "framer-motion";

export function SidebarLayout() {
  const store = useCallStore();
  const { user } = useAppStore();

  const remoteEntries = Object.entries(store.remoteStreams);
  const screenShareEntries = Object.entries(store.remoteScreenStreams);
  const iAmSpeaking = user ? store.speakingUserIds.has(user.id) : false;

  // Main content: screen share or active speaker
  const hasScreenShare = screenShareEntries.length > 0 || store.isScreenSharing;
  const mainScreenShareId = screenShareEntries[0]?.[0];
  const mainScreenShareStream = screenShareEntries[0]?.[1];

  return (
    <div className="w-full h-full flex gap-3 p-4 overflow-hidden">
      {/* Main area: screen share or local screen share */}
      <div className="flex-1 min-w-0 flex items-center justify-center">
        {store.isScreenSharing && store.screenStream ? (
          <VideoTile
            key="local-screen"
            userId={user?.id || ""}
            stream={store.screenStream}
            name="Your Screen"
            isLocal
            isScreenShare
            isSpeaking={false}
          />
        ) : mainScreenShareStream ? (
          <VideoTile
            key={`screen-${mainScreenShareId}`}
            userId={mainScreenShareId || ""}
            stream={mainScreenShareStream}
            name={`${store.participants[mainScreenShareId || ""]?.name || "User"}'s Screen`}
            isScreenShare
            isSpeaking={false}
          />
        ) : (
          // Fallback: show first remote or self
          <VideoTile
            key="main"
            userId={user?.id || ""}
            stream={store.localStream}
            name={user?.name || "You"}
            isLocal
            isMuted={store.isMuted}
            isCameraOn={store.isCameraOn}
            isSpeaking={iAmSpeaking}
          />
        )}
      </div>

      {/* Right sidebar: all participant camera feeds */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2 overflow-y-auto hide-scrollbar">
        <AnimatePresence>
          {/* Local */}
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
            compact
          />

          {/* Remote */}
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
                compact
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
