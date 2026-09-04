/** How a background job reads to a person, rather than to the scheduler. */
export const JOB_LABELS: Record<string, string> = {
  heartbeat: "Check-in",
  heartbeat_cycle: "Check-in",
  proactive_task: "Monitor",
  trigger: "Event",
  reminder: "Reminder",
  memory_optimizer: "Memory tidy-up",
};

export function jobLabel(jobName: string): string {
  return JOB_LABELS[jobName] ?? jobName;
}

/** Just the clock — for something that already reads as today's. */
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** The time when it happened today, the date when it did not. */
export function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? fmtTime(iso)
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Date and time together, for a list spanning several days. */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
