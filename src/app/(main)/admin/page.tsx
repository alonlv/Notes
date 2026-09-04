"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ApiErrorsPanel } from "@/components/system/ApiErrors";
import type { Contact } from "@/types/api";
import { BackgroundStatusPanel } from "@/components/admin/BackgroundStatusPanel";
import { ContactCard } from "@/components/admin/ContactCard";
import { DataManager } from "@/components/admin/DataManager";
import { HeartbeatPanel } from "@/components/admin/HeartbeatPanel";
import { MemoryPanel } from "@/components/admin/MemoryPanel";
import { Card, SaveRow } from "@/components/admin/primitives";
import { ProviderCard } from "@/components/admin/ProviderCard";
import { PromptCard, type PromptVar } from "@/components/admin/PromptCard";
import {
  ALL_TABS,
  DEFAULT_PROVIDER,
  NAV_GROUPS,
  type Config,
  type LlmProvider,
  type Tab,
  type Toast,
} from "@/components/admin/types";

// ─── Toast ───────────────────────────────────────────────────────────────────

let _toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, toast: add };
}

// ─── Page ────────────────────────────────────────────────────────────────────

/** useSearchParams needs a Suspense boundary above it in a prerendered page —
 *  the same reason the app shell wraps the sidebar. */
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>}>
      <Admin />
    </Suspense>
  );
}

