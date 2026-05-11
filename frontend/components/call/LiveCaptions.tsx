"use client";

import React, { useEffect, useState } from "react";
import { useCallStore } from "@/store/callStore";
import { motion, AnimatePresence } from "framer-motion";

export function LiveCaptions() {
  const [transcript, setTranscript] = useState("");
  const [active, setActive] = useState(false);
  const store = useCallStore();

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          setTranscript(text);
          store.addTranscript(text);
          // Clear final after 5s
          setTimeout(() => setTranscript(""), 5000);
        } else {
          interim += event.results[i][0].transcript;
          setTranscript(interim);
        }
      }
    };

    if (store.isCalling && !store.isMuted) {
      try {
        recognition.start();
        setActive(true);
      } catch (e) {
        console.error("Speech recognition error", e);
      }
    } else {
      recognition.stop();
      setActive(false);
    }

    return () => {
      recognition.stop();
    };
  }, [store.isCalling, store.isMuted]);

  if (!transcript) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-none z-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-center shadow-2xl border border-white/10"
        >
          <p className="text-lg font-medium leading-relaxed">
            {transcript}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
