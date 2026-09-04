"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiErrors, useClearApiErrors } from "@/hooks/use-api-errors";
import { cn } from "@/lib/utils";
import type { ApiErrorEvent, ApiErrorSource } from "@/types/api";

const SOURCE_LABELS: Record<ApiErrorSource, string> = {
  http: "This API",
  llm: "LLM provider",
  app: "Integration",
};

const SOURCE_STYLES: Record<ApiErrorSource, string> = {
  http: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  llm: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  app: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const FILTERS: { label: string; value: "" | ApiErrorSource }[] = [
  { label: "All", value: "" },
  { label: "This API", value: "http" },
  { label: "LLM", value: "llm" },
  { label: "Integrations", value: "app" },
];

export function SourceTag({ source }: { source: ApiErrorSource }) {
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0",
        SOURCE_STYLES[source] ?? "bg-muted text-muted-foreground"
      )}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

export function fmtErrorTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** Headline for one error: the exception, its status, and where it came from. */
function ErrorTitle({ error }: { error: ApiErrorEvent }) {
  return (
    <span className="flex items-center gap-2 flex-wrap">
      <SourceTag source={error.source} />
      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
        {error.error_type}
        {error.status_code != null && ` · ${error.status_code}`}
      </span>
      <span className="text-xs text-muted-foreground font-mono truncate max-w-full">{error.label}</span>
      {error.count > 1 && (
        <span className="text-[11px] text-red-500 font-medium">×{error.count}</span>
      )}
    </span>
  );
}

/** The message the failing API actually returned — the part worth reading. */
function ErrorMessage({ error }: { error: ApiErrorEvent }) {
  return (
    <p className="text-xs font-mono bg-muted/60 rounded px-2.5 py-2 text-foreground/90 break-words whitespace-pre-wrap max-h-40 overflow-y-auto">
      {error.message}
    </p>
  );
}

function ErrorMeta({ error }: { error: ApiErrorEvent }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
      <span>{fmtErrorTime(error.at)}</span>
      {error.detail && <span>{error.detail}</span>}
      {error.user_id && <span>user: {error.user_id}</span>}
    </div>
  );
}

/** Compact banner for the home dashboard — renders nothing when all is well. */
export function LatestApiError({ className }: { className?: string }) {
  const { data } = useApiErrors(1);
  const latest = data?.latest;
  if (!latest) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-red-500/40 bg-red-500/5 p-4 space-y-2",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Latest API error
        </h2>
        <a
          href="/admin?tab=errors"
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          Details
        </a>
      </div>
      <ErrorTitle error={latest} />
      <ErrorMessage error={latest} />
      <ErrorMeta error={latest} />
    </section>
  );
}

function ErrorRow({ error }: { error: ApiErrorEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0 py-2.5 space-y-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start gap-2"
      >
        <span className="text-xs text-muted-foreground shrink-0 w-32 pt-0.5">
          {fmtErrorTime(error.at)}
        </span>
        <span className="flex-1 min-w-0 space-y-1">
          <ErrorTitle error={error} />
          {!open && (
            <span className="block text-xs text-foreground/70 truncate">{error.message}</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>
      {open && (
        <div className="pl-0 sm:pl-[8.5rem] space-y-1.5">
          <ErrorMessage error={error} />
          <ErrorMeta error={error} />
        </div>
      )}
    </div>
  );
}

/** Full feed for the admin dashboard: newest error broken out, then the history. */
export function ApiErrorsPanel() {
  const [source, setSource] = useState<"" | ApiErrorSource>("");
  const { data, isFetching, error, refetch } = useApiErrors(50, source || undefined);
  const clear = useClearApiErrors();

  const latest = data?.latest ?? null;
  const earlier = (data?.recent ?? []).slice(1);
  const bySource = data?.by_source ?? {};

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RotateCcw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSource(f.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs transition-colors",
                source === f.value
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {f.value && bySource[f.value] ? ` (${bySource[f.value]})` : ""}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => clear.mutate()}
          disabled={clear.isPending || !data?.total}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {!latest ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No API errors recorded{source ? " for this source" : ""} since the backend last
            restarted.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Most recent
            </p>
            <ErrorTitle error={latest} />
            <ErrorMessage error={latest} />
            <ErrorMeta error={latest} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">Earlier errors</h3>
              <span className="text-xs text-muted-foreground">{data?.total ?? 0} recorded</span>
            </div>
            {earlier.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                Nothing else — this is the only error on record.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {earlier.map((e, i) => (
                  <ErrorRow key={`${e.first_at}-${i}`} error={e} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