function Admin() {
  // Deep link (?tab=errors) so the dashboard's error banner can link straight
  // here. Read from the router rather than in an effect off window.location:
  // the effect version rendered the wrong tab first and then corrected itself.
  const requestedTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>(
    (ALL_TABS as string[]).includes(requestedTab ?? "") ? (requestedTab as Tab) : "general",
  );
  const [config, setConfig] = useState<Config | null>(null);
  const [defaults, setDefaults] = useState<Partial<Config>>({});
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactCanon, setNewContactCanon] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toasts, toast } = useToasts();
  const dragIdx = useRef<number | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [cfgRes, defsRes] = await Promise.all([
        api.config.get<Config>(),
        api.config.defaults<Partial<Config>>(),
      ]);
      setConfig(cfgRes.effective);
      setProviders(
        (cfgRes.effective.llm_providers ?? []).map((p) => ({ ...DEFAULT_PROVIDER, ...p }))
      );
      setDefaults(defsRes);
      await loadContacts();
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Cmd+S → save current tab
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (tab === "providers") saveProviders();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, providers]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function saveField(key: keyof Config, value: unknown) {
    try {
      await api.config.save(key, value);
      setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
      toast(`Saved`, "success");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function resetField(key: keyof Config) {
    try {
      await api.config.reset(key);
      toast(`Reset to default`, "info");
      await loadConfig();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function saveProviders() {
    const valid = providers.filter((p) => p.base_url && p.model && p.api_key);
    if (!valid.length) { toast("No valid providers — fill in Base URL, Model and API Key", "error"); return; }
    await saveField("llm_providers", valid);
  }

  // ── Provider helpers ──────────────────────────────────────────────────────

  function updateProvider(idx: number, patch: Partial<LlmProvider>) {
    setProviders((prev) => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }

  function addProvider() {
    setProviders((prev) => [...prev, { ...DEFAULT_PROVIDER }]);
  }

  function removeProvider(idx: number) {
    setProviders((prev) => prev.filter((_, i) => i !== idx));
  }

  // drag-to-reorder
  function onDragStart(idx: number) { dragIdx.current = idx; }
  function onDrop(targetIdx: number) {
    if (dragIdx.current === null || dragIdx.current === targetIdx) return;
    setProviders((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current!, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    dragIdx.current = null;
  }

  // ── Contacts helpers ──────────────────────────────────────────────────────
  
  async function loadContacts() {
    try {
      setContacts(await api.contacts.list());
    } catch (e) {
      toast(`Contacts load failed: ${(e as Error).message}`, "error");
    }
  }

  /** Every contact mutation is the same three beats: call, say so, reload. */
  async function contactAction(done: string, call: () => Promise<unknown>) {
    try {
      await call();
      toast(done, "success");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function addContact(name: string, canonicalId?: string) {
    if (!name.trim()) { toast("Enter a name first", "error"); return; }
    await contactAction(`Contact "${name}" added`, () =>
      api.contacts.add(name.trim(), canonicalId?.trim()));
  }

  async function removeContact(canonicalId: string) {
    if (!confirm(`Delete contact "${canonicalId}" and all its identities?`)) return;
    await contactAction("Contact removed", () => api.contacts.remove(canonicalId));
  }

  async function addIdentity(canonicalId: string, platform: string, id: string, label: string) {
    if (!id.trim()) { toast("Platform ID is required", "error"); return; }
    await contactAction("Identity added", () =>
      api.contacts.addIdentity(canonicalId, {
        platform: platform.trim(), id: id.trim(), label: label.trim(),
      }));
  }

  async function removeIdentity(platform: string, id: string) {
    if (!confirm(`Remove identity (${platform}, ${id})?`)) return;
    await contactAction("Identity removed", () => api.contacts.removeIdentity({ platform, id }));
  }

  async function setPrimaryChannel(canonicalId: string, platform: string, channelId: string) {
    await contactAction("Primary channel set", () =>
      api.contacts.setPrimaryChannel(canonicalId, platform, channelId));
  }

  async function reloadContacts() {
    await contactAction("Reloaded contacts from disk", api.contacts.reload);
  }

  async function saveContactData(canonicalId: string, data: Record<string, unknown>) {
    await contactAction("Saved", () => api.contacts.saveData(canonicalId, data));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto mt-12 px-4 space-y-3">
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
          {fetchError}
        </p>
        <Button variant="outline" onClick={loadConfig}>Retry</Button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Admin</h1>
        <Button variant="outline" size="sm" onClick={loadConfig}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Group selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {NAV_GROUPS.map((group) => {
          const isActive = group.tabs.some((t) => t.id === tab);
          const GroupIcon = group.icon;
          return (
            <button
              key={group.id}
              onClick={() => setTab(group.tabs[0].id)}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <GroupIcon className="h-5 w-5" />
              {group.label}
            </button>
          );
        })}
      </div>

      {/* Section sub-tabs */}
      {NAV_GROUPS.map((group) => {
        if (!group.tabs.some((t) => t.id === tab)) return null;
        return (
          <div key={group.id} className="flex gap-0 border-b border-border mb-6 overflow-x-auto hide-scrollbar">
            {group.tabs.map((section) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setTab(section.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                    tab === section.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <SectionIcon className="h-3.5 w-3.5" />
                  {section.label}
                </button>
              );
            })}
          </div>
        );
      })}

      {/* ── General ─────────────────────────────────────────────────────── */}
      {tab === "general" && (
        <div className="space-y-5">
          <Card title="Agent Identity">
            <SaveRow
              label="Agent Name"
              hint="Used in prompts and replies"
              value={config.agent_name}
              onChange={(v) => setConfig({ ...config, agent_name: v })}
              onSave={() => saveField("agent_name", config.agent_name)}
              onReset={() => resetField("agent_name")}
              placeholder="e.g. Alexander"
            />
            <SaveRow
              label="Timezone"
              hint="IANA identifier — used for reminders and date math"
              value={config.agent_timezone}
              onChange={(v) => setConfig({ ...config, agent_timezone: v })}
              onSave={() => saveField("agent_timezone", config.agent_timezone)}
              onReset={() => resetField("agent_timezone")}
              placeholder="e.g. Asia/Jerusalem"
            />
            <SaveRow
              label="Max Tool Rounds"
              hint="Max LLM tool-call loops per message before giving up"
              value={String(config.agent_max_tool_rounds)}
              onChange={(v) => setConfig({ ...config, agent_max_tool_rounds: parseInt(v) || 1 })}
              onSave={() => saveField("agent_max_tool_rounds", config.agent_max_tool_rounds)}
              onReset={() => resetField("agent_max_tool_rounds")}
              type="number"
              inputProps={{ min: 1, max: 50 }}
            />
            <div className="flex items-start justify-between gap-4 pt-1">
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="verbose"
                    checked={config.agent_verbose_responses}
                    onChange={(e) => setConfig({ ...config, agent_verbose_responses: e.target.checked })}
                    className="w-4 h-4 cursor-pointer accent-primary"
                  />
                  <label htmlFor="verbose" className="text-sm font-medium cursor-pointer">
                    Verbose responses
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  Show internal IDs and category names in replies
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => saveField("agent_verbose_responses", config.agent_verbose_responses)}>
                  <Save className="h-3.5 w-3.5 mr-1" />Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => resetField("agent_verbose_responses")}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Meeting Organizer">
            <SaveRow
              label="Organizer Name"
              hint="Shown as the meeting organizer in calendar invites"
              value={config.organizer_name}
              onChange={(v) => setConfig({ ...config, organizer_name: v })}
              onSave={() => saveField("organizer_name", config.organizer_name)}
              onReset={() => resetField("organizer_name")}
              placeholder="Your full name"
            />
            <SaveRow
              label="Organizer Email"
              hint="Used as the organizer email in .ics files"
              value={config.organizer_email}
              onChange={(v) => setConfig({ ...config, organizer_email: v })}
              onSave={() => saveField("organizer_email", config.organizer_email)}
              onReset={() => resetField("organizer_email")}
              placeholder="you@example.com"
            />
          </Card>

          <Card title="News">
            <SaveRow
              label="News Provider"
              hint="Provider used by news_search and news-digest monitors. Currently only 'rss' is implemented."
              value={config.news_provider}
              onChange={(v) => setConfig({ ...config, news_provider: v })}
              onSave={() => saveField("news_provider", config.news_provider)}
              onReset={() => resetField("news_provider")}
              placeholder="rss"
            />
          </Card>
        </div>
      )}

      {/* ── Prompt ──────────────────────────────────────────────────────── */}
      {tab === "prompt" && (
        <div className="space-y-5">
          {(
            [
              {
                key: "prompt_core" as const,
                label: "Core Behavior",
                hint: "Injected first in every system prompt. Sets the agent's personality and capabilities.",
                vars: [
                  { name: "{agent_name}", resolved: config.agent_name, desc: "Agent's display name" },
                  { name: "{agent_timezone}", resolved: config.agent_timezone, desc: "IANA timezone for date/time math" },
                ],
                position: "① First section",
              },
              {
                key: "prompt_memory" as const,
                label: "Memory Rules",
                hint: "Controls when the agent stores and retrieves long-term memories.",
                vars: [],
                position: "② Second section",
              },
              {
                key: "prompt_proactive" as const,
                label: "Proactive Tasks",
                hint: "Instructions for background intelligence tasks that run without a user prompt.",
                vars: [],
                position: "③ Third section",
              },
              {
                key: "prompt_notes" as const,
                label: "Notes Guidelines",
                hint: "Controls how the agent creates and formats notes and tasks.",
                vars: [],
                position: "④ Fourth section",
              },
            ] as const
          ).map(({ key, label, hint, vars, position }) => (
            <PromptCard
              key={key}
              label={label}
              hint={hint}
              vars={vars as unknown as PromptVar[]}
              position={position}
              value={config[key]}
              defaultValue={(defaults[key] as string) ?? ""}
              onChange={(v) => setConfig({ ...config, [key]: v })}
              onSave={() => saveField(key, config[key])}
              onReset={async () => {
                try {
                  await api.config.reset(key);
                  setConfig((prev) =>
                    prev ? { ...prev, [key]: (defaults[key] as string) ?? "" } : prev
                  );
                  toast("Reset to default", "info");
                } catch (e) {
                  toast((e as Error).message, "error");
                }
              }}
            />
          ))}
        </div>
      )}

      {/* ── Providers ───────────────────────────────────────────────────── */}
      {tab === "providers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Overrides <code className="bg-muted px-1 rounded">LLM_*</code> env vars.
              Tried in order — drag to reorder. <kbd className="bg-muted px-1 rounded text-[10px]">⌘S</kbd> to save.
            </p>
            <Button size="sm" variant="outline" onClick={() => resetField("llm_providers")}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to env
            </Button>
          </div>

          <div className="space-y-3">
            {providers.map((p, i) => (
              <ProviderCard
                key={i}
                idx={i}
                provider={p}
                onChange={(patch) => updateProvider(i, patch)}
                onRemove={() => removeProvider(i)}
                onDragStart={() => onDragStart(i)}
                onDrop={() => onDrop(i)}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={addProvider}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add provider
            </Button>
            <Button size="sm" onClick={saveProviders}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save all providers
            </Button>
          </div>
        </div>
      )}

      {/* ── Contacts ────────────────────────────────────────────────────── */}
      {tab === "contacts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Map named persons to their platform identities. Identities are resolved
              silently — the LLM never sees the mapping. All memories, sessions, reminders,
              and notes are automatically unified under one <code className="bg-muted px-1 rounded">person:name</code> ID.
            </p>
            <Button size="sm" variant="outline" onClick={reloadContacts} title="Hot-reload contacts.json from disk">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reload file
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Person name (e.g. alon)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-1"
            />
            <input
              type="text"
              value={newContactCanon}
              onChange={(e) => setNewContactCanon(e.target.value)}
              placeholder="canonical_id (optional)"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-1"
            />
            <Button
              size="sm"
              onClick={() => {
                addContact(newContactName, newContactCanon).then(() => {
                  setNewContactName("");
                  setNewContactCanon("");
                });
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add person
            </Button>
          </div>

          <div className="space-y-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet. Add one above.</p>
            ) : (
              contacts.map((c) => (
                <ContactCard
                  key={c.canonical_id}
                  contact={c}
                  onRemove={() => removeContact(c.canonical_id)}
                  onAddIdentity={(platform, id, label) => addIdentity(c.canonical_id, platform, id, label)}
                  onRemoveIdentity={(platform, id) => removeIdentity(platform, id)}
                  onSetPrimaryChannel={(platform, channelId) => setPrimaryChannel(c.canonical_id, platform, channelId)}
                  onSaveData={(data) => saveContactData(c.canonical_id, data)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Data Management ────────────────────────────────────────────────── */}
      {tab === "data" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Manage user data associations. View and edit user IDs and authorized users for all data types.
            Use this to reassign data ownership or modify access permissions.
          </p>
          <DataManager contacts={contacts} toast={toast} />
        </div>
      )}

      {/* ── Heartbeat ──────────────────────────────────────────────────────── */}
      {tab === "heartbeat" && (
        <HeartbeatPanel contacts={contacts} toast={toast} />
      )}

      {/* ── Memory ─────────────────────────────────────────────────────────── */}
      {tab === "memory" && (
        <MemoryPanel toast={toast} />
      )}

      {/* ── Background status ──────────────────────────────────────────────── */}
      {tab === "background" && (
        <BackgroundStatusPanel />
      )}

      {/* ── API errors ─────────────────────────────────────────────────────── */}
      {tab === "errors" && (
        <ApiErrorsPanel />
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg",
              t.type === "success" && "bg-green-600",
              t.type === "error" && "bg-destructive",
              t.type === "info" && "bg-primary"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
