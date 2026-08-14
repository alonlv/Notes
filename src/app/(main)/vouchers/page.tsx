"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, Search, Ticket } from "lucide-react";
import { AddVoucherForm, type VoucherFormValues } from "@/components/vouchers/AddVoucherForm";
import { RuleManager } from "@/components/vouchers/RuleManager";
import { VoucherCard } from "@/components/vouchers/VoucherCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useCreateVoucher,
  useDeleteVoucher,
  useReprocessVoucher,
  useSpendVoucher,
  useVouchers,
} from "@/hooks/use-vouchers";

export default function VouchersPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [includeUsed, setIncludeUsed] = useState(false);
  // Set when the backend asks for an expiry before it will save.
  const [question, setQuestion] = useState<string | null>(null);

  const { data: vouchers = [], isLoading, error } = useVouchers(includeUsed);
  const create = useCreateVoucher();
  const spend = useSpendVoucher();
  const remove = useDeleteVoucher();
  const reprocess = useReprocessVoucher();

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vouchers) {
      const name = v.category_name || "Uncategorized";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [vouchers]);

  const visible = vouchers.filter((v) => {
    if (category && (v.category_name || "Uncategorized") !== category) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [v.title, v.store, v.code, v.description, ...v.tags]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q));
  });

  async function handleSubmit(values: VoucherFormValues) {
    const result = await create.mutateAsync(values);
    if (result.status === "needs_clarification") {
      // Keep the form open with the question so the expiry can be supplied.
      setQuestion(result.question);
      return;
    }
    setQuestion(null);
    setShowAdd(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Wallet</h1>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowAdd((open) => !open);
            setQuestion(null);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {showAdd && (
        <div className="mb-4">
          <AddVoucherForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowAdd(false);
              setQuestion(null);
            }}
            saving={create.isPending}
            question={question}
          />
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Could not load the wallet.
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the wallet"
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <input
            type="checkbox"
            checked={includeUsed}
            onChange={(e) => setIncludeUsed(e.target.checked)}
          />
          Show used
        </label>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              !category ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            All ({vouchers.length})
          </button>
          {categories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCategory(name === category ? null : name)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                category === name
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {vouchers.length === 0
            ? "No vouchers yet. Paste a gift card or coupon and it will be filed for you."
            : "Nothing matches that search."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((voucher) => (
            <VoucherCard
              key={voucher.id}
              voucher={voucher}
              onSpend={(amount) => spend.mutate({ id: voucher.id, amount })}
              onDelete={() => remove.mutate(voucher.id)}
              onReprocess={() => reprocess.mutate(voucher.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <RuleManager />
      </div>
    </div>
  );
}
