"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** The backend's rolling feed of failed API calls — its own routes, the LLM
 *  providers, and anything else that logged an error. Polled often enough that
 *  a broken assistant explains itself before the user has to go read logs. */
export function useApiErrors(limit = 25, source?: string) {
  return useQuery({
    queryKey: ["api-errors", limit, source ?? ""],
    queryFn: () => api.apiErrors.get(limit, source),
    refetchInterval: 30_000,
  });
}

export function useClearApiErrors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.apiErrors.clear,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-errors"] }),
  });
}
