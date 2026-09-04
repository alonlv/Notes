"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Card } from "./primitives";
import type { ToastFn } from "./types";

// ─── Memory panel ─────────────────────────────────────────────────────────────

export function MemoryPanel({
  toast,
}: {
  toast: ToastFn;
}) {
  const [running, setRunning] = useState(false);

  async function runConsolidation() {
    setRunning(true);
    try {
      await api.memoryAdmin.consolidate();
      toast("Memory consolidation started in background", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="How memory consolidation works">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every night at <strong>03:00</strong> (agent timezone) the system scans all memories for every
          user and uses the LLM to merge redundant or overlapping entries within each category. For example,
          two <em>ABOUT_ME</em> entries like <em>&quot;My name is Oded&quot;</em> and <em>&quot;I was born in 2000&quot;</em> become a
          single entry: <em>&quot;My name is Oded and I was born in 2000.&quot;</em>
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          Use the button below to run the job immediately without waiting for the nightly schedule.
          The job runs in the background — check the server logs for per-user merge counts.
        </p>
      </Card>

      <Card title="Run now">
        <Button onClick={runConsolidation} disabled={running}>
          {running ? "Starting…" : "Consolidate memories now"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This triggers the same job that runs every night at 03:00. It may take a minute to complete
          depending on how many users and memory entries exist.
        </p>
      </Card>
    </div>
  );
}
