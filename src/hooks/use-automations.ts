"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useContacts } from "@/hooks/use-contacts";
import { useSelectedUser } from "@/context/user-context";
import type { Automation, AutomationKind, Task } from "@/types/api";

export function useAutomations(userId?: string, kind?: AutomationKind) {
  return useQuery({
    queryKey: ["automations", userId ?? null, kind ?? null],
    queryFn: () => api.automations.list(userId, kind),
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.automations.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.automations.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });
}

/**
 * Reminders raised from tasks, keyed by task id.
 *
 * A task's due date never notifies anyone on its own — a reminder is the only thing
 * that reaches the user, so this is what tells a task row whether it will actually ping.
 */
export function useTaskReminders() {
  const { selectedUserId } = useSelectedUser();
  const { data: reminders = [] } = useAutomations(selectedUserId || undefined, "reminder");
  const byTask = new Map<string, Automation>();
  for (const r of reminders) {
    if (r.task_id) byTask.set(r.task_id, r);
  }
  return byTask;
}

/**
 * Raise a reminder for a task at a given time.
 *
 * Delivery goes to the person's primary channel when we know it, falling back to the
 * same defaults the Automations form uses.
 */
export function useSetTaskReminder() {
  const { selectedUserId } = useSelectedUser();
  const { data: contacts = [] } = useContacts();
  const create = useCreateAutomation();

  function setReminder(task: Task, when: Date) {
    const owner = selectedUserId || task.owner_id || task.user_id || "web-user";
    const channel = contacts.find((c) => c.canonical_id === owner)?.primary_channel;
    return create.mutateAsync({
      kind: "reminder",
      content: task.title,
      platform: channel?.platform ?? "telegram",
      channel_id: channel?.channel_id ?? "",
      user_id: owner,
      authorized_ids: [owner],
      run_at: when.toISOString(),
      task_id: task.id,
    });
  }

  return { setReminder, isPending: create.isPending };
}
