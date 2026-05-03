"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FolderOpen, BarChart3, Bookmark, Focus, Settings, Search } from "lucide-react";
import { useAppStore } from "@/store/appStore";

const MORE_LINKS = [
  { icon: FolderOpen, label: "Files", description: "Manage and view all workspace files.", href: "/files", color: "bg-blue-500/10 text-blue-500" },
  { icon: BarChart3, label: "Analytics", description: "View workspace statistics and activity.", href: "/analytics", color: "bg-purple-500/10 text-purple-500" },
  { icon: Bookmark, label: "Bookmarks", description: "Access your saved messages.", href: "/bookmarks", color: "bg-yellow-500/10 text-yellow-500" },
  { icon: Focus, label: "Focus Mode", description: "Mute notifications and minimize UI.", href: "/focus-mode", color: "bg-green-500/10 text-green-500" },
  { icon: Search, label: "Search", description: "Global search across the workspace.", href: "/search", color: "bg-pink-500/10 text-pink-500" },
  { icon: Settings, label: "Settings", description: "Configure your profile and preferences.", href: "/settings/profile", color: "bg-slate-500/10 text-slate-500" },
];

export default function MorePage() {
  const { setCommandPaletteOpen } = useAppStore();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 h-full overflow-y-auto chat-scroll hide-scrollbar">
      <div>
        <h1 className="font-display font-bold text-2xl tracking-tight">More Features</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore additional tools and settings in your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MORE_LINKS.map((item, i) => (
          <Link key={item.href} href={item.href}>
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="bg-surface border border-border/60 rounded-2xl p-5 hover:border-accent/40 transition-all duration-300 group shadow-sm hover:shadow-md hover:bg-muted/30 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] mb-1 group-hover:text-accent transition-colors">{item.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: MORE_LINKS.length * 0.05 }} 
          onClick={() => setCommandPaletteOpen(true)}
          className="bg-surface border border-dashed border-border/80 rounded-2xl p-5 hover:border-accent transition-all duration-300 group shadow-sm hover:bg-accent/5 cursor-pointer flex flex-col items-center justify-center text-center col-span-1 md:col-span-2 mt-4"
        >
          <Search className="w-8 h-8 text-muted-foreground group-hover:text-accent mb-3 transition-colors" />
          <h3 className="font-semibold text-[15px] mb-1">Looking for something else?</h3>
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded-md bg-muted border font-mono text-xs mx-1">⌘K</kbd> to open the Command Palette.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
