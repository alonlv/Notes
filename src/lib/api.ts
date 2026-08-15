import type { Automation, AutomationKind, BackgroundStatusResponse, CalendarConnectionStatus, Note, Priority, RouterMetricsResponse, RuleTestResult, Task, TaskStatus, Topic, Voucher, VoucherCreateResult, VoucherRule } from "@/types/api";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = String(res.status);
    try {
      const body = await res.json();
      message = body?.error ?? body?.detail ?? message;
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * The signed-in person is never named by the client: the Next.js proxy derives
 * X-Person-Id from the Auth.js session. That is why nothing below takes a
 * `user_id` — a browser cannot ask for someone else's data.
 */
export const api = {
  notes: {
    list: (topic?: string) => {
      const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
      return apiFetch<Note[]>(`/api/notes${qs}`);
    },
    get: (id: string) =>
      apiFetch<Note>(`/api/notes/${encodeURIComponent(id)}`),
    create: (body: { content?: string; topic: string; title?: string }) =>
      apiFetch<Note>("/api/notes", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ title: string; content: string; topic: string; authorized_ids: string[] }>) =>
      apiFetch<Note>(`/api/notes/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  tasks: {
    list: (tag?: string) => {
      const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
      return apiFetch<Task[]>(`/api/tasks${qs}`);
    },
    create: (body: { title: string; status?: TaskStatus; priority?: Priority; tags?: string[]; due_date?: string }) =>
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
    update: (id: string, body: Partial<{ name: string; color: string; authorized_ids: string[] }>) =>
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
    connectionStatus: () =>
      apiFetch<CalendarConnectionStatus>("/api/calendars/connection-status"),
    googleAuthUrl: () => "/api/calendars/google-auth",
    startGoogleAuth: () => apiFetch<{ auth_url: string }>("/api/calendars/google-auth"),
    appleSetup: (body: { username: string; password: string }) =>
      apiFetch<{ status: string; username: string }>(`/api/calendars/apple/setup`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    disconnectGoogle: () =>
      apiFetch<{ status: string }>("/api/calendars/google/disconnect", { method: "DELETE" }),
    disconnectApple: () =>
      apiFetch<{ status: string }>("/api/calendars/apple/disconnect", { method: "DELETE" }),
  },
  automations: {
    list: (kind?: AutomationKind) => {
      const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
      return apiFetch<Automation[]>(`/api/automations${qs}`);
    },
  },
  backgroundStatus: {
    get: () => apiFetch<BackgroundStatusResponse>("/api/admin/background-status"),
  },
  routerMetrics: {
    get: () => apiFetch<RouterMetricsResponse>("/api/admin/router-metrics"),
  },
  vouchers: {
    list: (includeUsed = false) =>
      apiFetch<Voucher[]>(`/api/vouchers${includeUsed ? "?include_used=true" : ""}`),
    /** Household by default — a gift card is a shared asset, not a private one. */
    create: (body: {
      raw_text?: string;
      kind?: "voucher" | "coupon";
      store?: string;
      code?: string;
      discount?: string;
      /** Trackable balance. Set it and the card shows what is left and offers Spend. */
      value_total?: number;
      value_currency?: string;
      /** Where to redeem it. Extracted from raw_text when not given explicitly. */
      source_url?: string;
      expires_on?: string;
      no_expiration?: boolean;
      category?: string;
      household?: boolean;
    }) =>
      apiFetch<VoucherCreateResult>("/api/vouchers", {
        method: "POST",
        body: JSON.stringify({ household: true, ...body }),
      }),
    spend: (id: string, amount: number) =>
      apiFetch<Voucher>(`/api/vouchers/${encodeURIComponent(id)}/spend`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    update: (id: string, body: Partial<{ title: string; store: string; code: string; discount: string; value_total: number; value_currency: string; source_url: string; expires_on: string; category_slug: string; is_used: boolean }>) =>
      apiFetch<Voucher>(`/api/vouchers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    /** Re-run categorization — the way back from a failed parse. */
    reprocess: (id: string) =>
      apiFetch<Voucher>(`/api/vouchers/${encodeURIComponent(id)}/reprocess`, { method: "POST" }),
    delete: (id: string) =>
      apiFetch<void>(`/api/vouchers/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  /** Regex rules: a match files an item instantly, with no model call. */
  voucherRules: {
    list: () => apiFetch<VoucherRule[]>("/api/vouchers/rules"),
    create: (body: {
      name: string;
      regex: string;
      category_name: string;
      store?: string;
      kind?: "voucher" | "coupon";
      priority?: number;
    }) =>
      apiFetch<VoucherRule>("/api/vouchers/rules", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<{ name: string; regex: string; category_name: string; store: string; priority: number; enabled: boolean }>) =>
      apiFetch<VoucherRule>(`/api/vouchers/rules/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/api/vouchers/rules/${encodeURIComponent(id)}`, { method: "DELETE" }),
    /** Dry-run a pattern before committing to it. */
    test: (text: string, regex?: string) =>
      apiFetch<RuleTestResult>("/api/vouchers/rules/test", {
        method: "POST",
        body: JSON.stringify({ text, regex }),
      }),
  },
  chat: {
    send: (message: string) =>
      apiFetch<{ reply: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    history: () => apiFetch<{ messages: ChatTurn[] }>("/api/chat/history"),
  },
};
