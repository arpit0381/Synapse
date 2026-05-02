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
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface/80 backdrop-blur-md flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Menu className="w-4 h-4" /></button>
        <div className="flex items-center gap-2"><h1 className="font-display font-semibold text-sm text-foreground">{pageTitle}</h1></div>
      </div>

      <div className="flex items-center gap-1">
        {/* Quick search → opens Command Palette */}
        <button onClick={() => setCommandPaletteOpen(true)} aria-label="Search (Cmd+K)" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-xs">
          <Search className="w-3.5 h-3.5" /><span className="hidden sm:inline">Search</span><kbd className="hidden sm:inline text-xs bg-surface rounded px-1 py-0.5">⌘K</kbd>
        </button>

        {/* Theme cycle */}
        <div className="relative group">
          <button onClick={cycleTheme} aria-label="Switch theme" title={`Current: ${themes.find((t) => t.id === theme)?.name}`} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">{THEME_ICONS[theme]}</button>
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[130px]">
            {themes.map((t) => (
              <button key={t.id} onClick={(e) => { e.stopPropagation(); setTheme(t.id); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors", theme === t.id && "text-accent font-medium")}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.preview.accent }} />{t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* Settings */}
        <Link href="/settings/profile"><button aria-label="Settings" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Settings2 className="w-4 h-4" /></button></Link>

        {/* User avatar */}
        <Link href="/settings/profile">
          <button aria-label="Profile" className="ml-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-accent/40 hover:ring-accent transition-all" style={{ backgroundColor: stringToColor(displayUser.name) }}>
              {displayUser.avatar_url ? <img src={displayUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(displayUser.name)}
            </div>
          </button>
        </Link>
      </div>
    </header>
  );
}
