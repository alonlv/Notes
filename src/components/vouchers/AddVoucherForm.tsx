"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface VoucherFormValues {
  raw_text: string;
  store?: string;
  code?: string;
  discount?: string;
  expires_on?: string;
  no_expiration?: boolean;
  household: boolean;
}

/**
 * Paste-and-go: the backend parses free text into structured fields, so the
 * only thing usually worth typing is what the voucher says.
 *
 * The scope toggle defaults to Household — a gift card belongs to the house,
 * not to whoever happened to enter it.
 */
export function AddVoucherForm({
  onSubmit,
  onCancel,
  saving,
  question,
}: {
  onSubmit: (values: VoucherFormValues) => void;
  onCancel: () => void;
  saving?: boolean;
  /** Set when the backend replied needs_clarification and wants an expiry. */
  question?: string | null;
}) {
  const [rawText, setRawText] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [noExpiration, setNoExpiration] = useState(false);
  const [household, setHousehold] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [store, setStore] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");

  function submit() {
    if (!rawText.trim()) return;
    onSubmit({
      raw_text: rawText.trim(),
      store: store.trim() || undefined,
      code: code.trim() || undefined,
      discount: discount.trim() || undefined,
      expires_on: expiresOn || undefined,
      no_expiration: noExpiration || undefined,
      household,
    });
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Paste the voucher — e.g. “Zara gift card 200₪ code ZR8891 valid until 2/3/2027”"
        rows={3}
        autoFocus
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      {question && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          {question}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Expires</span>
          <Input
            type="date"
            value={expiresOn}
            onChange={(e) => {
              setExpiresOn(e.target.value);
              if (e.target.value) setNoExpiration(false);
            }}
            className="h-8 w-40"
            disabled={noExpiration}
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={noExpiration}
            onChange={(e) => {
              setNoExpiration(e.target.checked);
              if (e.target.checked) setExpiresOn("");
            }}
          />
          Never expires
        </label>
      </div>

      {/* Scope toggle — household is the default for vouchers. */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1 w-fit">
        {[
          { value: true, label: "Household" },
          { value: false, label: "Just me" },
        ].map(({ value, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => setHousehold(value)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              household === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!showDetails ? (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Add details manually
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" />
          <Input
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="Value, e.g. 200₪"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving || !rawText.trim()}>
          {saving ? "Saving…" : "Add"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
