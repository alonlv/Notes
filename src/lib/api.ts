import type {
  ApiErrorsResponse,
  Automation,
  AutomationKind,
  BackgroundStatusResponse,
  CalendarConnectionStatus,
  Contact,
  Memory,
  MemoryGraph,
  Note,
  Priority,
  RouterMetricsResponse,
  RuleTestResult,
  Task,
  TaskStatus,
  Topic,
  Voucher,
  VoucherCreateResult,
  VoucherRule,
} from "@/types/api";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/**
 * The one place a response is turned into data. It throws on a failed request,
 * which is what lets every caller — and react-query's `error` — tell a real
 * answer from an error payload. Calling `res.json()` directly, as several pages
 * used to, hands `{error: "..."}` back as if it were the list that was asked
 * for, so the error state never renders and the page crashes downstream instead.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
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

/** `?a=1&b=2` from the entries that have a value, or "" when none do. */
function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : "";
}

const send = <T>(method: string) => (path: string, body?: unknown) =>
  apiFetch<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

const post = <T>(path: string, body?: unknown) => send<T>("POST")(path, body);
const put = <T>(path: string, body?: unknown) => send<T>("PUT")(path, body);
const patch = <T>(path: string, body?: unknown) => send<T>("PATCH")(path, body);
const del = <T = void>(path: string, body?: unknown) => send<T>("DELETE")(path, body);

const id = encodeURIComponent;

/**
 * The signed-in person is never named by the client: the Next.js proxy derives
 * X-Person-Id from the Auth.js session. That is why nothing below takes a
 * `user_id` — a browser cannot ask for someone else's data.
 */
