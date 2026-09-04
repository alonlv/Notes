"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotateCcw, Save, Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Settings, Cpu, Users, Brain, FileText, Database, Activity, Zap, AlertTriangle, type LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ApiErrorsPanel } from "@/components/system/ApiErrors";
import type { BackgroundStatusResponse, Contact, JobRun, JobStatus, RouterMetricsResponse } from "@/types/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LlmProvider {
  base_url: string;
  model: string;
  api_key: string;
  supports_text: boolean;
  supports_image: boolean;
  supports_voice: boolean;
  role: "user" | "background" | "any";
  voice_model: string;
  timeout_seconds: number;
}

interface Config {
  agent_name: string;
  agent_timezone: string;
  agent_max_tool_rounds: number;
  agent_verbose_responses: boolean;
  organizer_name: string;
  organizer_email: string;
  news_provider: string;
  llm_providers: LlmProvider[];
  prompt_core: string;
  prompt_memory: string;
  prompt_proactive: string;
  prompt_notes: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

type Tab = "general" | "prompt" | "providers" | "contacts" | "data" | "heartbeat" | "memory" | "background" | "errors";

type Group = "settings" | "ai" | "system";

interface NavTab { id: Tab; label: string; icon: LucideIcon }
interface NavGroup { id: Group; label: string; icon: LucideIcon; tabs: NavTab[] }

const NAV_GROUPS: NavGroup[] = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    tabs: [
      { id: "general",   label: "General",   icon: Settings },
      { id: "providers", label: "Providers", icon: Cpu },
      { id: "contacts",  label: "Contacts",  icon: Users },
    ],
  },
  {
    id: "ai",
    label: "AI",
    icon: Brain,
    tabs: [
      { id: "prompt",  label: "Prompts", icon: FileText },
      { id: "memory",  label: "Memory",  icon: Brain },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Activity,
    tabs: [
      { id: "data",       label: "Data",       icon: Database },
      { id: "heartbeat",  label: "Heartbeat",  icon: Zap },
      { id: "background", label: "Background", icon: Activity },
      { id: "errors",     label: "Errors",     icon: AlertTriangle },
    ],
  },
];

const DEFAULT_PROVIDER: LlmProvider = {
  base_url: "",
  model: "",
  api_key: "",
  supports_text: true,
  supports_image: false,
  supports_voice: false,
  role: "user",
  voice_model: "whisper-1",
  timeout_seconds: 60,
};

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

