"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Priority, Task, TaskStatus } from "@/types/api";

export function useTasks(tag?: string) {
  return useQuery({
    queryKey: ["tasks", tag ?? null],
    queryFn: () => api.tasks.list(tag),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tasks", "tags"],
    queryFn: () => api.tasks.listTags(),
    staleTime: 30_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; status?: TaskStatus; priority?: Priority; tags?: string[]; due_date?: string }) =>
      api.tasks.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

type TaskUpdateArgs = { id: string } & Partial<{
  title: string;
  done: boolean;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  due_date: string;
  clear_due_date: boolean;
  authorized_ids: string[];
}>;

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: TaskUpdateArgs) => api.tasks.update(id, body),
    onMutate: async ({ id, done, status, priority, tags }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => {
          if (t.id !== id) return t;
          const newStatus = status ?? (done !== undefined ? (done ? "done" : "todo") : t.status);
          return {
            ...t,
            status: newStatus,
            ...(priority !== undefined && { priority }),
            ...(tags !== undefined && { tags }),
          };
        }) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.tasks.delete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => old?.filter((t) => t.id !== id) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
