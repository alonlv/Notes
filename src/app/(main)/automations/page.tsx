"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Bell, Zap, Clock, RefreshCw, AlertCircle, Plus, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Md } from "@/components/ui/md";
import {
  ScheduledItemForm,
  EMPTY_SCHEDULED_FORM,
  scheduledFormToPayload,
  scheduledItemToForm,
  formatItemSchedule,
  type ScheduledFormState,
} from "@/components/ui/ScheduledItemForm";
import type { Automation, AutomationKind } from "@/types/api";
import { api } from "@/lib/api";
import { useContacts } from "@/hooks/use-contacts";
import { useSelectedUser } from "@/context/user-context";
import { cn } from "@/lib/utils";

const TABS: { kind: AutomationKind; label: string; icon: React.ElementType }[] = [
  { kind: "reminder", label: "Reminders", icon: Bell },
  { kind: "monitor", label: "Monitors", icon: Zap },
];

const EMPTY_MONITOR_FORM: ScheduledFormState = { ...EMPTY_SCHEDULED_FORM, scheduleType: "cron" };

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [activeKind, setActiveKind] = useState<AutomationKind>("reminder");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const { data: contacts = [] } = useContacts();
  const { selectedUserId, selectedUserName } = useSelectedUser();

  const { data: automations = [], isLoading, error } = useQuery<Automation[]>({
    queryKey: ["automations", selectedUserId],
    queryFn: () => api.automations.list(selectedUserId ?? undefined),
  });

  const items = automations.filter((a) => a.kind === activeKind);

  const create = useMutation({
    mutationFn: api.automations.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); setShowAdd(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.automations.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); setEditId(null); },
  });

  const del = useMutation({
    mutationFn: api.automations.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const writeError = create.error ?? update.error ?? del.error;

  function toForm(a: Automation): ScheduledFormState {
    return scheduledItemToForm(a, a.content);
  }

  function buildPayload(f: ScheduledFormState) {
    return { ...scheduledFormToPayload(f, "content", selectedUserId), kind: activeKind };
  }

  const isReminder = activeKind === "reminder";
  const Icon = isReminder ? Bell : Zap;
  const textLabel = isReminder ? "Message" : "Instruction";
  const textPlaceholder = isReminder
    ? "Reminder text…"
    : "e.g. Send me a news digest every 4 hours, filtered to what's relevant to me";
  const emptyForm = isReminder ? EMPTY_SCHEDULED_FORM : EMPTY_MONITOR_FORM;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          {selectedUserName && (
            <p className="text-xs text-primary mt-0.5">Viewing {selectedUserName}&apos;s automations</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["automations"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedUserId && (
            <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {TABS.map(({ kind, label, icon: TabIcon }) => (
          <button
            key={kind}
            onClick={() => { setActiveKind(kind); setShowAdd(false); setEditId(null); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeKind === kind
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <TabIcon className="h-3.5 w-3.5" />
            {label}
            <span className="ml-1 text-xs opacity-50">
              ({automations.filter((a) => a.kind === kind).length})
            </span>
          </button>
        ))}
      </div>

      {/* Errors / auth hint */}
      {(error || writeError) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ? "Could not load automations" : "Could not save"} — {(error ?? writeError)!.message}
        </div>
      )}

      {contacts.length > 0 && !selectedUserId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          Select a profile from the sidebar to view and manage automations.
        </div>
      )}

      {/* Add form */}
      {showAdd && selectedUserId && (
        <div className="mb-4">
          <ScheduledItemForm
            initial={emptyForm}
            textLabel={textLabel}
            textPlaceholder={textPlaceholder}
            onSave={(f) => create.mutate(buildPayload(f))}
            onCancel={() => setShowAdd(false)}
            saving={create.isPending}
            contacts={contacts}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : items.length === 0 && !showAdd ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active {activeKind === "reminder" ? "reminders" : "monitors"}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) =>
            editId === a.id ? (
              <ScheduledItemForm
                key={a.id}
                initial={toForm(a)}
                textLabel={textLabel}
                textPlaceholder={textPlaceholder}
                onSave={(f) => update.mutate({ id: a.id, body: buildPayload(f) })}
                onCancel={() => setEditId(null)}
                saving={update.isPending}
                contacts={contacts}
              />
            ) : (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <Md className="text-sm">{a.content}</Md>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatItemSchedule(a)}
                    </span>
                    {a.last_run_at && (
                      <span className="opacity-60">Last ran {new Date(a.last_run_at).toLocaleString()}</span>
                    )}
                    <span className="capitalize opacity-60">{a.platform}</span>
                    {(() => {
                      const ids = a.authorized_ids?.length ? a.authorized_ids : (a.owner_id || a.user_id) ? [a.owner_id || a.user_id] : [];
                      if (!ids.length) return null;
                      const names = ids.map((id) => contacts.find((c) => c.canonical_id === id)?.name ?? id.replace(/^person:/, ""));
                      return <span className="opacity-50 truncate">{names.join(", ")}</span>;
                    })()}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => { setEditId(a.id); setShowAdd(false); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                  onClick={() => del.mutate(a.id)} disabled={del.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
