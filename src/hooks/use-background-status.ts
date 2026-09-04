"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { JobRun } from "@/types/api";

/** Pass 0 to stop polling — the admin panel lets the reader choose the rate. */
export function useBackgroundStatus(refetchInterval: number | false = 60_000) {
  return useQuery({
    queryKey: ["background-status"],
    queryFn: () => api.backgroundStatus.get(),
    refetchInterval: refetchInterval || false,
  });
}

export function useRouterMetrics(refetchInterval: number | false = 30_000) {
  return useQuery({
    queryKey: ["router-metrics"],
    queryFn: () => api.routerMetrics.get(),
    refetchInterval: refetchInterval || false,
  });
}

/** Flatten every job's recent runs into one timeline, newest first. */
export function flattenRuns(jobs: Record<string, { recent: JobRun[] }> | undefined): JobRun[] {
  if (!jobs) return [];
  const runs = Object.values(jobs).flatMap((j) => j.recent ?? []);
  runs.sort((a, b) => b.started_at.localeCompare(a.started_at));
  return runs;
}

/** Runs that actually reached out to the user (have a message). */
export function notifyingRuns(jobs: Record<string, { recent: JobRun[] }> | undefined): JobRun[] {
  return flattenRuns(jobs).filter((r) => r.message && r.message.trim().length > 0);
}
