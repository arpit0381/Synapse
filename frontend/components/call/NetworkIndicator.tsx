"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/store/callStore";

/**
 * Hook that monitors RTCPeerConnection stats to determine network quality.
 * Polls getStats() every 3 seconds and updates the store.
 */
export function useNetworkMonitor(peersRef: React.MutableRefObject<Record<string, RTCPeerConnection>>) {
  const prevBytesRef = useRef<Record<string, number>>({});
  const prevTimestampRef = useRef<Record<string, number>>({});

  const checkStats = useCallback(async () => {
    const peers = peersRef.current;
    for (const [peerId, pc] of Object.entries(peers)) {
      if (pc.connectionState === "closed") continue;
      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;
        let timestamp = 0;

        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            rtt = report.currentRoundTripTime || 0;
          }
          if (report.type === "inbound-rtp" && report.kind === "audio") {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            bytesReceived = report.bytesReceived || 0;
            timestamp = report.timestamp || 0;
          }
        });

        // Calculate quality
        const lossRate = packetsReceived > 0 ? packetsLost / (packetsReceived + packetsLost) : 0;
        let quality: "excellent" | "good" | "poor" | "disconnected" = "excellent";

        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          quality = "disconnected";
        } else if (rtt > 0.3 || lossRate > 0.05) {
          quality = "poor";
        } else if (rtt > 0.15 || lossRate > 0.02) {
          quality = "good";
        }

        useCallStore.getState().setNetworkQuality(peerId, quality);

        // Calculate local quality based on worst peer
        const allQualities = Object.values(useCallStore.getState().networkQuality);
        if (allQualities.includes("disconnected")) {
          useCallStore.getState().setLocalNetworkQuality("poor");
        } else if (allQualities.includes("poor")) {
          useCallStore.getState().setLocalNetworkQuality("good");
        } else {
          useCallStore.getState().setLocalNetworkQuality("excellent");
        }

        prevBytesRef.current[peerId] = bytesReceived;
        prevTimestampRef.current[peerId] = timestamp;
      } catch {
        // Stats not available
      }
    }
  }, [peersRef]);

  useEffect(() => {
    const interval = setInterval(checkStats, 3000);
    return () => clearInterval(interval);
  }, [checkStats]);
}
