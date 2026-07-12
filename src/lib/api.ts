import { apiFetch } from "@alonlv/core-fe";
import type { Automation, AutomationKind, BackgroundStatusResponse, CalendarConnectionStatus, Note, Priority, RouterMetricsResponse, Task, TaskStatus, Topic } from "@/types/api";

export { apiFetch };

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export const api = {
  notes: {
    list: (topic?: string, userId?: string) => {
      const params = new URLSearchParams();
      if (topic) params.set("topic", topic);
      if (userId) params.set("user_id", userId);
      const qs = params.toString();
      return apiFetch<Note[]>(`/api/notes${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) =>
      apiFetch<Note>(`/api/notes/${encodeURIComponent(id)}`),
    create: (body: { content?: string; topic: string; title?: string; user_id?: string }) =>
      apiFetch<Note>("/api/notes", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ title: string; content: string; topic: string; user_id: string; authorized_ids: string[] }>) =>
      apiFetch<Note>(`/api/notes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  tasks: {
    list: (userId?: string, tag?: string) => {
      const params = new URLSearchParams();
      if (userId) params.set("user_id", userId);
      if (tag) params.set("tag", tag);
      const qs = params.toString();
      return apiFetch<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
    },
    create: (body: { title: string; status?: TaskStatus; priority?: Priority; tags?: string[]; due_date?: string; user_id?: string }) =>
      apiFetch<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    update: (
      id: string,
      body: Partial<{
        title: string;
        done: boolean;
        status: TaskStatus;
        priority: Priority;
        tags: string[];
        due_date: string;
        clear_due_date: boolean;
        user_id: string;
        authorized_ids: string[];
      }>
    ) => apiFetch<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    listTags: () => apiFetch<string[]>("/api/tasks/tags"),
  },
  topics: {
    list: () => apiFetch<Topic[]>("/api/topics"),
    create: (body: { name: string; color?: string }) =>
      apiFetch<Topic>("/api/topics", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ name: string; color: string; user_id: string; authorized_ids: string[] }>) =>
      apiFetch<Topic>(`/api/topics/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string, migrateToId?: string) =>
      apiFetch<void>(
        `/api/topics/${id}${migrateToId ? `?migrate_to=${encodeURIComponent(migrateToId)}` : ""}`,
        { method: "DELETE" }
      ),
  },
  // The assistant has no calendar of its own — it drives the user's real Google/Apple
  // calendar. The FE only reports connection status and starts the Google OAuth flow.
  calendars: {
    connectionStatus: (userId?: string) => {
      const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
      return apiFetch<CalendarConnectionStatus>(`/api/calendars/connection-status${qs}`);
    },
    googleAuthUrl: (userId?: string) =>
      `/api/calendars/google-auth${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`,
    startGoogleAuth: (userId?: string) =>
      apiFetch<{ auth_url: string }>(
        `/api/calendars/google-auth${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`,
      ),
    appleSetup: (body: { user_id: string; username: string; password: string }) =>
      apiFetch<{ status: string; username: string }>(`/api/calendars/apple/setup`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    disconnectGoogle: (userId: string) =>
      apiFetch<{ status: string }>(`/api/calendars/google/disconnect?user_id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      }),
    disconnectApple: (userId: string) =>
      apiFetch<{ status: string }>(`/api/calendars/apple/disconnect?user_id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      }),
  },
  automations: {
    list: (userId?: string, kind?: AutomationKind) => {
      const params = new URLSearchParams();
      if (userId) params.set("user_id", userId);
      if (kind) params.set("kind", kind);
      const qs = params.toString();
      return apiFetch<Automation[]>(`/api/automations${qs ? `?${qs}` : ""}`);
    },
  },
  backgroundStatus: {
    get: () => apiFetch<BackgroundStatusResponse>("/api/admin/background-status"),
  },
  routerMetrics: {
    get: () => apiFetch<RouterMetricsResponse>("/api/admin/router-metrics"),
  },
  chat: {
    send: (message: string, userId?: string) =>
      apiFetch<{ reply: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message, user_id: userId || "web-user" }),
      }),
    history: (userId?: string) => {
      const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
      return apiFetch<{ messages: ChatTurn[] }>(`/api/chat/history${qs}`);
    },
  },
};
