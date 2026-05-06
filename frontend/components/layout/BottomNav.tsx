"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Activity, Inbox, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: Search, label: "Search", href: "/search" },
  { icon: Activity, label: "Pulse", href: "/pulse" }, // Assuming pulse has a page now or I'll handle the modal
  { icon: Inbox, label: "Inbox", href: "/inbox" },
  { icon: User, label: "Profile", href: "/settings/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[var(--bottom-nav-height)] bg-surface/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-2 z-[100] lg:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full touch-target group">
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
          </Link>
        );
      })}
    </div>
  );
}
