"use client";

import React from "react";
import { motion } from "framer-motion";

export function VoyageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0b0e14] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Waves (Ambient) */}
      <div className="absolute bottom-0 left-0 w-full h-64 opacity-20 pointer-events-none">
         <svg viewBox="0 0 1440 320" className="w-full h-full preserve-3d">
            <path fill="#4B39EF" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
               <animate attributeName="d" dur="10s" repeatCount="indefinite" values="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z; M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,181.3C672,192,768,160,864,138.7C960,117,1056,107,1152,122.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z; M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            </path>
         </svg>
      </div>

      {/* Center Piece: Straw Hat + Log Pose Pulse */}
      <div className="relative flex flex-col items-center">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full scale-150 animate-pulse" />

        <motion.div
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="relative z-10"
        >
           {/* Straw Hat SVG */}
           <svg width="120" height="80" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              <path d="M10 50C10 40 30 35 50 35C70 35 90 40 90 50C90 55 70 60 50 60C30 60 10 55 10 50Z" fill="#E8D4A2" stroke="#B89A67" strokeWidth="2"/>
              <path d="M30 40C30 20 40 10 50 10C60 10 70 20 70 40" fill="#E8D4A2" stroke="#B89A67" strokeWidth="2"/>
              <rect x="30" y="32" width="40" height="5" fill="#D22D2D" />
           </svg>
        </motion.div>

        {/* Text */}
        <div className="mt-12 flex flex-col items-center gap-3 relative z-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[12px] font-black uppercase tracking-[0.5em] text-accent animate-pulse"
          >
            Setting Sail
          </motion.div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Synapse Grand Line is initializing...
          </div>
        </div>
        
        {/* Loading Bar (Pirate style) */}
        <div className="mt-8 w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
           <motion.div 
             initial={{ width: "0%" }}
             animate={{ width: "100%" }}
             transition={{ duration: 3, repeat: Infinity }}
             className="h-full bg-gradient-to-r from-accent/50 via-accent to-accent/50"
           />
        </div>
      </div>
      
      {/* Small Jolly Roger decoration */}
      <div className="absolute bottom-10 opacity-10 grayscale invert pointer-events-none">
         <img src="https://cdn-icons-png.flaticon.com/512/3233/3233512.png" className="w-12 h-12" alt="Pirate" />
      </div>
    </div>
  );
}
