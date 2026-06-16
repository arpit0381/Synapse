import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: { default: "Synapse Lite", template: "%s | Synapse Lite" },
  description: "A Slack + Notion + Trello hybrid for startups and students. Chat, tasks, files — all in one place.",
  keywords: ["team collaboration", "project management", "chat", "tasks", "startup tool"],
  manifest: "/manifest.json",
  openGraph: {
    title: "Synapse Lite",
    description: "Your team's digital sanctum. Chat, plan, execute.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="theme-transition antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

