"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { useCallStore } from "@/store/callStore";
import { getSocket, connectSocket } from "@/lib/socket";
import { api } from "@/lib/api";

export function AppInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const initialized = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    user, isAuthenticated, currentWorkspace, setWorkspaces,
    setCurrentWorkspace, setChannels, setUserOnline, setUserOffline,
    updatePresence, syncPresence, setUnreadNotifications, setCurrentUserRole
  } = useAppStore();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Redirect if not authed
  useEffect(() => {
    const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password");
    if (hydrated && !isAuthenticated && !isAuthRoute) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  // Bootstrap data
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    async function bootstrap() {
      try {
        const { workspaces } = await api.workspaces.list(user!.id);
        setWorkspaces(workspaces);

        if (workspaces.length > 0) {
          const ws = currentWorkspace && workspaces.find(w => w.id === currentWorkspace.id)
            ? currentWorkspace
            : workspaces[0];
          setCurrentWorkspace(ws);
        }

        // Fetch latest profile
        try {
          const { profile } = await api.profiles.get(user!.id);
          if (profile) {
            useAppStore.getState().updateUser({
              name: profile.full_name || user!.name,
              avatar_url: profile.avatar_url,
              bio: profile.bio,
              username: profile.username,
              status: profile.status,
              status_message: profile.status_message,
              status_text: profile.status_text,
              status_emoji: profile.status_emoji,
              timezone: profile.timezone,
            });
          }
        } catch (e) {
          console.error("[Init] Failed to fetch profile:", e);
        }
      } catch (err) {
        console.error("[Init] Failed to bootstrap:", err);
      }
    }
    bootstrap();
  }, [user]);

  // Load channels & connect socket when workspace changes
  useEffect(() => {
    if (!currentWorkspace?.id || !user?.id) return;

    async function loadWorkspaceData() {
      try {
        const { channels } = await api.channels.list(currentWorkspace!.id, user!.id);
        setChannels(channels);

        // Determine user role
        const { members } = await api.workspaces.getMembers(currentWorkspace!.id);
        const self = members.find((m: any) => m.id === user!.id);
        setCurrentUserRole(self?.role || "member");
      } catch (err) {
        console.error("[Init] Failed to load workspace data:", err);
      }
    }
    loadWorkspaceData();

    // Socket connection
    const socket = connectSocket(useAppStore.getState().token || "");
    if (!socket) return;

    const onConnect = () => {
      socket.emit("join_workspace", { workspaceId: currentWorkspace!.id, userId: user!.id });
    };

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    // Online/Offline events
    socket.on("user_online", ({ userId }: { userId: string }) => setUserOnline(userId));
    socket.on("user_offline", ({ userId }: { userId: string }) => setUserOffline(userId));
    socket.on("online_users", ({ users }: { users: string[] }) => {
      users.forEach(setUserOnline);
    });

    // Presence events
    socket.on("presence:sync", (data: Record<string, any>) => syncPresence(data));
    socket.on("presence:update", ({ userId, status, statusText, statusEmoji }: any) => {
      updatePresence(userId, { status, statusText: statusText || "", statusEmoji: statusEmoji || "" });
    });

    // Notification events
    socket.on("notification:new", (notif: any) => {
      const current = useAppStore.getState().unreadNotifications;
      setUnreadNotifications(current + 1);
      // Show browser notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notif.title, { body: notif.body, icon: "/favicon.ico" });
      }
    });

    // Call events for sidebar indicators
    const callStore = useCallStore.getState();
    socket.on("call-started", (data: any) => {
      callStore.setActiveGroupCall(data.roomId, {
        channelName: data.channelName,
        participantCount: data.count || 0,
        participants: data.participants || [],
      });
    });
    socket.on("call-ended", ({ roomId }: { roomId: string }) => {
      callStore.removeActiveGroupCall(roomId);
    });
    socket.on("call-participants-update", (data: any) => {
      callStore.setActiveGroupCall(data.roomId, {
        channelName: data.channelName || "",
        participantCount: data.count || 0,
        participants: data.participants || [],
      });
    });

    // Presence heartbeat — every 30s
    heartbeatRef.current = setInterval(() => {
      socket.emit("presence:heartbeat", { userId: user!.id });
    }, 30000);

    // Auto-away on visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        awayTimeoutRef.current = setTimeout(() => {
          socket.emit("presence:status", { userId: user!.id, status: "away" });
        }, 5 * 60 * 1000); // 5 min
      } else {
        if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current);
        socket.emit("presence:status", { userId: user!.id, status: "online" });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      socket.off("connect", onConnect);
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("online_users");
      socket.off("presence:sync");
      socket.off("presence:update");
      socket.off("notification:new");
      socket.off("call-started");
      socket.off("call-ended");
      socket.off("call-participants-update");
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentWorkspace?.id, user?.id]);

  return null;
}
