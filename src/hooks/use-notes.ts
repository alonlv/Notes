"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Note } from "@/types/api";

export function useNotes(topic?: string) {
  return useQuery({
    queryKey: ["notes", topic ?? null],
    queryFn: () => api.notes.list(topic),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content?: string; topic: string; title?: string }) =>
      api.notes.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string } & Partial<{ title: string; content: string; topic: string; authorized_ids: string[] }>) =>
      api.notes.update(id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.setQueryData<Note>(["note", updated.id], updated);
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.notes.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ["note", id],
    queryFn: () => api.notes.get(id),
    enabled: Boolean(id),
  });
}
