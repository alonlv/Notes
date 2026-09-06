export interface BaseEntity {
  id: string;
  user_id: string;
  owner_id: string;
  context_id?: string;
  authorized_ids?: string[];
}

export interface Topic extends BaseEntity {
  name: string;
  color: string;
  created_at: string;
  authorized_ids: string[];
  note_count: number;
}

export interface Note extends BaseEntity {
  title: string;
  content: string;
  topic: string;
  created_at: string;
  updated_at: string;
}

export type Priority = "none" | "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task extends BaseEntity {
  title: string;
  done: boolean;
  status: TaskStatus;
  priority: Priority;
  tags?: string[];
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type AutomationKind = "reminder" | "monitor";

export interface Automation extends BaseEntity {
  kind: AutomationKind;
  platform: string;
  channel_id: string;
  content: string;
  run_at: string | null;
  cron: string | null;
  last_run_at: string | null;
  snooze_count: number;
  awaiting_response: boolean;
}

export interface ContactIdentity {
  platform: string;
  id: string;
  label: string;
}

export interface Contact {
  name: string;
  canonical_id: string;
  identities: ContactIdentity[];
  primary_channel?: { platform: string; channel_id: string };
  attributes?: Record<string, unknown>;
}

export interface Memory {
  id: string;
  user_id?: string;
  owner_id?: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  authorized_ids?: string[];
}

/** Why two memories are linked. Every link carries exactly one reason. */
export type MemoryLinkKind = "semantic" | "topic" | "entity";

export interface MemoryGraphNode {
  id: string;
  content: string;
  topics: string[];
  category: string;
  kind: string;
  /** Which context the memory was grouped into; -1 when nothing links to it. */
  cluster: number;
  cluster_label: string;
  centrality: number;
  degree: number;
  created_at: string | null;
}

export interface MemoryGraphLink {
  source: string;
  target: string;
  kind: MemoryLinkKind;
  weight: number;
}

export interface MemoryCluster {
  id: number;
  label: string;
  size: number;
}

/** The whole memory store as a graph — what the Memory page draws. */
export interface MemoryGraph {
  owner_id: string;
  nodes: MemoryGraphNode[];
  links: MemoryGraphLink[];
  clusters: MemoryCluster[];
  stats: {
    memories: number;
    links: number;
    clusters: number;
    unlinked: number;
    density: number;
  };
}

/** A memory reached from another one, with the reason it came along. */
export interface RelatedMemory {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  connected_via: {
    id?: string;
    content?: string;
    kind?: MemoryLinkKind;
    reason?: string;
    weight?: number;
    hops?: number;
  };
}

/** Status of the user's connected REAL calendars (Google / Apple). */
export interface CalendarConnectionStatus {
  user_id: string;
  google: boolean;
  apple: boolean;
  apple_username: string;
  /** False when the deployment has no Google OAuth credentials set. */
  google_configured: boolean;
}

export interface JobRun {
  job_name: string;
  started_at: string;
  status: "ok" | "error" | "skip";
  message: string | null;
  user_id: string | null;
  duration_ms: number | null;
}

export interface JobStatus {
  last_run: JobRun | null;
  recent: JobRun[];
  totals: { ok: number; error: number; skip: number };
}

export interface BackgroundStatusResponse {
  jobs: Record<string, JobStatus>;
}

export interface RouterProviderStat {
  model: string;
  base_url: string;
  target: "cloud" | "local";
  count: number;
}

export interface RouterMetricsResponse {
  total: number;
  by_target: { cloud?: number; local?: number };
  by_kind: { user?: number; background?: number };
  providers: RouterProviderStat[];
  recent: {
    at: string;
    kind: "user" | "background";
    target: "cloud" | "local";
    model: string;
    base_url: string;
    duration_ms: number | null;
  }[];
}

/** Where a recorded failure came from: our own endpoints, an LLM provider, or
 *  anything else in the backend that logged an error. */
export type ApiErrorSource = "http" | "llm" | "app";

export interface ApiErrorEvent {
  at: string;
  first_at: string;
  /** Identical back-to-back failures collapse into one entry with a count. */
  count: number;
  source: ApiErrorSource;
  /** "POST /chat", a provider base_url, or the logger that reported it. */
  label: string;
  error_type: string;
  message: string;
  status_code: number | null;
  detail: string | null;
  user_id: string | null;
}

export interface ApiErrorsResponse {
  total: number;
  by_source: Partial<Record<ApiErrorSource, number>>;
  latest: ApiErrorEvent | null;
  recent: ApiErrorEvent[];
}

export type VoucherKind = "voucher" | "coupon";
export type VoucherStatus = "ready" | "pending" | "processing" | "failed";

export interface Voucher extends BaseEntity {
  kind: VoucherKind;
  title: string;
  store: string | null;
  code: string | null;
  discount: string | null;
  value_total: number | null;
  value_used: number;
  value_currency: string | null;
  description: string | null;
  expires_on: string | null;
  needs_expiration: boolean;
  source_url: string | null;
  added_by: string | null;
  tags: string[];
  categorized_by: string;
  status: VoucherStatus;
  processing_error: string | null;
  is_used: boolean;
  category_slug: string;
  category_name: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherCategory {
  slug: string;
  name: string;
}

/** Either the created voucher, one still categorizing, or a question to answer first. */
export interface VoucherCreateResult {
  status: "created" | "processing" | "needs_clarification";
  voucher: Voucher | null;
  question: string | null;
  draft: Record<string, unknown> | null;
}

/** A regex that files a matching item with no LLM call. */
export interface VoucherRule extends BaseEntity {
  name: string;
  regex: string;
  ignore_case: boolean;
  category_name: string;
  category_slug: string;
  store: string | null;
  kind: VoucherKind;
  tags: string[];
  /** Lower runs first, so specific rules win over broad ones. */
  priority: number;
  enabled: boolean;
  created_at: string;
}

export interface RuleTestResult {
  matched: boolean;
  matched_rule?: string;
  extracted_code?: string | null;
  category?: string | null;
  store?: string | null;
  discount?: string | null;
  title?: string | null;
  error?: string;
}
