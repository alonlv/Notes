"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useVouchers(includeUsed = false) {
  return useQuery({
    queryKey: ["vouchers", includeUsed],
    queryFn: () => api.vouchers.list(includeUsed),
  });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.vouchers.create,
    // A "needs_clarification" result is a successful call that saved nothing,
    // but refetching is harmless and keeps the list honest either way.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers"] }),
  });
}

export function useSpendVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.vouchers.spend(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers"] }),
  });
}

export function useDeleteVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.vouchers.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers"] }),
  });
}

/** Re-run categorization on a voucher that failed or was parsed badly. */
export function useReprocessVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.vouchers.reprocess,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vouchers"] }),
  });
}
