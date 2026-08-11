"use client";

import { useState } from "react";
import { AlertTriangle, Copy, Check, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Voucher } from "@/types/api";

/** Days until expiry, or null when it never expires / isn't known yet. */
function daysUntil(expiresOn: string | null): number | null {
  if (!expiresOn) return null;
  const days = Math.ceil(
    (new Date(expiresOn).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return Number.isFinite(days) ? days : null;
}

function expiryLabel(voucher: Voucher): { text: string; urgent: boolean } | null {
  if (voucher.needs_expiration) return { text: "Expiry unknown", urgent: true };
  const days = daysUntil(voucher.expires_on);
  if (days === null) return null;
  if (days < 0) return { text: "Expired", urgent: true };
  if (days === 0) return { text: "Expires today", urgent: true };
  if (days <= 30) return { text: `${days} day${days === 1 ? "" : "s"} left`, urgent: true };
  return { text: `Expires ${voucher.expires_on}`, urgent: false };
}

export function VoucherCard({
  voucher,
  onSpend,
  onDelete,
}: {
  voucher: Voucher;
  onSpend: (amount: number) => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [spending, setSpending] = useState(false);
  const [amount, setAmount] = useState("");

  const expiry = expiryLabel(voucher);
  const remaining =
    voucher.value_total !== null ? voucher.value_total - voucher.value_used : null;
  const currency = voucher.value_currency ?? "";

  async function copyCode() {
    if (!voucher.code) return;
    await navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function submitSpend() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    onSpend(value);
    setAmount("");
    setSpending(false);
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-4 space-y-3",
        voucher.is_used && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium truncate">{voucher.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[voucher.store, voucher.category_name].filter(Boolean).join(" · ") ||
              "Uncategorized"}
          </p>
        </div>
        <div className="text-right shrink-0">
          {remaining !== null ? (
            <p className="font-semibold tabular-nums">
              {remaining.toLocaleString()}
              {currency}
            </p>
          ) : (
            voucher.discount && <p className="font-semibold">{voucher.discount}</p>
          )}
          {remaining !== null && voucher.value_used > 0 && (
            <p className="text-[10px] text-muted-foreground">
              of {voucher.value_total?.toLocaleString()}
              {currency}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        {expiry && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
              expiry.urgent
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {expiry.urgent && <AlertTriangle className="h-3 w-3" />}
            {expiry.text}
          </span>
        )}
        {voucher.status !== "ready" && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {voucher.status === "failed" ? "Categorization failed" : "Categorizing…"}
          </span>
        )}
        {voucher.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      {voucher.code && (
        <button
          onClick={copyCode}
          className="flex items-center gap-2 rounded border border-border px-2 py-1 font-mono text-sm hover:bg-accent transition-colors"
          title="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {voucher.code}
        </button>
      )}

      <div className="flex items-center gap-2">
        {remaining !== null && remaining > 0 && !spending && (
          <Button variant="ghost" size="sm" onClick={() => setSpending(true)}>
            <Wallet className="h-3.5 w-3.5 mr-1" /> Spend
          </Button>
        )}
        {spending && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="h-8 w-24"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submitSpend()}
            />
            <Button size="sm" onClick={submitSpend}>
              Record
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSpending(false)}>
              Cancel
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
