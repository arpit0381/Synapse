"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { AtSign, Hash, ArrowRight, X } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useAppStore } from "@/store/appStore";
import { useQueryClient } from "@tanstack/react-query";

interface MentionNotification {
  type: string;
  title: string;
  body: string;
  channelName: string;
  channelId: string;
  senderName: string;
  senderId: string;
  mentionType: "user" | "everyone" | "channel";
}

interface DMNotification {
  type: "dm";
  title: string;
  body: string;
  senderName: string;
  senderId: string;
  messageId: string;
}

export function MentionToastListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUnreadNotifications, unreadNotifications } = useAppStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create a subtle notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Use Web Audio API for a subtle notification chime
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.08); // C#6
      oscillator.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.16); // E6

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {
      // Silently fail if audio is blocked
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) return;

    const handleMentionNotification = (data: MentionNotification) => {
      // Don't notify yourself
      if (data.senderId === user.id) return;

      // Play sound
      playNotificationSound();

      // Increment unread notifications
      setUnreadNotifications(unreadNotifications + 1);

      // Invalidate notifications query to refresh dropdown
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });

      // Show premium toast notification
      toast.custom(
        (t) => (
          <div
            className={`mention-toast ${t.visible ? "mention-toast-enter" : "mention-toast-exit"}`}
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "linear-gradient(135deg, hsl(var(--surface)) 0%, hsl(var(--background)) 100%)",
              border: "1px solid hsl(var(--border))",
              borderLeft: data.mentionType === "user"
                ? "4px solid hsl(270, 80%, 60%)"
                : "4px solid hsl(45, 90%, 55%)",
              borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 20px 60px -15px rgba(0,0,0,0.3), 0 0 30px -10px rgba(75,57,239,0.15)",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              backdropFilter: "blur(20px)",
              animation: t.visible
                ? "mentionSlideIn 0.4s cubic-bezier(0.21, 1.02, 0.73, 1)"
                : "mentionSlideOut 0.3s cubic-bezier(0.06, 0.71, 0.55, 1)",
            }}
            onClick={() => {
              router.push(`/channels/${data.channelId}`);
              toast.dismiss(t.id);
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: data.mentionType === "user"
                  ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))"
                  : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
                border: data.mentionType === "user"
                  ? "1px solid rgba(139,92,246,0.2)"
                  : "1px solid rgba(245,158,11,0.2)",
              }}
            >
              {data.mentionType === "user" ? (
                <AtSign style={{ width: "22px", height: "22px", color: "rgb(139,92,246)" }} />
              ) : (
                <Hash style={{ width: "22px", height: "22px", color: "rgb(245,158,11)" }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "hsl(var(--foreground))",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {data.title}
                </span>
                {data.mentionType !== "user" && (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: "rgba(245,158,11,0.12)",
                      color: "rgb(245,158,11)",
                    }}
                  >
                    @{data.mentionType}
                  </span>
                )}
              </div>

              {/* Channel badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: "6px",
                }}
              >
                <Hash style={{ width: "12px", height: "12px", color: "hsl(var(--muted-foreground))", opacity: 0.6 }} />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "hsl(var(--accent))",
                  }}
                >
                  {data.channelName}
                </span>
              </div>

              {/* Message preview */}
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "280px",
                }}
              >
                {data.body}
              </p>

              {/* Go to channel CTA */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "hsl(var(--accent))",
                  opacity: 0.8,
                }}
              >
                Go to channel
                <ArrowRight style={{ width: "12px", height: "12px" }} />
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
              }}
              style={{
                padding: "4px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                opacity: 0.5,
                flexShrink: 0,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.5"; }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        ),
        {
          duration: 6000,
          position: "top-right",
        }
      );
    };

    const handleDMNotification = (data: DMNotification) => {
      if (data.senderId === user.id) return;
      playNotificationSound();
      setUnreadNotifications(unreadNotifications + 1);
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });

      toast.custom(
        (t) => (
          <div
            className={`mention-toast ${t.visible ? "mention-toast-enter" : "mention-toast-exit"}`}
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "linear-gradient(135deg, hsl(var(--surface)) 0%, hsl(var(--background)) 100%)",
              border: "1px solid hsl(var(--border))",
              borderLeft: "4px solid hsl(var(--accent))",
              borderRadius: "16px",
              padding: "16px 18px",
              boxShadow: "0 20px 60px -15px rgba(0,0,0,0.3), 0 0 30px -10px rgba(var(--accent-rgb),0.15)",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              backdropFilter: "blur(20px)",
              animation: t.visible
                ? "mentionSlideIn 0.4s cubic-bezier(0.21, 1.02, 0.73, 1)"
                : "mentionSlideOut 0.3s cubic-bezier(0.06, 0.71, 0.55, 1)",
            }}
            onClick={() => {
              router.push(`/dm/${data.senderId}`);
              toast.dismiss(t.id);
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "linear-gradient(135deg, hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15), hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.05))",
                border: "1px solid hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.2)",
              }}
            >
              <ArrowRight style={{ width: "22px", height: "22px", color: "hsl(var(--accent))", transform: "rotate(-45deg)" }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}>
                  {data.senderName}
                </span>
                <span style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 6px", borderRadius: "6px", background: "hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.12)", color: "hsl(var(--accent))" }}>
                  Direct Message
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "280px" }}>
                {data.body}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "11px", fontWeight: 600, color: "hsl(var(--accent))", opacity: 0.8 }}>
                Reply now <ArrowRight style={{ width: "12px", height: "12px" }} />
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
              style={{ padding: "4px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer", color: "hsl(var(--muted-foreground))", opacity: 0.5, flexShrink: 0 }}
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        ),
        { duration: 6000, position: "top-right" }
      );
    };

    socket.on("notification:mention", handleMentionNotification);
    socket.on("notification:dm", handleDMNotification);

    return () => {
      socket.off("notification:mention", handleMentionNotification);
      socket.off("notification:dm", handleDMNotification);
    };
  }, [user?.id, playNotificationSound, router, setUnreadNotifications, unreadNotifications, queryClient]);

  return null; // This is a listener-only component, no UI
}
