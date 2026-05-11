"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCallStore } from "@/store/callStore";
import { useAppStore } from "@/store/appStore";
import { getSocket } from "@/lib/socket";
import { Code, Play, Download, Settings, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";

export function CodeEditor() {
  const store = useCallStore();
  const { user } = useAppStore();
  const [code, setCode] = useState("// Welcome to Synapse Interview Mode\n\nfunction solve() {\n  console.log('Hello World');\n}\n\nsolve();");
  const [language, setLanguage] = useState("javascript");
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on("call-code-update", (newCode: string) => {
      setCode(newCode);
    });
    socket.on("call-language-update", (newLang: string) => {
      setLanguage(newLang);
    });
    return () => {
      socket.off("call-code-update");
      socket.off("call-language-update");
    };
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    getSocket().emit("call-code-update", { roomId: store.callRoomId, code: newCode });
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    getSocket().emit("call-language-update", { roomId: store.callRoomId, language: lang });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ x: "100%" }} 
      animate={{ x: 0 }} 
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="w-full flex flex-col h-full bg-[#0d0d12] rounded-2xl border border-white/5 overflow-hidden shadow-2xl"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#16161e] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-2 text-[#949ba4] text-xs font-medium uppercase tracking-wider">
            <Code className="w-3.5 h-3.5" /> Interview Mode
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] text-white/60 font-bold uppercase tracking-widest outline-none focus:border-accent"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
            <option value="typescript">TypeScript</option>
          </select>
          
          <button onClick={copyCode} className="p-2 rounded-lg hover:bg-white/5 text-[#949ba4] transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          <button className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative font-mono text-sm">
        <textarea
          ref={textAreaRef}
          value={code}
          onChange={handleCodeChange}
          spellCheck={false}
          className="absolute inset-0 w-full h-full bg-transparent p-6 text-[#d1d1d1] resize-none outline-none caret-accent"
          style={{
            lineHeight: "1.6",
            tabSize: 4,
          }}
        />
        
        {/* Simple Line Numbers */}
        <div className="absolute top-0 left-0 bottom-0 w-12 bg-black/20 flex flex-col items-center pt-6 text-[10px] text-white/10 select-none pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-[22.4px] flex items-center justify-center">
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#16161e] border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Connected</span>
          <div className="flex -space-x-2">
             <div className="w-5 h-5 rounded-full bg-accent border-2 border-[#16161e] text-[8px] flex items-center justify-center text-white font-bold">JD</div>
             <div className="w-5 h-5 rounded-full bg-purple-500 border-2 border-[#16161e] text-[8px] flex items-center justify-center text-white font-bold">AS</div>
          </div>
        </div>
        <div className="text-[10px] text-white/20 font-mono">
          UTF-8 | {language.toUpperCase()}
        </div>
      </div>
    </motion.div>
  );
}