const ALL_TABS: Tab[] = NAV_GROUPS.flatMap((g) => g.tabs.map((t) => t.id));

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("general");
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
        apiFetch<{ effective: Config }>("/api/admin/config"),
        apiFetch<Partial<Config>>("/api/admin/config/defaults"),
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

  // Deep link (?tab=errors) so the dashboard's error banner can link straight here.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && (ALL_TABS as string[]).includes(requested)) setTab(requested as Tab);
  }, []);

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
      await apiFetch("/api/admin/config", { method: "PUT", body: JSON.stringify({ [key]: value }) });
      setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
      toast(`Saved`, "success");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function resetField(key: keyof Config) {
    try {
      await apiFetch(`/api/admin/config/${key}`, { method: "DELETE" });
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
      const res = await apiFetch<{ contacts: Contact[] }>("/api/admin/contacts");
      setContacts(res.contacts || []);
    } catch (e) {
      toast(`Contacts load failed: ${(e as Error).message}`, "error");
    }
  }

  async function addContact(name: string, canonicalId?: string) {
    if (!name.trim()) { toast("Enter a name first", "error"); return; }
    try {
      await apiFetch("/api/admin/contacts", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), canonical_id: canonicalId?.trim() || undefined }),
      });
      toast(`Contact "${name}" added`, "success");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function removeContact(canonicalId: string) {
    if (!confirm(`Delete contact "${canonicalId}" and all its identities?`)) return;
    try {
      await apiFetch(`/api/admin/contacts/${encodeURIComponent(canonicalId)}`, { method: "DELETE" });
      toast("Contact removed", "info");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function addIdentity(canonicalId: string, platform: string, id: string, label: string) {
    if (!id.trim()) { toast("Platform ID is required", "error"); return; }
    try {
      await apiFetch(`/api/admin/contacts/${encodeURIComponent(canonicalId)}/identities`, {
        method: "POST",
        body: JSON.stringify({ platform: platform.trim(), id: id.trim(), label: label.trim() }),
      });
      toast(`Identity added`, "success");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function removeIdentity(platform: string, id: string) {
    if (!confirm(`Remove identity (${platform}, ${id})?`)) return;
    try {
      await apiFetch("/api/admin/contacts/identities", {
        method: "DELETE",
        body: JSON.stringify({ platform, id }),
      });
      toast("Identity removed", "info");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function setPrimaryChannel(canonicalId: string, platform: string, channelId: string) {
    try {
      await apiFetch(`/api/admin/contacts/${encodeURIComponent(canonicalId)}/channel`, {
        method: "POST",
        body: JSON.stringify({ platform, channel_id: channelId }),
      });
      toast("Primary channel set", "success");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function reloadContacts() {
    try {
      const r = await apiFetch<{ loaded: number }>("/api/admin/contacts/reload", { method: "POST" });
      toast(`Reloaded ${r.loaded} contact(s) from disk`, "success");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  async function saveContactData(canonicalId: string, data: Record<string, unknown>) {
    try {
      await apiFetch(`/api/admin/contacts/${encodeURIComponent(canonicalId)}/data`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast("Saved", "success");
      await loadContacts();
    } catch (e) { toast((e as Error).message, "error"); }
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
                  await apiFetch(`/api/admin/config/${key}`, { method: "DELETE" });
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
          <DataManager />
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

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({
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

// ─── Prompt card ──────────────────────────────────────────────────────────────

interface PromptVar {
  name: string;
  resolved: string;
  desc: string;
}

function PromptCard({
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

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
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

function SaveRow({
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

function LabeledInput({
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

function Checkbox({
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

function RoleBadge({ role }: { role: LlmProvider["role"] }) {
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

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({
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
    const { llm_providers: _, ...rest } = c.attributes ?? {};
    onSaveData(rest as Record<string, unknown>);
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
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="slack">Slack</option>
                <option value="webex">Webex</option>
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
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="slack">Slack</option>
                <option value="webex">Webex</option>
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

function DataManager() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const { toast } = useToasts();

  useEffect(() => {
    apiFetch<{ contacts: Contact[] }>("/api/admin/contacts")
      .then((r) => setAllContacts(r.contacts || []))
      .catch(() => {});
  }, []);

  async function loadUserData() {
    if (!userId.trim()) {
      toast("Enter a user ID first", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/user-data/${encodeURIComponent(userId.trim())}`);
      setData(res);
    } catch (e) {
      toast((e as Error).message, "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateData(type: string, id: string, updates: any) {
    try {
      const endpoint = type === 'notes' ? `/api/notes/${id}` :
                      type === 'tasks' ? `/api/tasks/${id}` :
                      type === 'topics' ? `/api/topics/${id}` : null;
      if (!endpoint) return;

      await apiFetch(endpoint, { method: "PUT", body: JSON.stringify(updates) });
      toast("Updated successfully", "success");
      loadUserData(); // Refresh data
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {allContacts.length > 0 ? (
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a person…</option>
            {allContacts.map((c) => (
              <option key={c.canonical_id} value={c.canonical_id}>
                {c.name} ({c.canonical_id})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="Enter user ID (e.g. person:alon)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}
        <Button onClick={loadUserData} disabled={loading}>
          {loading ? "Loading…" : "Load Data"}
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Notes ({data.notes?.length || 0})</h3>
            <div className="space-y-2">
              {data.notes?.map((note: any) => (
                <DataItem
                  key={note.id}
                  type="note"
                  item={note}
                  contacts={allContacts}
                  onUpdate={(updates) => updateData('notes', note.id, updates)}
                />
              )) || <p className="text-sm text-muted-foreground">No notes</p>}
            </div>
          </div>

          {/* Tasks */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Tasks ({data.tasks?.length || 0})</h3>
            <div className="space-y-2">
              {data.tasks?.map((task: any) => (
                <DataItem
                  key={task.id}
                  type="task"
                  item={task}
                  contacts={allContacts}
                  onUpdate={(updates) => updateData('tasks', task.id, updates)}
                />
              )) || <p className="text-sm text-muted-foreground">No tasks</p>}
            </div>
          </div>

          {/* Topics */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Topics ({data.topics?.length || 0})</h3>
            <div className="space-y-2">
              {data.topics?.map((topic: any) => (
                <DataItem
                  key={topic.id}
                  type="topic"
                  item={topic}
                  contacts={allContacts}
                  onUpdate={(updates) => updateData('topics', topic.id, updates)}
                />
              )) || <p className="text-sm text-muted-foreground">No topics</p>}
            </div>
          </div>

          {/* News Interests */}
          <div>
            <h3 className="text-sm font-semibold mb-3">News Interests ({data.news_interests?.length || 0})</h3>
            <div className="space-y-2">
              {data.news_interests?.map((interest: any) => (
                <div key={interest.id} className="rounded border p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">ID: {interest.id}</p>
                  <p>{interest.query}</p>
                </div>
              )) || <p className="text-sm text-muted-foreground">No news interests</p>}
            </div>
          </div>

          {/* Memories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Memories ({data.memories?.length || 0})</h3>
            <div className="space-y-2">
              {data.memories?.slice(0, 10).map((memory: any, idx: number) => (
                <div key={idx} className="rounded border p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">ID: {memory.id}</p>
                  <p>{memory.content}</p>
                </div>
              )) || <p className="text-sm text-muted-foreground">No memories</p>}
              {data.memories?.length > 10 && (
                <p className="text-xs text-muted-foreground">... and {data.memories.length - 10} more</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataItem({ type, item, contacts, onUpdate }: { type: string; item: any; contacts: Contact[]; onUpdate: (updates: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState(item.user_id || "");
  const [authorizedIds, setAuthorizedIds] = useState(item.authorized_ids?.join(", ") || "");

  function handleSave() {
    const updates: any = {};
    if (userId !== item.user_id) updates.user_id = userId;
    const authIds = authorizedIds.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (JSON.stringify(authIds) !== JSON.stringify(item.authorized_ids)) {
      updates.authorized_ids = authIds;
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    setEditing(false);
  }

  return (
    <div className="rounded border p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {type === 'note' ? item.title || 'Untitled' : item.title || item.name}
          </p>
          <p className="text-xs text-muted-foreground">
            ID: {item.id} | Owner: {item.owner_id}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Person</label>
            {contacts.length > 0 ? (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="">No person</option>
                {contacts.map((c) => (
                  <option key={c.canonical_id} value={c.canonical_id}>
                    {c.name} ({c.canonical_id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                placeholder="e.g. person:alon"
              />
            )}
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Authorized IDs (comma-separated)</label>
            <input
              type="text"
              value={authorizedIds}
              onChange={(e) => setAuthorizedIds(e.target.value)}
              className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
              placeholder="person:alon, person:other"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          <p>Person: {contacts.find((c) => c.canonical_id === item.user_id)?.name || item.user_id || 'none'}</p>
          <p>Authorized: {item.authorized_ids?.join(", ") || 'none'}</p>
        </div>
      )}
    </div>
  );
}

// ─── Heartbeat panel ──────────────────────────────────────────────────────────

function HeartbeatPanel({
  contacts,
  toast,
}: {
  contacts: Contact[];
  toast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [eventText, setEventText] = useState("");
  const [firing, setFiring] = useState(false);
  const [triggering, setTriggering] = useState(false);

  async function fireHeartbeat() {
    if (!selectedUser) return;
    setFiring(true);
    try {
      const res = await fetch(`/api/trigger?user_id=${encodeURIComponent(selectedUser)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "Manual heartbeat test from Admin panel. Check if there is anything worth reporting for this user right now." }),
      });
      if (res.ok) {
        toast("Heartbeat queued — check the user's messaging channel", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data?.error ?? "Heartbeat failed", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setFiring(false);
    }
  }

  async function pushTrigger() {
    if (!selectedUser || !eventText.trim()) return;
    setTriggering(true);
    try {
      const res = await fetch(`/api/trigger?user_id=${encodeURIComponent(selectedUser)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventText.trim() }),
      });
      if (res.ok) {
        toast("Event pushed — agent is reasoning about it", "success");
        setEventText("");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data?.error ?? "Trigger failed", "error");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="How heartbeat works">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The agent wakes up automatically at <strong>08:00, 12:00, and 18:00</strong> (agent timezone) for every
          contact that has a primary channel set. It checks overdue tasks, due-soon tasks, and calendar events,
          then sends a message <em>only if there is something genuinely actionable</em>. If nothing is worth
          reporting it stays silent.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          The <strong>external trigger</strong> endpoint (<code className="text-xs bg-muted px-1 py-0.5 rounded">/trigger/&#123;user_id&#125;</code>) lets
          external services (Zapier, monitoring tools, webhooks) push events. The agent reasons about the event
          and sends a message only when it warrants the user&apos;s attention.
        </p>
      </Card>

      <Card title="Test for a user">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— select a contact —</option>
              {contacts.map((c) => (
                <option key={c.canonical_id} value={c.canonical_id}>
                  {c.name} ({c.canonical_id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedUser || firing}
              onClick={fireHeartbeat}
            >
              {firing ? "Firing…" : "Fire heartbeat now"}
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Push external event
            </label>
            <textarea
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              placeholder="Describe an event, e.g. 'Server CPU spiked to 95% for 10 minutes'"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
            <Button
              size="sm"
              className="mt-2"
              disabled={!selectedUser || !eventText.trim() || triggering}
              onClick={pushTrigger}
            >
              {triggering ? "Pushing…" : "Push event"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Memory panel ─────────────────────────────────────────────────────────────

function MemoryPanel({
  toast,
}: {
  toast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [running, setRunning] = useState(false);

  async function runConsolidation() {
    setRunning(true);
    try {
      await apiFetch("/api/admin/memory/consolidate", { method: "POST" });
      toast("Memory consolidation started in background", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="How memory consolidation works">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every night at <strong>03:00</strong> (agent timezone) the system scans all memories for every
          user and uses the LLM to merge redundant or overlapping entries within each category. For example,
          two <em>ABOUT_ME</em> entries like <em>&quot;My name is Oded&quot;</em> and <em>&quot;I was born in 2000&quot;</em> become a
          single entry: <em>&quot;My name is Oded and I was born in 2000.&quot;</em>
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          Use the button below to run the job immediately without waiting for the nightly schedule.
          The job runs in the background — check the server logs for per-user merge counts.
        </p>
      </Card>

      <Card title="Run now">
        <Button onClick={runConsolidation} disabled={running}>
          {running ? "Starting…" : "Consolidate memories now"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          This triggers the same job that runs every night at 03:00. It may take a minute to complete
          depending on how many users and memory entries exist.
        </p>
      </Card>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
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

// ─── Background status panel ──────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtDuration(ms: number | null | undefined) {
  if (ms == null) return null;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: JobRun["status"] | null }) {
  if (!status) return <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-muted text-muted-foreground">never</span>;
  const cls = {
    ok: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    skip: "bg-muted text-muted-foreground",
  }[status];
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider", cls)}>{status}</span>;
}

function JobCard({ name, data }: { name: string; data: JobStatus }) {
  const [open, setOpen] = useState(false);
  const lr = data.last_run;
  const dur = fmtDuration(lr?.duration_ms);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold break-all leading-tight">{name}</p>
        <StatusBadge status={lr?.status ?? null} />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>Last run: <span className="text-foreground">{fmtDate(lr?.started_at)}</span></span>
        {dur && <span>Duration: <span className="text-foreground">{dur}</span></span>}
        {lr?.user_id && <span>User: <span className="text-foreground">{lr.user_id}</span></span>}
      </div>

      {/* Message */}
      {lr?.message && (
        <p className="text-xs bg-muted/50 rounded px-2.5 py-2 text-foreground/80 break-words leading-relaxed max-h-20 overflow-y-auto">
          {lr.message}
        </p>
      )}

      {/* Totals */}
      <div className="flex gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          ✓ {data.totals.ok} ok
        </span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          ✗ {data.totals.error} error
        </span>
        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
          → {data.totals.skip} skip
        </span>
      </div>

      {/* History toggle */}
      {data.recent.length > 0 && (
        <div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            History ({data.recent.length})
          </button>
          {open && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
              {data.recent.map((r, i) => (
                <HistoryRow key={i} run={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ run }: { run: JobRun }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0 text-xs">
      <span className="text-muted-foreground shrink-0 w-32">{fmtDate(run.started_at)}</span>
      <StatusBadge status={run.status} />
      <span className="text-foreground/70 flex-1 break-words leading-snug">{run.message || "—"}</span>
      {run.duration_ms != null && (
        <span className="text-muted-foreground shrink-0">{fmtDuration(run.duration_ms)}</span>
      )}
    </div>
  );
}

const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
];

function RouterMetricsSection({ metrics }: { metrics: RouterMetricsResponse | null }) {
  const cloud = metrics?.by_target?.cloud ?? 0;
  const local = metrics?.by_target?.local ?? 0;
  const total = metrics?.total ?? 0;
  const providers = metrics?.providers ?? [];

  return (
    <Card title="LLM Router">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cloud LLM</p>
          <p className="text-2xl font-bold mt-1 text-blue-500">{cloud}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Local (Ollama)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{local}</p>
        </div>
      </div>
      {providers.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">By provider</p>
          {providers.map((p) => (
            <div key={`${p.base_url}|${p.model}`} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs truncate flex-1">{p.model}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  p.target === "local"
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-blue-500/15 text-blue-500"
                )}
              >
                {p.target}
              </span>
              <span className="tabular-nums text-muted-foreground w-10 text-right">{p.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No LLM completions recorded yet. Send a chat message or fire the heartbeat to populate this.
        </p>
      )}
    </Card>
  );
}

function BackgroundStatusPanel() {
  const [data, setData] = useState<BackgroundStatusResponse | null>(null);
  const [metrics, setMetrics] = useState<RouterMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, m] = await Promise.all([
        apiFetch<BackgroundStatusResponse>("/api/admin/background-status"),
        apiFetch<RouterMetricsResponse>("/api/admin/router-metrics").catch(() => null),
      ]);
      setData(res);
      setMetrics(m);
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(load, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval, load]);

  const jobs = data ? Object.entries(data.jobs) : [];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RotateCcw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Auto-refresh:
          {REFRESH_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setRefreshInterval(o.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs transition-colors",
                refreshInterval === o.value
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {lastUpdated && (
          <span className="text-xs text-muted-foreground ml-auto">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <RouterMetricsSection metrics={metrics} />

      {!error && jobs.length === 0 && !loading && (
        <Card>
          <p className="text-sm text-muted-foreground text-center py-4">
            No background jobs have run yet. Jobs are tracked after the first run.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {jobs.map(([name, status]) => (
          <JobCard key={name} name={name} data={status} />
        ))}
      </div>
    </div>
  );
}