export const api = {
  notes: {
    list: (topic?: string) => apiFetch<Note[]>(`/api/notes${qs({ topic })}`),
    get: (noteId: string) => apiFetch<Note>(`/api/notes/${id(noteId)}`),
    create: (body: { content?: string; topic: string; title?: string }) =>
      post<Note>("/api/notes", body),
    update: (
      noteId: string,
      body: Partial<{ title: string; content: string; topic: string; authorized_ids: string[] }>,
    ) => put<Note>(`/api/notes/${id(noteId)}`, body),
    delete: (noteId: string) => del(`/api/notes/${id(noteId)}`),
  },

  tasks: {
    list: (tag?: string) => apiFetch<Task[]>(`/api/tasks${qs({ tag })}`),
    create: (body: { title: string; status?: TaskStatus; priority?: Priority; tags?: string[]; due_date?: string }) =>
      post<Task>("/api/tasks", body),
    update: (
      taskId: string,
      body: Partial<{
        title: string;
        done: boolean;
        status: TaskStatus;
        priority: Priority;
        tags: string[];
        due_date: string;
        clear_due_date: boolean;
        authorized_ids: string[];
      }>,
    ) => patch<Task>(`/api/tasks/${id(taskId)}`, body),
    delete: (taskId: string) => del(`/api/tasks/${id(taskId)}`),
    listTags: () => apiFetch<string[]>("/api/tasks/tags"),
  },

  topics: {
    list: () => apiFetch<Topic[]>("/api/topics"),
    create: (body: { name: string; color?: string }) => post<Topic>("/api/topics", body),
    update: (
      topicId: string,
      body: Partial<{ name: string; color: string; authorized_ids: string[] }>,
    ) => put<Topic>(`/api/topics/${id(topicId)}`, body),
    delete: (topicId: string, migrateToId?: string) =>
      del(`/api/topics/${id(topicId)}${qs({ migrate_to: migrateToId })}`),
  },

  memories: {
    list: (query?: string) => apiFetch<Memory[]>(`/api/memories${qs({ q: query })}`),
    graph: (topics?: string) => apiFetch<MemoryGraph>(`/api/memories/graph${qs({ topics })}`),
    create: (body: MemoryWrite) => post<{ id: string }>("/api/memories", body),
    update: (memoryId: string, body: MemoryWrite) =>
      put<{ id: string }>(`/api/memories/${id(memoryId)}`, body),
    delete: (memoryId: string) => del(`/api/memories/${id(memoryId)}`),
  },

  automations: {
    list: (kind?: AutomationKind) => apiFetch<Automation[]>(`/api/automations${qs({ kind })}`),
    create: (body: object) => post<{ id: string }>("/api/automations", body),
    update: (automationId: string, body: object) =>
      put<{ id: string }>(`/api/automations/${id(automationId)}`, body),
    delete: (automationId: string) => del(`/api/automations/${id(automationId)}`),
  },

  // The assistant has no calendar of its own — it drives the user's real Google/Apple
  // calendar. The FE only reports connection status and starts the Google OAuth flow.
  calendars: {
    connectionStatus: () =>
      apiFetch<CalendarConnectionStatus>("/api/calendars/connection-status"),
    googleAuthUrl: () => "/api/calendars/google-auth",
    startGoogleAuth: () => apiFetch<{ auth_url: string }>("/api/calendars/google-auth"),
    appleSetup: (body: { username: string; password: string }) =>
      post<{ status: string; username: string }>("/api/calendars/apple/setup", body),
    disconnectGoogle: () =>
      del<{ status: string }>("/api/calendars/google/disconnect"),
    disconnectApple: () =>
      del<{ status: string }>("/api/calendars/apple/disconnect"),
  },

  contacts: {
    list: () => apiFetch<{ contacts: Contact[] }>("/api/admin/contacts").then((r) => r.contacts ?? []),
    add: (name: string, canonicalId?: string) =>
      post("/api/admin/contacts", { name, canonical_id: canonicalId || undefined }),
    remove: (canonicalId: string) => del(`/api/admin/contacts/${id(canonicalId)}`),
    reload: () => post<{ loaded: number }>("/api/admin/contacts/reload"),
    saveData: (canonicalId: string, data: Record<string, unknown>) =>
      put(`/api/admin/contacts/${id(canonicalId)}/data`, data),
    addIdentity: (canonicalId: string, body: { platform: string; id: string; label: string }) =>
      post(`/api/admin/contacts/${id(canonicalId)}/identities`, body),
    // Declared on the backend ahead of /contacts/{canonical_id} so this reaches
    // the identity handler rather than "delete the contact called identities".
    removeIdentity: (body: { platform: string; id: string }) =>
      del("/api/admin/contacts/identities", body),
    setPrimaryChannel: (canonicalId: string, platform: string, channelId: string) =>
      post(`/api/admin/contacts/${id(canonicalId)}/channel`, { platform, channel_id: channelId }),
  },

  config: {
    get: <T,>() => apiFetch<{ effective: T }>("/api/admin/config"),
    defaults: <T,>() => apiFetch<T>("/api/admin/config/defaults"),
    save: (key: string, value: unknown) => put("/api/admin/config", { [key]: value }),
    reset: (key: string) => del(`/api/admin/config/${id(key)}`),
  },

  memoryAdmin: {
    consolidate: () => post("/api/admin/memory/consolidate"),
  },

  userData: {
    get: <T,>(userId: string) => apiFetch<T>(`/api/admin/user-data/${id(userId)}`),
  },

  backgroundStatus: { get: () => apiFetch<BackgroundStatusResponse>("/api/admin/background-status") },
  routerMetrics: { get: () => apiFetch<RouterMetricsResponse>("/api/admin/router-metrics") },

  apiErrors: {
    get: (limit = 25, source?: string) =>
      apiFetch<ApiErrorsResponse>(`/api/admin/api-errors${qs({ limit, source })}`),
    clear: () => del<{ ok: boolean }>("/api/admin/api-errors"),
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
    send: (message: string) => post<{ reply: string }>("/api/chat", { message }),
    history: () => apiFetch<{ messages: ChatTurn[] }>("/api/chat/history"),
  },

  /** Fire the heartbeat, or push an external event, for one person. */
  trigger: (userId: string, event: string) =>
    post<{ ok?: boolean }>(`/api/trigger${qs({ user_id: userId })}`, { event }),
};

/** The write shape shared by creating and editing a memory. */
export interface MemoryWrite {
  content: string;
  category?: string;
  topics: string[];
  authorized_ids: string[];
}
