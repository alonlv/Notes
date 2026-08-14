"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronDown, ChevronRight, FlaskConical, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RuleTestResult, VoucherRule } from "@/types/api";

/**
 * Manage regex recognition rules.
 *
 * An item matching one of these is filed instantly with no LLM call, so a
 * recurring format ("askbuf28373") never costs a model request again. Rules run
 * lowest-priority-first, which is how a specific rule beats a broad one.
 */
export function RuleManager() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["voucher-rules"],
    queryFn: api.voucherRules.list,
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["voucher-rules"] });
    qc.invalidateQueries({ queryKey: ["vouchers"] });
  };

  const create = useMutation({ mutationFn: api.voucherRules.create, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.voucherRules.update(id, body),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: api.voucherRules.delete, onSuccess: invalidate });

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Recognition rules
        <span className="ml-auto text-xs text-muted-foreground">
          {open ? "" : "file known formats instantly, with no AI call"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <RuleForm
            onSave={(values) => create.mutate(values)}
            saving={create.isPending}
            error={create.error instanceof Error ? create.error.message : null}
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rules yet. Add one for a code format you receive often — it will be filed
              without asking the model.
            </p>
          ) : (
            <ul className="space-y-2">
              {rules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onToggle={() => update.mutate({ id: rule.id, enabled: !rule.enabled })}
                  onDelete={() => remove.mutate(rule.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: VoucherRule;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded border border-border px-3 py-2 text-sm",
        !rule.enabled && "opacity-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{rule.name}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
            {rule.category_name}
          </span>
          {rule.store && (
            <span className="text-xs text-muted-foreground truncate">→ {rule.store}</span>
          )}
        </div>
        <code className="text-xs text-muted-foreground break-all">/{rule.regex}/</code>
      </div>
      <button
        onClick={onToggle}
        className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        title={rule.enabled ? "Disable this rule" : "Enable this rule"}
      >
        {rule.enabled ? "On" : "Off"}
      </button>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive shrink-0"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function RuleForm({
  onSave,
  saving,
  error,
}: {
  onSave: (values: { name: string; regex: string; category_name: string; store?: string }) => void;
  saving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [regex, setRegex] = useState("");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [sample, setSample] = useState("");
  const [result, setResult] = useState<RuleTestResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const test = useMutation({
    mutationFn: () => api.voucherRules.test(sample.trim(), regex.trim()),
    onSuccess: setResult,
  });

  function submit() {
    if (!name.trim() || !regex.trim() || !category.trim()) {
      setLocalError("Name, pattern and category are all required.");
      return;
    }
    setLocalError(null);
    onSave({
      name: name.trim(),
      regex: regex.trim(),
      category_name: category.trim(),
      store: store.trim() || undefined,
    });
    setName("");
    setRegex("");
    setCategory("");
    setStore("");
    setResult(null);
  }

  return (
    <div className="space-y-2 rounded border border-border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
        <Input
          value={regex}
          onChange={(e) => setRegex(e.target.value)}
          placeholder="Pattern, e.g. askbuf\d+"
          className="font-mono"
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="File under (category)"
        />
        <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store (optional)" />
      </div>

      {/* Try it before saving — a rule you cannot test is a rule you guess at. */}
      <div className="flex gap-2">
        <Input
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          placeholder="Try it against some text…"
          onKeyDown={(e) => e.key === "Enter" && sample.trim() && regex.trim() && test.mutate()}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => test.mutate()}
          disabled={!sample.trim() || !regex.trim() || test.isPending}
        >
          <FlaskConical className="h-3.5 w-3.5 mr-1" /> Test
        </Button>
      </div>

      {result && <TestResult result={result} />}

      {(localError || error) && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {localError ?? error}
        </p>
      )}

      <Button size="sm" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Add rule"}
      </Button>
    </div>
  );
}

function TestResult({ result }: { result: RuleTestResult }) {
  if (result.error) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-destructive">
        <X className="h-3.5 w-3.5 shrink-0" />
        {result.error}
      </p>
    );
  }
  if (!result.matched) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <X className="h-3.5 w-3.5 shrink-0" />
        No match.
      </p>
    );
  }
  const extracted = [
    result.extracted_code && `code ${result.extracted_code}`,
    result.store && `store ${result.store}`,
    result.discount && `value ${result.discount}`,
  ].filter(Boolean);

  return (
    <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
      <Check className="h-3.5 w-3.5 shrink-0" />
      Match{result.matched_rule ? ` (${result.matched_rule})` : ""}
      {extracted.length > 0 && ` — ${extracted.join(" · ")}`}
    </p>
  );
}
