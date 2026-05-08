"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Menu, Search, Palette, Settings2, Zap, Moon, Sun, Wind, Flame, Snowflake } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn, getInitials, stringToColor } from "@/lib/utils";
import Link from "next/link";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  obsidian: <Moon className="w-4 h-4" />,
  aurora: <Wind className="w-4 h-4" />,
  ember: <Flame className="w-4 h-4" />,
  arctic: <Sun className="w-4 h-4" />,
};

const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Tasks",
  "/files": "Files",
  "/ai-assistant": "AI Assistant",
  "/search": "Search",
  "/analytics": "Analytics",
  "/focus-mode": "Focus Mode",
  "/settings/profile": "Profile Settings",
  "/settings/workspace": "Workspace Settings",
  "/settings/notifications": "Notifications",
  "/settings/appearance": "Appearance",
};

export default function TopBar() {
  const pathname = usePathname();
  const { user, sidebarOpen, setSidebarOpen, setCommandPaletteOpen } = useAppStore();
  const { theme, setTheme, themes } = useTheme();

  const displayUser = user || { name: "User", avatar_url: "" };

  let pageTitle = "Synapse Lite";
  for (const [key, label] of Object.entries(PATH_LABELS)) {
    if (pathname === key || pathname.startsWith(key + "/")) { pageTitle = label; break; }
  }
  if (pathname.startsWith("/channels/")) pageTitle = "# Channel";
  if (pathname.startsWith("/dm/")) pageTitle = "Direct Message";

  function cycleTheme() {
    const ids = themes.map((t) => t.id);
    const current = ids.indexOf(theme);
    const next = ids[(current + 1) % ids.length];
    setTheme(next);
  }

  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-surface/80 backdrop-blur-xl flex-shrink-0 z-40 sticky top-0">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          aria-label="Toggle sidebar" 
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 lg:hidden flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-display font-black text-sm md:text-base text-foreground tracking-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Quick search → opens Command Palette */}
        <button 
          onClick={() => setCommandPaletteOpen(true)} 
          aria-label="Search (Cmd+K)" 
          className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-muted/50 border border-transparent hover:border-border/60 text-muted-foreground hover:text-foreground transition-all duration-200 text-xs font-medium group"
        >
          <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="hidden md:inline">Quick Search</span>
          <kbd className="hidden lg:inline text-[10px] bg-surface rounded-md px-1.5 py-0.5 border border-border/40 opacity-60">⌘K</kbd>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme cycle */}
          <div className="relative group">
            <button 
              onClick={cycleTheme} 
              aria-label="Switch theme" 
              className="p-2 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all duration-200"
            >
              {THEME_ICONS[theme]}
            </button>
            <div className="absolute right-0 top-[calc(100%+8px)] hidden group-hover:block z-50 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl py-2 min-w-[160px] animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Select Theme</div>
              {themes.map((t) => (
                <button 
                  key={t.id} 
                  onClick={(e) => { e.stopPropagation(); setTheme(t.id); }} 
                  className={cn("w-full flex items-center gap-3 px-3 py-2 text-xs text-left hover:bg-muted/50 transition-colors", theme === t.id && "text-accent bg-accent/5 font-bold")}
                >
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-surface shadow-sm" style={{ backgroundColor: t.preview.accent }} />
                  {t.name}
                  {theme === t.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Settings Toggle */}
          <Link href="/settings/profile">
            <button aria-label="Settings" className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 hidden sm:flex">
              <Settings2 className="w-4.5 h-4.5" />
            </button>
          </Link>
        </div>

        {/* User avatar */}
        <div className="h-8 w-px bg-border/40 mx-1 hidden sm:block" />
        <Link href="/settings/profile">
          <button aria-label="Profile" className="flex items-center gap-2 p-1 pl-1 pr-1 sm:pr-2.5 rounded-2xl hover:bg-muted transition-all duration-200 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-lg shadow-accent/10 transition-transform group-hover:scale-105" style={{ backgroundColor: stringToColor(displayUser.name) }}>
              {displayUser.avatar_url ? <img src={displayUser.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" /> : getInitials(displayUser.name)}
            </div>
            <div className="hidden lg:flex flex-col items-start leading-none pr-1">
              <span className="text-[11px] font-bold text-foreground truncate max-w-[80px]">{displayUser.name.split(" ")[0]}</span>
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Profile</span>
            </div>
          </button>
        </Link>
      </div>
    </header>
  );
}
////////////////