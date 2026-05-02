// Use environment variable for production, fallback to localhost for local dev
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

/** Get stored access token */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("synapse-token");
}

/** Base fetch wrapper with auth headers */
async function fetcher<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Network error" }));
    const msg = error.error || error.message || `HTTP ${res.status}`;
    const details = error.details ? ` - ${JSON.stringify(error.details)}` : "";
    throw new Error(msg + details);
  }

  return res.json() as Promise<T>;
}

/** Raw fetch for non-JSON responses (like file uploads) */
async function rawFetcher(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, options);
}

// ── Auth ────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetcher<{ token: string; refreshToken: string; user: any }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (data: { name: string; email: string; password: string }) =>
      fetcher<{ token: string; user: any }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    refresh: (refreshToken: string) =>
      fetcher<{ token: string }>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
  },

  // ── Channels ──────────────────────────────────────────────────────
  channels: {
    list: (workspace_id: string, user_id?: string) =>
      fetcher<{ channels: any[] }>(`/api/channels?workspace_id=${workspace_id}${user_id ? `&user_id=${user_id}` : ""}`),
    get: (id: string) => fetcher<{ channel: any }>(`/api/channels/${id}`),
    getMembers: (id: string) => fetcher<{ members: any[] }>(`/api/channels/${id}/members`),
    create: (data: any) => fetcher<{ channel: any }>("/api/channels", { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Messages ──────────────────────────────────────────────────────
  messages: {
    list: (channel_id: string, cursor?: string) =>
      fetcher<{ messages: any[]; cursor: string | null; has_more: boolean }>(`/api/messages?channel_id=${channel_id}${cursor ? `&cursor=${cursor}` : ""}`),
    send: (data: { channel_id: string; content: string; content_type?: string; user_id: string; metadata?: any; parent_id?: string }) =>
      fetcher<{ message: any }>("/api/messages", { method: "POST", body: JSON.stringify(data) }),
    edit: (id: string, content: string) =>
      fetcher<any>(`/api/messages/${id}`, { method: "PATCH", body: JSON.stringify({ content }) }),
    delete: (id: string) => fetcher<void>(`/api/messages/${id}`, { method: "DELETE" }),
    toggleReaction: (id: string, user_id: string, emoji: string) =>
      fetcher<{ success: boolean; action: string }>(`/api/messages/${id}/reactions`, { method: "POST", body: JSON.stringify({ user_id, emoji }) }),
    getThread: (id: string) =>
      fetcher<{ thread: any[] }>(`/api/messages/${id}/thread`),
    pin: (id: string, is_pinned: boolean) =>
      fetcher<{ message: any }>(`/api/messages/${id}/pin`, { method: "PATCH", body: JSON.stringify({ is_pinned }) }),
  },

  // ── Tasks ─────────────────────────────────────────────────────────
  tasks: {
    list: (workspace_id: string, status?: string) =>
      fetcher<{ tasks: any[] }>(`/api/tasks?workspace_id=${workspace_id}${status ? `&status=${status}` : ""}`),
    get: (id: string) => fetcher<any>(`/api/tasks/${id}`),
    create: (data: any) => fetcher<any>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetcher<{ task: any }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetcher<void>(`/api/tasks/${id}`, { method: "DELETE" }),
  },

  // ── DM ────────────────────────────────────────────────────────────
  dm: {
    listConversations: (workspace_id: string, user_id: string) =>
      fetcher<{ conversations: any[] }>(`/api/dm/conversations?workspace_id=${workspace_id}&user_id=${user_id}`),
    listMessages: (workspace_id: string, user_id: string, withUser: string, cursor?: string) =>
      fetcher<{ messages: any[]; has_more: boolean }>(`/api/dm?workspace_id=${workspace_id}&user_id=${user_id}&with=${withUser}${cursor ? `&cursor=${cursor}` : ""}`),
    send: (data: { workspace_id: string; from_user_id: string; to_user_id: string; content: string; metadata?: any }) =>
      fetcher<{ message: any }>("/api/dm", { method: "POST", body: JSON.stringify(data) }),
    markRead: (id: string) =>
      fetcher<{ success: boolean; messageId: string }>(`/api/dm/${id}/read`, { method: "PATCH" }),
    toggleReaction: (id: string, user_id: string, emoji: string) =>
      fetcher<{ success: boolean; action: string }>(`/api/dm/${id}/reactions`, { method: "POST", body: JSON.stringify({ user_id, emoji }) }),
  },

  // ── Workspaces ────────────────────────────────────────────────────
  workspaces: {
    list: (userId: string) =>
      fetcher<{ workspaces: any[] }>("/api/workspaces", { headers: { "x-user-id": userId } }),
    getMembers: (workspaceId: string) =>
      fetcher<{ members: any[] }>(`/api/workspaces/${workspaceId}/members`),
    create: (data: { name: string; owner_id: string }) =>
      fetcher<{ workspace: any }>("/api/workspaces", { method: "POST", body: JSON.stringify(data) }),
    update: (workspaceId: string, name: string) =>
      fetcher<{ workspace: any }>(`/api/workspaces/${workspaceId}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    delete: (workspaceId: string) =>
      fetcher<void>(`/api/workspaces/${workspaceId}`, { method: "DELETE" }),
    removeMember: (workspaceId: string, userId: string) =>
      fetcher<void>(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" }),
    updateMemberRole: (workspaceId: string, userId: string, role: string) =>
      fetcher<any>(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    join: (data: { invite_code: string; user_id: string }) =>
      fetcher<{ workspace: any; message: string }>("/api/workspaces/join", { method: "POST", body: JSON.stringify(data) }),
  },

  // ── AI ────────────────────────────────────────────────────────────
  ai: {
    chat: (data: { messages: any[]; workspace_id?: string; channel_id?: string; user_id?: string }) =>
      fetcher<{ reply: string }>("/api/ai/chat", { method: "POST", body: JSON.stringify(data) }),
    summarize: (data: { messages: any[]; channel_name?: string }) =>
      fetcher<{ summary: string }>("/api/ai/summarize", { method: "POST", body: JSON.stringify(data) }),
    draft: (data: { prompt: string; type?: string; tone?: string }) =>
      fetcher<{ draft: string }>("/api/ai/draft", { method: "POST", body: JSON.stringify(data) }),
    smartReplies: (data: { conversationHistory: any[]; lastMessage: string }) =>
      fetcher<{ replies: string[] }>("/api/ai/smart-replies", { method: "POST", body: JSON.stringify(data) }),
    code: (data: { prompt: string; language?: string }) =>
      fetcher<{ code: string }>("/api/ai/code", { method: "POST", body: JSON.stringify(data) }),
    models: () => fetcher<{ models: any[]; current: string }>("/api/ai/models"),
  },

  // ── Files ─────────────────────────────────────────────────────────
  files: {
    getUploadUrl: (data: { filename: string; contentType: string; workspaceId: string; channelId?: string; userId: string; sizeBytes?: number }) =>
      fetcher<{ uploadUrl: string; token: string; path: string; publicUrl: string; file: any }>("/api/files/upload-url", { method: "POST", body: JSON.stringify(data) }),
    list: (workspace_id: string, type?: string, uploaded_by?: string, search?: string) =>
      fetcher<{ files: any[] }>(`/api/files?workspace_id=${workspace_id}${type ? `&type=${type}` : ""}${uploaded_by ? `&uploaded_by=${uploaded_by}` : ""}${search ? `&search=${search}` : ""}`),
    get: (id: string) => fetcher<{ file: any }>(`/api/files/${id}`),
    delete: (id: string, user_id: string) =>
      fetcher<{ success: boolean }>(`/api/files/${id}?user_id=${user_id}`, { method: "DELETE" }),
    upload: async (url: string, file: File, token: string) => {
      return rawFetcher(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          Authorization: `Bearer ${token}`,
        },
        body: file,
      });
    },
  },

  // ── Search ────────────────────────────────────────────────────────
  search: {
    query: (q: string, workspace_id: string, type = "all") =>
      fetcher<{ messages: any[]; channels: any[]; tasks: any[]; members: any[] }>(`/api/search?q=${encodeURIComponent(q)}&workspace_id=${workspace_id}&type=${type}`),
  },

  // ── Notifications ─────────────────────────────────────────────────
  notifications: {
    list: (user_id: string, limit = 20) =>
      fetcher<{ notifications: any[]; unread_count: number }>(`/api/notifications?user_id=${user_id}&limit=${limit}`),
    markAllRead: (user_id: string) =>
      fetcher<{ success: boolean }>("/api/notifications/read-all", { method: "PATCH", body: JSON.stringify({ user_id }) }),
    markRead: (id: string) =>
      fetcher<{ success: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
    subscribe: (user_id: string, subscription: any) =>
      fetcher<{ success: boolean }>("/api/notifications/subscribe", { method: "POST", body: JSON.stringify({ user_id, subscription }) }),
  },

  // ── Analytics ─────────────────────────────────────────────────────
  analytics: {
    messages: (workspace_id: string, days = 30) =>
      fetcher<{ data: { date: string; count: number }[] }>(`/api/analytics/messages?workspace_id=${workspace_id}&days=${days}`),
    members: (workspace_id: string) =>
      fetcher<{ total: number; weekly: { week: string; count: number }[] }>(`/api/analytics/members?workspace_id=${workspace_id}`),
    tasks: (workspace_id: string) =>
      fetcher<{ total: number; breakdown: Record<string, number>; completion_rate: number }>(`/api/analytics/tasks?workspace_id=${workspace_id}`),
    contributors: (workspace_id: string) =>
      fetcher<{ data: { userId: string; name: string; avatar_url: string; count: number }[] }>(`/api/analytics/contributors?workspace_id=${workspace_id}`),
  },

  // ── Profiles ──────────────────────────────────────────────────────
  profiles: {
    get: (id: string) => fetcher<{ profile: any }>(`/api/profiles/${id}`),
    update: (id: string, data: Record<string, any>) =>
      fetcher<{ profile: any }>(`/api/profiles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    uploadAvatar: (id: string, data: { filename: string; contentType: string }) =>
      fetcher<{ uploadUrl: string; token: string; publicUrl: string }>(`/api/profiles/${id}/avatar`, { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Bookmarks ─────────────────────────────────────────────────────
  bookmarks: {
    toggle: (user_id: string, message_id: string) =>
      fetcher<{ action: string }>("/api/bookmarks", { method: "POST", body: JSON.stringify({ user_id, message_id }) }),
    list: (user_id: string) =>
      fetcher<{ bookmarks: any[] }>(`/api/bookmarks?user_id=${user_id}`),
    delete: (id: string) =>
      fetcher<{ success: boolean }>(`/api/bookmarks/${id}`, { method: "DELETE" }),
  },

  // ── Pins ──────────────────────────────────────────────────────────
  pins: {
    list: (channel_id: string) =>
      fetcher<{ pins: any[] }>(`/api/pins/${channel_id}/pins`),
    add: (channel_id: string, message_id: string, pinned_by: string) =>
      fetcher<{ pin: any }>(`/api/pins/${channel_id}/pins`, { method: "POST", body: JSON.stringify({ message_id, pinned_by }) }),
    remove: (channel_id: string, message_id: string) =>
      fetcher<{ success: boolean }>(`/api/pins/${channel_id}/pins/${message_id}`, { method: "DELETE" }),
  },

  // ── Polls ─────────────────────────────────────────────────────────
  polls: {
    vote: (message_id: string, user_id: string, option_index: number) =>
      fetcher<{ success: boolean }>(`/api/messages/${message_id}/vote`, { method: "POST", body: JSON.stringify({ user_id, option_index }) }),
  },
};
