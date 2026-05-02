import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  username?: string;
  bio?: string;
  status?: "online" | "away" | "dnd" | "offline" | "invisible";
  status_message?: string;
  status_text?: string;
  status_emoji?: string;
  timezone?: string;
}

export interface Workspace {
  id: string;
  name: string;
  logo_url?: string;
  owner_id: string;
  invite_code: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  is_private: boolean;
  unread_count?: number;
}

export interface PresenceInfo {
  status: "online" | "away" | "dnd" | "offline" | "invisible";
  statusText: string;
  statusEmoji: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;

  // Workspace
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  currentUserRole: "owner" | "admin" | "member" | "guest" | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentUserRole: (role: "owner" | "admin" | "member" | "guest" | null) => void;

  // Channels
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  setActiveChannel: (channelId: string) => void;
  updateUnreadCount: (channelId: string, count: number) => void;

  // UI State
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  activeThread: string | null;
  commandPaletteOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveThread: (messageId: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Online users & Presence
  onlineUserIds: string[];
  presenceMap: Record<string, PresenceInfo>;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  updatePresence: (userId: string, info: PresenceInfo) => void;
  syncPresence: (data: Record<string, PresenceInfo>) => void;

  // Notifications
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;

  // Preferences
  enterKeyBehavior: "send" | "newline";
  setEnterKeyBehavior: (behavior: "send" | "newline") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("synapse-token", token);
        }
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("synapse-token");
          localStorage.removeItem("synapse-store");
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Workspace
      currentWorkspace: null,
      workspaces: [],
      currentUserRole: null,
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentUserRole: (role) => set({ currentUserRole: role }),

      // Channels
      channels: [],
      activeChannelId: null,
      setChannels: (channels) => set({ channels }),
      setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
      updateUnreadCount: (channelId, count) =>
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === channelId ? { ...c, unread_count: count } : c
          ),
        })),

      // UI
      sidebarOpen: true,
      rightPanelOpen: false,
      activeThread: null,
      commandPaletteOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      setActiveThread: (messageId) => set({ activeThread: messageId }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Online users & Presence
      onlineUserIds: [],
      presenceMap: {},
      setUserOnline: (userId) =>
        set((state) => ({
          onlineUserIds: state.onlineUserIds.includes(userId)
            ? state.onlineUserIds
            : [...state.onlineUserIds, userId],
        })),
      setUserOffline: (userId) =>
        set((state) => ({
          onlineUserIds: state.onlineUserIds.filter((id) => id !== userId),
        })),
      updatePresence: (userId, info) =>
        set((state) => ({
          presenceMap: { ...state.presenceMap, [userId]: info },
        })),
      syncPresence: (data) =>
        set({ presenceMap: data }),

      // Notifications
      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),

      // Preferences
      enterKeyBehavior: "send",
      setEnterKeyBehavior: (behavior) => set({ enterKeyBehavior: behavior }),
    }),
    {
      name: "synapse-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        currentWorkspace: state.currentWorkspace,
        workspaces: state.workspaces,
        enterKeyBehavior: state.enterKeyBehavior,
      }),
    }
  )
);


