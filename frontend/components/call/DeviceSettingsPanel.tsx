"use client";

import React, { useEffect, useState } from "react";
import { useCallStore } from "@/store/callStore";
import { X, Mic, Speaker, Camera, Sparkles, Radio, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export function DeviceSettingsPanel() {
  const store = useCallStore();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((d) => {
      setDevices(d);
      store.setAvailableDevices(d);
    });
  }, []); // eslint-disable-line

  // Audio level meter
  useEffect(() => {
    const stream = store.localStream;
    if (!stream) return;
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf: number;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const vol = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(vol / 50, 1));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(raf); ctx.close(); };
    } catch { return; }
  }, [store.localStream]);

  const audioInputs = devices.filter((d) => d.kind === "audioinput");
  const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
  const videoInputs = devices.filter((d) => d.kind === "videoinput");

  const selectStyle = "w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border border-white/5 outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer";

  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-80 flex flex-col h-full flex-shrink-0 call-panel-width"
      style={{ background: "rgba(17,18,20,0.95)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">Settings</h3>
        <button onClick={() => store.setActivePanel(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#949ba4] hover:text-white transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 hide-scrollbar">
        {/* Microphone */}
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4] mb-2"><Mic className="w-3.5 h-3.5" />Microphone</label>
          <select value={store.selectedAudioInput || ""} onChange={(e) => store.setSelectedAudioInput(e.target.value)} className={selectStyle}>
            {audioInputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 8)}`}</option>)}
          </select>
          {/* Level meter */}
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-75" style={{ width: `${audioLevel * 100}%`, background: audioLevel > 0.7 ? "#f23f42" : audioLevel > 0.3 ? "#f0b232" : "#23a55a" }} />
          </div>
        </div>

        {/* Speaker */}
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4] mb-2"><Speaker className="w-3.5 h-3.5" />Speaker</label>
          <select value={store.selectedAudioOutput || ""} onChange={(e) => store.setSelectedAudioOutput(e.target.value)} className={selectStyle}>
            {audioOutputs.length > 0 ? audioOutputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 8)}`}</option>) : <option value="">Default</option>}
          </select>
        </div>

        {/* Camera */}
        <div>
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4] mb-2"><Camera className="w-3.5 h-3.5" />Camera</label>
          <select value={store.selectedVideoInput || ""} onChange={(e) => store.setSelectedVideoInput(e.target.value)} className={selectStyle}>
            {videoInputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>)}
          </select>
        </div>

        <hr className="border-white/5" />

        {/* Toggles */}
        <ToggleRow icon={Sparkles} label="Noise Suppression" checked={!!store.noiseSuppressionEnabled} onChange={(v) => store.setNoiseSuppression(v)} />
        <ToggleRow icon={Radio} label="Push to Talk (Space)" checked={!!store.pushToTalkEnabled} onChange={(v) => store.setPushToTalk(v)} />

        {/* Backgrounds */}
        <div className="pt-4 border-t border-white/5">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#949ba4] mb-3"><ImageIcon className="w-3.5 h-3.5" />Virtual Backgrounds</label>
          <div className="grid grid-cols-2 gap-2">
            <BgOption label="None" onClick={() => { store.setBackgroundImage(null); store.setBackgroundBlur(false); }} active={!store.backgroundImage && !store.backgroundBlurEnabled} />
            <BgOption label="Blur" onClick={() => { store.setBackgroundImage(null); store.setBackgroundBlur(true); }} active={!!store.backgroundBlurEnabled} />
            <BgOption label="Office" onClick={() => store.setBackgroundImage("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400")} active={!!store.backgroundImage?.includes("photo-1497366216548")} />
            <BgOption label="Abstract" onClick={() => store.setBackgroundImage("https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=400")} active={!!store.backgroundImage?.includes("photo-1557683316")} />
            <BgOption label="Nature" onClick={() => store.setBackgroundImage("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400")} active={!!store.backgroundImage?.includes("photo-1441974231531")} />
            <BgOption label="Studio" onClick={() => store.setBackgroundImage("https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=400")} active={!!store.backgroundImage?.includes("photo-1598488035139")} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BgOption({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
        active 
          ? "bg-accent border-accent text-white shadow-lg shadow-accent/20" 
          : "bg-white/5 border-white/5 text-[#949ba4] hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange }: { icon: typeof Mic; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#949ba4]" />
        <span className="text-xs text-[#dbdee1]">{label}</span>
      </div>
      <button onClick={() => onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors relative ${checked ? "bg-green-500" : "bg-white/10"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
