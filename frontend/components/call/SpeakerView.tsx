"use client";

import React from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { VideoTile } from "./VideoTile";
import { AnimatePresence } from "framer-motion";

export function SpeakerView() {
  const store = useCallStore();
  const { user } = useAppStore();

  const remoteEntries = Object.entries(store.remoteStreams);
  const iAmSpeaking = user ? store.speakingUserIds.has(user.id) : false;

  // Determine active speaker: pinned > most recently speaking > first remote > self
  const activeSpeakerId =
    store.pinnedUserId ||
    (store.speakingUserIds.size > 0
      ? Array.from(store.speakingUserIds).find((id) => id !== user?.id) || user?.id
      : remoteEntries[0]?.[0]) ||
    user?.id;

  const isActiveSpeakerLocal = activeSpeakerId === user?.id;
  const activeSpeakerStream = isActiveSpeakerLocal
    ? store.localStream
    : store.remoteStreams[activeSpeakerId || ""];
  const activeSpeakerParticipant = activeSpeakerId
    ? store.participants[activeSpeakerId]
    : null;

  // Build sidebar list (everyone except active speaker)
  const sidebarParticipants: { id: string; stream: MediaStream | null; isLocal: boolean }[] = [];

  if (!isActiveSpeakerLocal) {
    sidebarParticipants.push({
      id: user?.id || "",
      stream: store.localStream,
      isLocal: true,
    });
  }

  remoteEntries.forEach(([uid, stream]) => {
    if (uid !== activeSpeakerId) {
      sidebarParticipants.push({ id: uid, stream, isLocal: false });
    }
  });

  if (isActiveSpeakerLocal) {
    // Also we don't re-add self
  }

  return (
    <div className="w-full h-full flex gap-3 p-4 overflow-hidden">
      {/* Main speaker area */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <VideoTile
            key={activeSpeakerId || "speaker"}
            userId={activeSpeakerId || ""}
            stream={activeSpeakerStream}
            name={
              isActiveSpeakerLocal
                ? user?.name || "You"
                : activeSpeakerParticipant?.name || "User"
            }
            isLocal={isActiveSpeakerLocal}
            isMuted={
              isActiveSpeakerLocal
                ? store.isMuted
                : activeSpeakerParticipant?.isMuted || false
            }
            isCameraOn={
              isActiveSpeakerLocal
                ? store.isCameraOn
                : activeSpeakerParticipant?.isCameraOn ?? true
            }
            isSpeaking={
              isActiveSpeakerLocal
                ? iAmSpeaking
                : activeSpeakerParticipant?.isSpeaking || false
            }
            isHandRaised={
              isActiveSpeakerLocal
                ? store.isHandRaised
                : activeSpeakerParticipant?.isHandRaised || false
            }
            isPinned={store.pinnedUserId === activeSpeakerId}
            networkQuality={
              isActiveSpeakerLocal
                ? store.localNetworkQuality
                : activeSpeakerParticipant?.networkQuality || "excellent"
            }
          />
        </AnimatePresence>
      </div>

      {/* Sidebar strip */}
      {sidebarParticipants.length > 0 && (
        <div className="w-48 flex-shrink-0 flex flex-col gap-2 overflow-y-auto hide-scrollbar">
          <AnimatePresence>
            {sidebarParticipants.map(({ id, stream, isLocal }) => {
              const p = isLocal ? null : store.participants[id];
              return (
                <VideoTile
                  key={id}
                  userId={id}
                  stream={stream}
                  name={isLocal ? user?.name || "You" : p?.name || "User"}
                  isLocal={isLocal}
                  isMuted={isLocal ? store.isMuted : p?.isMuted || false}
                  isCameraOn={isLocal ? store.isCameraOn : p?.isCameraOn ?? true}
                  isSpeaking={
                    isLocal ? iAmSpeaking : p?.isSpeaking || false
                  }
                  isHandRaised={
                    isLocal ? store.isHandRaised : p?.isHandRaised || false
                  }
                  isPinned={store.pinnedUserId === id}
                  compact
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
