"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AutomationKind } from "@/types/api";

export function useAutomations(kind?: AutomationKind) {
  return useQuery({
    queryKey: ["automations", kind ?? null],
    queryFn: () => api.automations.list(kind),
  });
}
