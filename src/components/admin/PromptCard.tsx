"use client";

import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Prompt card ──────────────────────────────────────────────────────────────

export interface PromptVar {
  name: string;
  resolved: string;
  desc: string;
}

export function PromptCard({
  label,
  hint,
  vars,
  position,
  value,
  defaultValue,
  onChange,
  onSave,
  onReset,
}: {
  label: string;
  hint: string;
  vars: PromptVar[];
  position: string;
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const isDirty = value !== defaultValue && defaultValue !== "";

  function insertAtCursor(e: React.MouseEvent<HTMLButtonElement>, snippet: string) {
    e.preventDefault();
    const ta = document.activeElement as HTMLTextAreaElement | null;
    if (ta && ta.tagName === "TEXTAREA") {
      const start = ta.selectionStart ?? value.length;
      const end = ta.selectionEnd ?? value.length;
      const next = value.slice(0, start) + snippet + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + snippet.length;
        ta.focus();
      });
    } else {
      onChange(value + snippet);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        {isDirty && (
          <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
            modified
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{hint}</p>

      {/* Inline reference panel */}
      <div className="rounded-md bg-muted/50 border border-border px-3 py-2.5 mb-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Position</span>
          <span className="text-xs text-foreground font-mono">{position}</span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Format</span>
          <span className="text-xs text-muted-foreground">plain text or Markdown</span>
        </div>

        {vars.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Available placeholders — click to insert
            </p>
            <div className="flex flex-wrap gap-2">
              {vars.map((v) => (
                <button
                  key={v.name}
                  onMouseDown={(e) => insertAtCursor(e, v.name)}
                  className="group flex items-baseline gap-1.5 rounded border border-dashed border-border bg-background px-2 py-1 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <code className="text-xs font-mono text-primary group-hover:text-primary">{v.name}</code>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <span className="text-[10px] text-foreground font-medium">{v.resolved || "—"}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">({v.desc})</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No variable substitution in this section.</p>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">{value.length} chars · {value.split("\n").length} lines</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset to default
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
