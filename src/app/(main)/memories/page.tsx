"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Brain, Search, RefreshCw, AlertCircle, Plus, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Md } from "@/components/ui/md";
import type { Memory } from "@/types/api";
import { useContacts } from "@/hooks/use-contacts";
import { useSelectedUser } from "@/context/user-context";
import { Users } from "lucide-react";

type EditState = { content: string; category: string; topics: string; authorized_ids: string[] };

/** Parse a comma-separated topics string into a clean, de-duplicated, lower-cased list. */
function parseTopics(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const name = part.trim().toLowerCase();
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** Read the topics array off a memory's metadata, tolerating missing/malformed values. */
function memoryTopics(m: Memory): string[] {
  const raw = (m.metadata as { topics?: unknown })?.topics;
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
}

function MemoryForm({
  initial,
  onSave,
  onCancel,
  saving,
  contacts,
}: {
  initial: EditState;
  onSave: (s: EditState) => void;
  onCancel: () => void;
  saving: boolean;
  contacts: Array<{ canonical_id: string; name: string }>;
}) {
  const [s, setS] = useState(initial);
  const togglePerson = (id: string) =>
    setS((p) => ({
      ...p,
      authorized_ids: p.authorized_ids.includes(id)
        ? p.authorized_ids.filter((x) => x !== id)
        : [...p.authorized_ids, id],
    }));
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Content</label>
        <textarea
          value={s.content}
          onChange={(e) => setS((p) => ({ ...p, content: e.target.value }))}
          placeholder="What should I remember?"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Category (optional)</label>
        <Input
          value={s.category}
          onChange={(e) => setS((p) => ({ ...p, category: e.target.value }))}
          placeholder="e.g. preference, fact, context…"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Topics (comma-separated)</label>
        <Input
          value={s.topics}
          onChange={(e) => setS((p) => ({ ...p, topics: e.target.value }))}
          placeholder="e.g. wife, gift-ideas"
        />
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          One memory can belong to several topics — it&apos;s stored once, not duplicated.
        </p>
      </div>
      {contacts.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">People</label>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {contacts.map((c) => (
              <label key={c.canonical_id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.authorized_ids.includes(c.canonical_id)}
                  onChange={() => togglePerson(c.canonical_id)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(s)} disabled={saving || !s.content.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

export default function MemoriesPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: contacts = [] } = useContacts();
  const { selectedUserId, selectedUserName } = useSelectedUser();

  const { data: memories = [], isLoading, error } = useQuery<Memory[]>({
    queryKey: ["memories", submitted, selectedUserId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (submitted) params.set("q", submitted);
      if (selectedUserId) params.set("user_id", selectedUserId);
      const qs = params.toString();
      return fetch(`/api/memories${qs ? `?${qs}` : ""}`).then((r) => r.json());
    },
  });

  const create = useMutation({
    mutationFn: (body: object) =>
      fetch("/api/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memories"] }); setShowAdd(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      fetch(`/api/memories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["memories"] }); setEditId(null); },
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/memories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query);
  }

  // Topic chips are derived from the loaded memories; filtering is client-side so
  // the full chip row stays visible while a single topic is selected.
  const allTopics = [...new Set(memories.flatMap(memoryTopics))].sort();
  const visibleMemories = topicFilter
    ? memories.filter((m) => memoryTopics(m).includes(topicFilter))
    : memories;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Memory</h1>
          {selectedUserName && (
            <p className="text-xs text-primary mt-0.5">Viewing {selectedUserName}&apos;s memory</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["memories"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedUserId && (
            <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Could not load memories.
        </div>
      )}

      {contacts.length > 0 && !selectedUserId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          Select a profile from the sidebar to view and manage memories.
        </div>
      )}

      {showAdd && selectedUserId && (
        <div className="mb-4">
          <MemoryForm
            initial={{ content: "", category: "", topics: "", authorized_ids: [selectedUserId] }}
            onSave={(s) => {
              const ids = [...new Set([selectedUserId, ...s.authorized_ids].filter(Boolean))];
              create.mutate({ content: s.content, category: s.category || undefined, topics: parseTopics(s.topics), user_id: selectedUserId, authorized_ids: ids });
            }}
            onCancel={() => setShowAdd(false)}
            saving={create.isPending}
            contacts={contacts}
          />
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search memories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {allTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          <button
            onClick={() => setTopicFilter(null)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              topicFilter === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {allTopics.map((t) => (
            <button
              key={t}
              onClick={() => setTopicFilter((cur) => (cur === t ? null : t))}
              className={`rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors ${
                topicFilter === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : visibleMemories.length === 0 && !showAdd ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {topicFilter
              ? `No memories under “${topicFilter}”.`
              : submitted
                ? "No memories matching your search."
                : "No memories stored yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleMemories.map((m) => {
            const category = m.metadata?.category as string | undefined;
            const topics = memoryTopics(m);
            return editId === m.id ? (
              <MemoryForm
                key={m.id}
                initial={{ content: m.content, category: category ?? "", topics: memoryTopics(m).join(", "), authorized_ids: m.authorized_ids?.length ? m.authorized_ids : (m.owner_id || m.user_id) ? [m.owner_id || m.user_id || ""] : [] }}
                onSave={(s) => {
                  const ids = [...new Set([selectedUserId, ...s.authorized_ids].filter(Boolean))];
                  update.mutate({ id: m.id, body: { content: s.content, category: s.category || undefined, topics: parseTopics(s.topics), user_id: selectedUserId || undefined, authorized_ids: ids } });
                }}
                onCancel={() => setEditId(null)}
                saving={update.isPending}
                contacts={contacts}
              />
            ) : (
              <div key={m.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Brain className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <Md className="text-sm">{m.content}</Md>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {category && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {category.toLowerCase()}
                      </Badge>
                    )}
                    {topics.map((t) => (
                      <button key={t} onClick={() => setTopicFilter(t)} title={`Filter by ${t}`}>
                        <Badge variant="outline" className="text-xs capitalize cursor-pointer hover:border-primary hover:text-primary">
                          #{t}
                        </Badge>
                      </button>
                    ))}
                    {(() => {
                      const ids: string[] = (m.metadata as any)?.authorized_ids?.length ? (m.metadata as any).authorized_ids : m.authorized_ids?.length ? m.authorized_ids : (m.owner_id || m.user_id) ? [m.owner_id || m.user_id || ""] : [];
                      if (!ids.length) return null;
                      const names = ids.map((id: string) => contacts.find((c) => c.canonical_id === id)?.name ?? id.replace(/^person:/, ""));
                      return <span className="text-xs text-muted-foreground/50 truncate">{names.join(", ")}</span>;
                    })()}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => { setEditId(m.id); setShowAdd(false); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                  onClick={() => del.mutate(m.id)} disabled={del.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
