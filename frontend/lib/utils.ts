import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a date to a relative string (e.g. "2 hours ago") */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/** Format a date to time string (e.g. "10:32 AM") */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Get greeting based on time of day */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Get greeting emoji based on time of day */
export function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️";
  if (hour < 17) return "⚡";
  return "🌙";
}

/** Generate initials from a name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Generate a consistent pastel color from a string (for avatars) */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#6C63FF", "#00D4AA", "#FF7A00", "#FF6B9D",
    "#4FC3F7", "#A78BFA", "#34D399", "#F59E0B",
  ];
  return colors[Math.abs(hash) % colors.length];
}

/** Truncate text to a max length */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/** Format file size in human-readable format */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Check if a date is today */
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/** Get a date label for chat groups */
export function getChatDateLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/** Priority colors for tasks */
export const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  low: { label: "Low", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
} as const;

export type Priority = keyof typeof PRIORITY_CONFIG;
