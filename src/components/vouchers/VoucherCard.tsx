"use client";

import { useState } from "react";
import { AlertTriangle, Copy, Check, ExternalLink, Pencil, Trash2, Wallet } from "lucide-react";
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
  onReprocess,
  onUpdate,
}: {
  voucher: Voucher;
  onSpend: (amount: number) => void;
  onDelete: () => void;
  onReprocess?: () => void;
  onUpdate?: (patch: { value_total?: number; source_url?: string }) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [spending, setSpending] = useState(false);
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editUrl, setEditUrl] = useState("");

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

  function openEditor() {
    // Seeded from what is already there, so this reads as a correction rather
    // than starting over.
    setEditValue(voucher.value_total !== null ? String(voucher.value_total) : "");
    setEditUrl(voucher.source_url ?? "");
    setEditing(true);
  }

  function submitEdit() {
    const patch: { value_total?: number; source_url?: string } = {};
    const value = Number(editValue);
    if (editValue.trim() && Number.isFinite(value) && value > 0) patch.value_total = value;
    if (editUrl.trim()) patch.source_url = editUrl.trim();
    if (Object.keys(patch).length > 0) onUpdate?.(patch);
    setEditing(false);
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
          <span
            className={cn(
              "rounded-full px-2 py-0.5",
              voucher.status === "failed"
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {voucher.status === "failed" ? "Couldn't file this one" : "Filing…"}
          </span>
        )}
        {/* A failed parse used to be a dead end; this is the way back. */}
        {voucher.status === "failed" && onReprocess && (
          <button onClick={onReprocess} className="underline text-muted-foreground hover:text-foreground">
            Try again
          </button>
        )}
        {voucher.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
        {voucher.source_url && (
          // noreferrer as well as noopener: the target is whatever the voucher
          // was pasted from, which is not necessarily somewhere trusted.
          <a
            href={voucher.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={voucher.source_url}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        )}
      </div>

      {/* Filling in what the parser could not know. A voucher added over
          Telegram usually arrives with neither a balance nor a link. */}
      {editing && (
        <div className="space-y-2 rounded-md border border-border p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0">Worth</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`Amount${currency ? ` in ${currency}` : ""}`}
              className="h-8"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14 shrink-0">Link</span>
            <Input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://…"
              className="h-8"
              onKeyDown={(e) => e.key === "Enter" && submitEdit()}
            />
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={submitEdit}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {remaining !== null && remaining > 0 && !spending && (
          <Button variant="ghost" size="sm" onClick={() => setSpending(true)}>
            <Wallet className="h-3.5 w-3.5 mr-1" /> Spend
          </Button>
        )}
        {onUpdate && !editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openEditor}
            title="Set what it's worth, or a link to redeem it"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {remaining === null && !voucher.source_url ? "Add value or link" : "Edit"}
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
