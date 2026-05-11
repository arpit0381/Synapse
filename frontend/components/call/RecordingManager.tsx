"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/store/callStore";

/**
 * Hook that manages local browser recording using MediaRecorder.
 * Records the local video + mixed remote audio into a WebM file.
 */
export function useRecordingManager() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const store = useCallStore();

  const startRecording = useCallback(() => {
    try {
      const localStream = useCallStore.getState().localStream;
      if (!localStream) return;

      // Create a mixed stream: local video + all audio
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      // Add local audio
      const localAudioTracks = localStream.getAudioTracks();
      if (localAudioTracks.length > 0) {
        const localSrc = audioCtx.createMediaStreamSource(new MediaStream(localAudioTracks));
        localSrc.connect(dest);
      }

      // Add remote audio
      const remoteStreams = useCallStore.getState().remoteStreams;
      Object.values(remoteStreams).forEach((rs) => {
        const audioTracks = rs.getAudioTracks();
        if (audioTracks.length > 0) {
          const src = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
          src.connect(dest);
        }
      });

      // Combine local video + mixed audio
      const mixed = new MediaStream([
        ...localStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(mixed, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `synapse-recording-${new Date().toISOString().slice(0, 19)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        chunksRef.current = [];
        audioCtx.close();
      };

      recorder.start(1000); // collect data every 1s
      recorderRef.current = recorder;
      useCallStore.getState().setRecording(true);
    } catch (e) {
      console.error("[Recording] Failed to start:", e);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    useCallStore.getState().setRecording(false);
  }, []);

  const togglePause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      useCallStore.getState().setRecordingPaused(true);
    } else if (rec.state === "paused") {
      rec.resume();
      useCallStore.getState().setRecordingPaused(false);
    }
  }, []);

  // Watch store.isRecording to start/stop
  useEffect(() => {
    if (store.isRecording && !recorderRef.current) {
      startRecording();
    } else if (!store.isRecording && recorderRef.current) {
      stopRecording();
    }
  }, [store.isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  return { startRecording, stopRecording, togglePause };
}
