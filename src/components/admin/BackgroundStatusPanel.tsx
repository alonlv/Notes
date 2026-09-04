"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBackgroundStatus, useRouterMetrics } from "@/hooks/use-background-status";
import type { JobRun, JobStatus, RouterMetricsResponse } from "@/types/api";
import { Card } from "./primitives";

// ─── Background status panel ──────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtDuration(ms: number | null | undefined) {
  if (ms == null) return null;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: JobRun["status"] | null }) {
  if (!status) return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-muted text-muted-foreground">never</span>;
  const cls = {
    ok: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    skip: "bg-muted text-muted-foreground",
  }[status];
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider", cls)}>{status}</span>;
}

function JobCard({ name, data }: { name: string; data: JobStatus }) {
  const [open, setOpen] = useState(false);
  const lr = data.last_run;
  const dur = fmtDuration(lr?.duration_ms);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold break-all leading-tight">{name}</p>
        <StatusBadge status={lr?.status ?? null} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>Last run: <span className="text-foreground">{fmtDate(lr?.started_at)}</span></span>
        {dur && <span>Duration: <span className="text-foreground">{dur}</span></span>}
        {lr?.user_id && <span>User: <span className="text-foreground">{lr.user_id}</span></span>}
      </div>

      {/* Message */}
      {lr?.message && (
        <p className="text-xs bg-muted/50 rounded px-2.5 py-2 text-foreground/80 break-words leading-relaxed max-h-20 overflow-y-auto">
          {lr.message}
        </p>
      )}

      {/* Totals */}
      <div className="flex gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          ✓ {data.totals.ok} ok
        </span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          ✗ {data.totals.error} error
        </span>
        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
          → {data.totals.skip} skip
        </span>
      </div>

      {/* History toggle */}
      {data.recent.length > 0 && (
        <div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            History ({data.recent.length})
          </button>
          {open && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
              {data.recent.map((r, i) => (
                <HistoryRow key={i} run={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ run }: { run: JobRun }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0 text-xs">
      <span className="text-muted-foreground shrink-0 w-32">{fmtDate(run.started_at)}</span>
      <StatusBadge status={run.status} />
      <span className="text-foreground/70 flex-1 break-words leading-snug">{run.message || "—"}</span>
      {run.duration_ms != null && (
        <span className="text-muted-foreground shrink-0">{fmtDuration(run.duration_ms)}</span>
      )}
    </div>
  );
}

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "10s", value: 10_000 },
  { label: "30s", value: 30_000 },
  { label: "1 min", value: 60_000 },
];

function RouterMetricsSection({ metrics }: { metrics: RouterMetricsResponse | null }) {
  const cloud = metrics?.by_target?.cloud ?? 0;
  const local = metrics?.by_target?.local ?? 0;
  const total = metrics?.total ?? 0;
  const providers = metrics?.providers ?? [];

  return (
    <Card title="LLM Router">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cloud LLM</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{cloud}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Local (Ollama)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{local}</p>
        </div>
      </div>
      {providers.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">By provider</p>
          {providers.map((p) => (
            <div key={`${p.base_url}|${p.model}`} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs truncate flex-1">{p.model}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  p.target === "local"
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-blue-500/15 text-blue-500"
                )}
              >
                {p.target}
              </span>
              <span className="tabular-nums text-muted-foreground w-10 text-right">{p.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No LLM completions recorded yet. Send a chat message or fire the heartbeat to populate this.
        </p>
      )}
    </Card>
  );
}

export function BackgroundStatusPanel() {
  // react-query already does the fetching, the polling and the loading/error
  // bookkeeping this panel had been doing by hand — and the hooks for exactly
  // these two endpoints were already in the codebase, unused.
  const [refreshMs, setRefreshMs] = useState(30_000);
  const status = useBackgroundStatus(refreshMs);
  const metrics = useRouterMetrics(refreshMs);

  const jobs = Object.entries(status.data?.jobs ?? {});
  const refresh = () => { status.refetch(); metrics.refetch(); };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={refresh} disabled={status.isFetching}>
          <RotateCcw className={cn("h-3.5 w-3.5 mr-1.5", status.isFetching && "animate-spin")} />
          Refresh
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Auto-refresh:
          {REFRESH_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setRefreshMs(o.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs transition-colors",
                refreshMs === o.value
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {status.dataUpdatedAt > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            Updated {new Date(status.dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {status.error && <p className="text-sm text-destructive">{(status.error as Error).message}</p>}

      <RouterMetricsSection metrics={metrics.data ?? null} />

      {!status.error && jobs.length === 0 && !status.isLoading && (
        <Card>
          <p className="text-sm text-muted-foreground text-center py-4">
            No background jobs have run yet. Jobs are tracked after the first run.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {jobs.map(([name, status]) => (
          <JobCard key={name} name={name} data={status} />
        ))}
      </div>
    </div>
  );
}
