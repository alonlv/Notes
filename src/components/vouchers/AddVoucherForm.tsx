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
  value_total?: number;
  value_currency?: string;
  source_url?: string;
  expires_on?: string;
  no_expiration?: boolean;
  household: boolean;
}

const CURRENCIES = ["₪", "$", "€", "£"];

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
  const [valueTotal, setValueTotal] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [sourceUrl, setSourceUrl] = useState("");

  const amount = Number(valueTotal);
  const amountIsValid = !valueTotal.trim() || (Number.isFinite(amount) && amount > 0);
  // Checked here rather than left to the backend so a typo is caught while the
  // form is still open and the text is still in front of you.
  const urlIsValid = !sourceUrl.trim() || /^https?:\/\/\S+$/i.test(sourceUrl.trim());

  function submit() {
    if (!rawText.trim() || !amountIsValid || !urlIsValid) return;
    onSubmit({
      raw_text: rawText.trim(),
      store: store.trim() || undefined,
      code: code.trim() || undefined,
      discount: discount.trim() || undefined,
      // A balance is what makes Spend work; without it the card can only show
      // the discount text and the Spend button never appears.
      value_total: valueTotal.trim() ? amount : undefined,
      value_currency: valueTotal.trim() ? currency : undefined,
      source_url: sourceUrl.trim() || undefined,
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
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store" />
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" />
            <Input
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="Discount, e.g. 20% off"
            />
          </div>

          {/* Balance. Entering one turns on the remaining-value display and the
              Spend button; a coupon ("20% off") has none, so this stays empty. */}
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={valueTotal}
              onChange={(e) => setValueTotal(e.target.value)}
              placeholder="Amount to track, e.g. 200"
              className="flex-1"
              aria-invalid={!amountIsValid}
            />
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              {CURRENCIES.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setCurrency(symbol)}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium transition-colors",
                    currency === symbol
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
          {!amountIsValid && (
            <p className="text-xs text-destructive">Enter a positive number, or leave it blank.</p>
          )}

          <Input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Link to the voucher (optional)"
            aria-invalid={!urlIsValid}
          />
          {!urlIsValid ? (
            <p className="text-xs text-destructive">
              That doesn&apos;t look like a link — it should start with http:// or https://.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              A link in the pasted text is picked up automatically; fill this in to override it.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={submit}
          disabled={saving || !rawText.trim() || !amountIsValid || !urlIsValid}
        >
          {saving ? "Saving…" : "Add"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
