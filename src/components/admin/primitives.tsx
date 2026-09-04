"use client";

import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LlmProvider } from "./types";

// ─── Shared primitives ────────────────────────────────────────────────────────

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {title && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider -mb-1">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function SaveRow({
  label,
  hint,
  value,
  onChange,
  onSave,
  onReset,
  placeholder,
  type = "text",
  inputProps,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onReset: () => void;
  placeholder?: string;
  type?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSave();
  }
  return (
    <div>
      <label className="block text-sm font-medium mb-0.5">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
      <div className="flex gap-2 items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={cn(
            "rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            type === "number" ? "w-32" : "flex-1"
          )}
          {...inputProps}
        />
        <Button size="sm" onClick={onSave}>
          <Save className="h-3.5 w-3.5 mr-1" />Save
        </Button>
        <Button size="sm" variant="outline" onClick={onReset} title="Reset to default">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  inputProps,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        {...inputProps}
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-primary cursor-pointer"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function RoleBadge({ role }: { role: LlmProvider["role"] }) {
  const colors: Record<LlmProvider["role"], string> = {
    user: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    background: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    any: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", colors[role])}>
      {role}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const colors: Record<string, string> = {
    telegram: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    slack: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    webex: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium tracking-wider uppercase", colors[p] || "bg-muted text-muted-foreground")}>
      {platform}
    </span>
  );
}
