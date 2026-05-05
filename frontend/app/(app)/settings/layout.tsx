"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Bell, Palette, Shield, CreditCard, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SETTINGS_NAV = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/workspace", label: "Workspace", icon: Building2 },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/appearance", label: "Appearance", icon: Palette },
  { href: "/settings/security", label: "Security", icon: Shield },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-background">
      {/* Sidebar nav */}
      <div className="w-full md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-border/60 bg-surface/30 md:py-6 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto hide-scrollbar z-10">
        <p className="hidden md:block px-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 opacity-50">System Settings</p>
        
        <div className="flex flex-row md:flex-col px-2 md:px-3 py-2 md:py-0 gap-1 min-w-max md:min-w-0">
          {SETTINGS_NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="flex-shrink-0">
                <div className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer group",
                  isActive 
                    ? "text-accent bg-accent/10 shadow-sm shadow-accent/5" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}>
                  <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && <motion.div layoutId="settings-nav-active" className="hidden md:block absolute left-0 w-1 h-5 bg-accent rounded-r-full" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto chat-scroll bg-background/50 relative">
        <div className="max-w-4xl mx-auto min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
