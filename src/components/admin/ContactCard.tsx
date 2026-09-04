"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/types/api";
import { LabeledInput, PlatformBadge } from "./primitives";
import { DEFAULT_PROVIDER, type LlmProvider } from "./types";
import { platformOptions } from "@/lib/platforms";

// ─── Contact card ─────────────────────────────────────────────────────────────

export function ContactCard({
  contact: c,
  onRemove,
  onAddIdentity,
  onRemoveIdentity,
  onSetPrimaryChannel,
  onSaveData,
}: {
  contact: Contact;
  onRemove: () => void;
  onAddIdentity: (platform: string, id: string, label: string) => void;
  onRemoveIdentity: (platform: string, id: string) => void;
  onSetPrimaryChannel: (platform: string, channelId: string) => void;
  onSaveData: (data: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newPlatform, setNewPlatform] = useState("telegram");
  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [channelPlatform, setChannelPlatform] = useState("telegram");
  const [channelId, setChannelId] = useState("");

  // Per-user model override state
  const existingProviders = (c.attributes?.llm_providers as LlmProvider[] | undefined) ?? [];
  const hasModelOverride = existingProviders.length > 0;
  const [showModelOverride, setShowModelOverride] = useState(false);
  const [overrideBaseUrl, setOverrideBaseUrl] = useState(existingProviders[0]?.base_url ?? "");
  const [overrideModel, setOverrideModel] = useState(existingProviders[0]?.model ?? "");
  const [overrideApiKey, setOverrideApiKey] = useState(existingProviders[0]?.api_key ?? "");

  function saveModelOverride() {
    if (!overrideBaseUrl.trim() || !overrideModel.trim() || !overrideApiKey.trim()) return;
    const provider: LlmProvider = {
      ...DEFAULT_PROVIDER,
      base_url: overrideBaseUrl.trim(),
      model: overrideModel.trim(),
      api_key: overrideApiKey.trim(),
    };
    onSaveData({ ...(c.attributes ?? {}), llm_providers: [provider] });
    setShowModelOverride(false);
  }

  function clearModelOverride() {
    const rest = { ...(c.attributes ?? {}) };
    delete rest.llm_providers;
    onSaveData(rest);
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xl">👤</span>
        <span className="font-semibold text-sm flex-1">{c.name}</span>
        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
          {c.canonical_id}
        </span>
        <span className="text-xs text-muted-foreground w-24 text-right">
          {c.identities?.length || 0} identit{(c.identities?.length === 1) ? 'y' : 'ies'} ▾
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-muted-foreground hover:text-destructive transition-colors ml-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          {(c.identities || []).length === 0 ? (
            <p className="text-xs text-muted-foreground mb-3">No identities yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {c.identities.map((id) => (
                <div key={`${id.platform}-${id.id}`} className="flex items-center gap-2 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                  <PlatformBadge platform={id.platform} />
                  <span className="font-mono text-xs flex-1">{id.id}</span>
                  <span className="text-xs text-muted-foreground w-24 truncate">{id.label}</span>
                  <button
                    onClick={() => onRemoveIdentity(id.platform, id.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-dashed border-border mt-2">
            <p className="text-xs text-muted-foreground mb-2">Add identity</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[110px]"
              >
                {platformOptions()}
              </select>
              <input
                type="text"
                placeholder="User/Chat ID"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-1 min-w-[120px]"
              />
              <input
                type="text"
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-24"
              />
              <Button
                size="sm"
                onClick={() => {
                  onAddIdentity(newPlatform, newId, newLabel);
                  setNewId("");
                  setNewLabel("");
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-dashed border-border mt-2">
            <p className="text-xs text-muted-foreground mb-1">Primary channel</p>
            {c.primary_channel ? (
              <p className="text-xs font-mono text-muted-foreground mb-2">
                Current: <span className="text-foreground">{c.primary_channel.platform} / {c.primary_channel.channel_id}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                No channel set — user will be blocked on platforms where channel ID ≠ user ID (Slack, Webex, group chats).
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={channelPlatform}
                onChange={(e) => setChannelPlatform(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[110px]"
              >
                {platformOptions()}
              </select>
              <input
                type="text"
                placeholder="Channel / Chat ID"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-1 min-w-[120px]"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!channelId.trim()) return;
                  onSetPrimaryChannel(channelPlatform, channelId.trim());
                  setChannelId("");
                }}
              >
                Set channel
              </Button>
            </div>
          </div>

          {/* Model override */}
          <div className="pt-3 border-t border-dashed border-border mt-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">
                Model override{" "}
                <span className="text-[10px] text-muted-foreground/60">(optional)</span>
              </p>
              {hasModelOverride && !showModelOverride && (
                <button
                  onClick={clearModelOverride}
                  className="text-[10px] text-destructive hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {hasModelOverride && !showModelOverride ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded flex-1 truncate">
                  {existingProviders[0].model}
                </span>
                <button
                  onClick={() => {
                    setOverrideBaseUrl(existingProviders[0].base_url);
                    setOverrideModel(existingProviders[0].model);
                    setOverrideApiKey(existingProviders[0].api_key);
                    setShowModelOverride(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </button>
              </div>
            ) : showModelOverride ? (
              <div className="space-y-2">
                <LabeledInput
                  label="Base URL"
                  value={overrideBaseUrl}
                  onChange={setOverrideBaseUrl}
                  placeholder="https://api.openai.com/v1"
                />
                <LabeledInput
                  label="Model"
                  value={overrideModel}
                  onChange={setOverrideModel}
                  placeholder="gpt-4o"
                />
                <LabeledInput
                  label="API Key"
                  value={overrideApiKey}
                  onChange={setOverrideApiKey}
                  placeholder="sk-…"
                  type="password"
                />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveModelOverride}>
                    <Save className="h-3 w-3 mr-1" /> Save override
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowModelOverride(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowModelOverride(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Assign a specific model to this user
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
