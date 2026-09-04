"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { Checkbox, LabeledInput, RoleBadge } from "./primitives";
import type { LlmProvider } from "./types";

// ─── Provider card ────────────────────────────────────────────────────────────

export function ProviderCard({
  idx,
  provider: p,
  onChange,
  onRemove,
  onDragStart,
  onDrop,
}: {
  idx: number;
  provider: LlmProvider;
  onChange: (patch: Partial<LlmProvider>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg border border-border bg-card"
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-4">
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {p.model || <span className="text-muted-foreground italic">Unnamed provider</span>}
          </p>
          {p.base_url && (
            <p className="text-xs text-muted-foreground truncate">{p.base_url}</p>
          )}
        </div>
        <RoleBadge role={p.role} />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Main fields — always visible */}
      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledInput
            label="Base URL"
            value={p.base_url}
            onChange={(v) => onChange({ base_url: v })}
            placeholder="https://api.openai.com/v1"
          />
          <LabeledInput
            label="Model"
            value={p.model}
            onChange={(v) => onChange({ model: v })}
            placeholder="gpt-4o"
          />
        </div>
        <LabeledInput
          label="API Key"
          value={p.api_key}
          onChange={(v) => onChange({ api_key: v })}
          placeholder="sk-…"
          type="password"
        />

        {/* Modalities */}
        <div className="flex flex-wrap gap-5 pt-1">
          <Checkbox
            id={`text-${idx}`}
            label="Text"
            checked={p.supports_text}
            onChange={(v) => onChange({ supports_text: v })}
          />
          <Checkbox
            id={`image-${idx}`}
            label="Images"
            checked={p.supports_image}
            onChange={(v) => onChange({ supports_image: v })}
          />
          <Checkbox
            id={`voice-${idx}`}
            label="Voice / Whisper"
            checked={p.supports_voice}
            onChange={(v) => onChange({ supports_voice: v })}
          />
        </div>
      </div>

      {/* Advanced — collapsible */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-dashed border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advanced</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Role</label>
              <select
                value={p.role}
                onChange={(e) => onChange({ role: e.target.value as LlmProvider["role"] })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="user">user — interactive requests only</option>
                <option value="background">background — async tasks only</option>
                <option value="any">any — both</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Controls which agent flows can use this provider.
              </p>
            </div>

            <LabeledInput
              label="Timeout (seconds)"
              value={String(p.timeout_seconds)}
              onChange={(v) => onChange({ timeout_seconds: parseFloat(v) || 60 })}
              type="number"
              inputProps={{ min: 5, max: 600, step: 5 }}
            />
          </div>

          {p.supports_voice && (
            <LabeledInput
              label="Voice Model"
              value={p.voice_model}
              onChange={(v) => onChange({ voice_model: v })}
              placeholder="whisper-1"
              hint='Whisper model name — only relevant when "Voice" is enabled'
            />
          )}
        </div>
      )}
    </div>
  );
}
