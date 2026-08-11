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

/** Status of the user's connected REAL calendars (Google / Apple). */
export interface CalendarConnectionStatus {
  user_id: string;
  google: boolean;
  apple: boolean;
  apple_username: string;
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
