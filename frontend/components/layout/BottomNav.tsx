"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, MessageSquare, Inbox, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: MessageSquare, label: "Chats", href: "toggle-sidebar" }, // Special case for sidebar
  { icon: Inbox, label: "Inbox", href: "/inbox" },
  { icon: User, label: "Profile", href: "/settings/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { setSidebarOpen } = useAppStore();
  const { isCalling, isMinimized } = useCallStore();

  if (isCalling && !isMinimized) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[var(--bottom-nav-height)] bg-surface/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 z-[100] lg:hidden">
      {NAV_ITEMS.map((item) => {
        const isSidebarToggle = item.href === "toggle-sidebar";
        const isActive = !isSidebarToggle && (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)));

        const content = (
          <>
            <div className={cn(
              "p-1.5 rounded-xl transition-all duration-300",
              isActive ? "text-accent bg-accent/10" : "text-muted-foreground group-active:scale-90"
            )}>
              <item.icon className="w-6 h-6" />
            </div>
            <span className={cn(
              "text-[10px] font-bold tracking-tight uppercase",
              isActive ? "text-accent" : "text-muted-foreground/60"
            )}>
              {item.label}
            </span>
            
            {isActive && (
              <motion.div 
                layoutId="bottom-nav-active"
                className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_hsl(var(--accent)/0.5)]"
              />
            )}
          </>
        );

        if (isSidebarToggle) {
          return (
            <button 
              key={item.href} 
              onClick={() => setSidebarOpen(true)}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full touch-target group border-none bg-transparent"
            >
              {content}
            </button>
          );
        }

        return (
          <Link 
            key={item.href} 
            href={item.href} 
            onClick={() => setSidebarOpen(false)}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full touch-target group"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
