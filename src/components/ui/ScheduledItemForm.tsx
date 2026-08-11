"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

const PLATFORMS = ["telegram", "slack", "webex", "whatsapp"];

export interface ScheduledFormState {
  /** Main text field — "message" for reminders, "instruction" for monitors */
  text: string;
  platform: string;
  channel_id: string;
  authorized_ids: string[];
  scheduleType: "once" | "cron";
  run_at: string;
  cron: string;
}

export const EMPTY_SCHEDULED_FORM: ScheduledFormState = {
  text: "",
  platform: "telegram",
  channel_id: "",
  authorized_ids: [],
  scheduleType: "once",
  run_at: "",
  cron: "",
};

export function scheduledFormToPayload(
  f: ScheduledFormState,
  textKey: "message" | "instruction" | "content"
): Record<string, unknown> {
  return {
    [textKey]: f.text,
    platform: f.platform,
    channel_id: f.channel_id,
    authorized_ids: f.authorized_ids.filter(Boolean),
    run_at: f.scheduleType === "once" && f.run_at ? new Date(f.run_at).toISOString() : null,
    cron: f.scheduleType === "cron" && f.cron ? f.cron : null,
  };
}

/** Format a UTC Date as "YYYY-MM-DDTHH:MM" in the browser's local timezone,
 *  which is the value format expected by <input type="datetime-local">. */
function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function scheduledItemToForm(
  item: { platform: string; channel_id: string; authorized_ids?: string[]; user_id?: string; cron?: string | null; run_at?: string | null },
  textValue: string
): ScheduledFormState {
  const ids = item.authorized_ids?.length
    ? item.authorized_ids
    : item.user_id && item.user_id !== "web-user" ? [item.user_id] : [];
  return {
    text: textValue,
    platform: item.platform,
    channel_id: item.channel_id,
    authorized_ids: ids,
    scheduleType: item.cron ? "cron" : "once",
    run_at: item.run_at ? toLocalDateTimeInput(new Date(item.run_at)) : "",
    cron: item.cron ?? "",
  };
}

export function formatItemSchedule(item: { cron?: string | null; run_at?: string | null }): string {
  if (item.cron) return `Every: ${item.cron}`;
  if (item.run_at) return new Date(item.run_at).toLocaleString();
  return "—";
}

interface ScheduledItemFormProps {
  initial: ScheduledFormState;
  textLabel: string;
  textPlaceholder: string;
  onSave: (f: ScheduledFormState) => void;
  onCancel: () => void;
  saving: boolean;
  contacts: Array<{ canonical_id: string; name: string }>;
  defaultScheduleType?: "once" | "cron";
}

export function ScheduledItemForm({
  initial,
  textLabel,
  textPlaceholder,
  onSave,
  onCancel,
  saving,
  contacts,
}: ScheduledItemFormProps) {
  const [f, setF] = useState(initial);
  const set = (k: keyof Omit<ScheduledFormState, "authorized_ids">, v: string) =>
    setF((p) => ({ ...p, [k]: v }));
  const togglePerson = (id: string) =>
    setF((p) => ({
      ...p,
      authorized_ids: p.authorized_ids.includes(id)
        ? p.authorized_ids.filter((x) => x !== id)
        : [...p.authorized_ids, id],
    }));

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{textLabel}</label>
        <Input
          value={f.text}
          onChange={(e) => set("text", e.target.value)}
          placeholder={textPlaceholder}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
          <select
            value={f.platform}
            onChange={(e) => set("platform", e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Channel / Chat ID</label>
          <Input
            value={f.channel_id}
            onChange={(e) => set("channel_id", e.target.value)}
            placeholder="e.g. 123456789"
          />
        </div>
      </div>
      {contacts.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">People</label>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {contacts.map((c) => (
              <label key={c.canonical_id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={f.authorized_ids.includes(c.canonical_id)}
                  onChange={() => togglePerson(c.canonical_id)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Schedule</label>
        <div className="flex gap-2 mb-2">
          {(["once", "cron"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("scheduleType", t)}
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition-colors",
                f.scheduleType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground"
              )}
            >
              {t === "once" ? "One-time" : "Recurring (cron)"}
            </button>
          ))}
        </div>
        {f.scheduleType === "once" ? (
          <Input
            type="datetime-local"
            value={f.run_at}
            onChange={(e) => set("run_at", e.target.value)}
          />
        ) : (
          <Input
            value={f.cron}
            onChange={(e) => set("cron", e.target.value)}
            placeholder="e.g. 0 9 * * 1-5"
          />
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(f)} disabled={saving || !f.text.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}
