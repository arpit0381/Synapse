"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { AppInitializer } from "@/components/providers/AppInitializer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MentionToastListener } from "@/components/layout/MentionToastListener";
import BottomNav from "@/components/layout/BottomNav";
import { Toaster } from "react-hot-toast";
import { VoyageLoader } from "@/components/ui/VoyageLoader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <VoyageLoader />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppInitializer />
      <CommandPalette />
      <MentionToastListener />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--surface))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
          },
        }}
      />
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* TopBar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-[var(--bottom-nav-height)] lg:pb-0">
          {children}
        </main>

        {/* Bottom Nav (Mobile Only) */}
        <BottomNav />
      </div>
    </div>
  );
}
