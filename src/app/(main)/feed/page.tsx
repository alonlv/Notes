"use client";

import { Sparkles, RefreshCw } from "lucide-react";
import { useBackgroundStatus, flattenRuns } from "@/hooks/use-background-status";
import { Md } from "@/components/ui/md";
import { cn } from "@/lib/utils";
import { fmtDateTime, jobLabel } from "@/lib/jobs";

const STATUS_DOT: Record<string, string> = {
  ok: "bg-emerald-500",
  skip: "bg-muted-foreground/40",
  error: "bg-red-500",
};

export default function FeedPage() {
  const { data, isLoading, refetch, isFetching } = useBackgroundStatus();
  const runs = flattenRuns(data?.jobs);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
      <header className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Inbox</h1>
        <p className="text-xs text-muted-foreground ml-1 hidden sm:block">
          What the assistant has been doing on its own
        </p>
        <button
          onClick={() => refetch()}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : runs.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nothing yet. Check-ins (8:00 / 12:00 / 18:00) and your monitors will appear here.
          </p>
        </div>
      ) : (
        <ol className="space-y-1">
          {runs.map((r, i) => (
            <li key={i} className="flex gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", STATUS_DOT[r.status] ?? "bg-muted-foreground/40")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{jobLabel(r.job_name)}</span>
                  <span>· {fmtDateTime(r.started_at)}</span>
                  {r.status === "error" && <span className="text-red-500">· failed</span>}
                </div>
                {r.message ? (
                  <div className="mt-0.5 text-sm text-foreground/90"><Md className="text-sm">{r.message}</Md></div>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground italic">
                    {r.status === "skip" ? "Checked — nothing worth interrupting you for." : "Ran."}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
