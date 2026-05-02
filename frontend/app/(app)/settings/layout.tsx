"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Bell, Palette, Shield, CreditCard, HelpCircle } from "lucide-react";
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
    <div className="flex h-full overflow-hidden">
      {/* Sidebar nav */}
      <div className="w-52 flex-shrink-0 border-r border-border bg-surface/50 py-4 overflow-y-auto">
        <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Settings</p>
        {SETTINGS_NAV.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn("flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                isActive ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
