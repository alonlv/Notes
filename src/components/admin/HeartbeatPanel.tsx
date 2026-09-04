"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Contact } from "@/types/api";
import { Card } from "./primitives";
import type { ToastFn } from "./types";

// ─── Heartbeat panel ──────────────────────────────────────────────────────────

const HEARTBEAT_EVENT =
  "Manual heartbeat test from Admin panel. Check if there is anything worth " +
  "reporting for this user right now.";

export function HeartbeatPanel({
  contacts,
  toast,
}: {
  contacts: Contact[];
  toast: ToastFn;
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [eventText, setEventText] = useState("");
  const [firing, setFiring] = useState(false);
  const [triggering, setTriggering] = useState(false);

  /** Both buttons do the same thing — push an event at one person. */
  async function fire(event: string, setBusy: (v: boolean) => void, done: string): Promise<boolean> {
    if (!selectedUser) return false;
    setBusy(true);
    try {
      await api.trigger(selectedUser, event);
      toast(done, "success");
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const fireHeartbeat = () =>
    fire(HEARTBEAT_EVENT, setFiring, "Heartbeat queued — check the user's messaging channel");

  async function pushTrigger() {
    const event = eventText.trim();
    if (!event) return;
    if (await fire(event, setTriggering, "Event pushed — agent is reasoning about it")) {
      setEventText("");
    }
  }

  return (
    <div className="space-y-6">
      <Card title="How heartbeat works">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The agent wakes up automatically at <strong>08:00, 12:00, and 18:00</strong> (agent timezone) for every
          contact that has a primary channel set. It checks overdue tasks, due-soon tasks, and calendar events,
          then sends a message <em>only if there is something genuinely actionable</em>. If nothing is worth
          reporting it stays silent.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          The <strong>external trigger</strong> endpoint (<code className="text-xs bg-muted px-1 py-0.5 rounded">/trigger/&#123;user_id&#125;</code>) lets
          external services (Zapier, monitoring tools, webhooks) push events. The agent reasons about the event
          and sends a message only when it warrants the user&apos;s attention.
        </p>
      </Card>

      <Card title="Test for a user">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— select a contact —</option>
              {contacts.map((c) => (
                <option key={c.canonical_id} value={c.canonical_id}>
                  {c.name} ({c.canonical_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedUser || firing}
              onClick={fireHeartbeat}
            >
              {firing ? "Firing…" : "Fire heartbeat now"}
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Push external event
            </label>
            <textarea
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              placeholder="Describe an event, e.g. 'Server CPU spiked to 95% for 10 minutes'"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
            <Button
              size="sm"
              className="mt-2"
              disabled={!selectedUser || !eventText.trim() || triggering}
              onClick={pushTrigger}
            >
              {triggering ? "Pushing…" : "Push event"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
