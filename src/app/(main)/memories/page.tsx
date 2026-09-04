"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Brain, Search, RefreshCw, AlertCircle, Plus, Pencil, X, Check, List, Network, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Md } from "@/components/ui/md";
import { MemoryGraph, clusterColor } from "@/components/memories/MemoryGraph";
import { PeoplePicker, togglePersonId } from "@/components/ui/PeoplePicker";
import { api, type MemoryWrite } from "@/lib/api";
import type { Memory, MemoryGraph as MemoryGraphData } from "@/types/api";
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

/** Who may see a memory: whoever was ticked, plus always the person being viewed. */
function authorizedIds(selectedUserId: string | null, ticked: string[]): string[] {
  return [...new Set([selectedUserId, ...ticked].filter((v): v is string => Boolean(v)))];
}

/** Who this memory is shared with. The metadata copy wins where it exists —
 *  older rows carry the list only there — then the column, then the owner. */
function peopleFor(m: Memory): string[] {
  const fromMetadata = (m.metadata as { authorized_ids?: unknown })?.authorized_ids;
  if (Array.isArray(fromMetadata) && fromMetadata.length) {
    return fromMetadata.filter((v): v is string => typeof v === "string");
  }
  if (m.authorized_ids?.length) return m.authorized_ids;
  const owner = m.owner_id || m.user_id;
  return owner ? [owner] : [];
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
      <PeoplePicker
        contacts={contacts}
        selected={s.authorized_ids}
        onToggle={(id) => setS((p) => ({ ...p, authorized_ids: togglePersonId(p.authorized_ids, id) }))}
      />
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
  const [view, setView] = useState<"list" | "graph">("list");
  // The list can be read either way: as the flat file of everything stored, or
  // organised into the contexts the graph found. Same rows, same store.
  const [groupByContext, setGroupByContext] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const qc = useQueryClient();
  const { data: contacts = [] } = useContacts();
  const { selectedUserId, selectedUserName } = useSelectedUser();

  const { data: memories = [], isLoading, error } = useQuery<Memory[]>({
    queryKey: ["memories", submitted, selectedUserId],
    queryFn: () => api.memories.list(submitted, selectedUserId ?? undefined),
  });

  // The graph is served whole rather than searched, so it only depends on who is
  // selected and which topic (if any) the view is scoped to. Both views read it:
  // the map draws it, and the list groups by the contexts it found.
  const { data: graph, isLoading: graphLoading, error: graphError } = useQuery<MemoryGraphData>({
    queryKey: ["memory-graph", selectedUserId, topicFilter],
    enabled: !!selectedUserId,
    queryFn: () => api.memories.graph(selectedUserId!, topicFilter ?? undefined),
  });

  // Jumping from a node to its entry in the list is only useful if you land on it.
  useEffect(() => {
    if (view === "list" && highlightId) {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [view, highlightId]);

  // Writing a memory redraws the graph as well — the two views show the same store.
  function invalidateMemories() {
    qc.invalidateQueries({ queryKey: ["memories"] });
    qc.invalidateQueries({ queryKey: ["memory-graph"] });
  }

  const create = useMutation({
    mutationFn: api.memories.create,
    onSuccess: () => { invalidateMemories(); setShowAdd(false); },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MemoryWrite }) => api.memories.update(id, body),
    onSuccess: () => { invalidateMemories(); setEditId(null); },
  });

  const del = useMutation({
    mutationFn: api.memories.delete,
    onSuccess: () => invalidateMemories(),
  });

  const writeError = create.error ?? update.error ?? del.error;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setHighlightId(null);
    setSubmitted(query);
  }

  // Topic chips are derived from the loaded memories; filtering is client-side so
  // the full chip row stays visible while a single topic is selected.
  const allTopics = [...new Set(memories.flatMap(memoryTopics))].sort();
  const visibleMemories = topicFilter
    ? memories.filter((m) => memoryTopics(m).includes(topicFilter))
    : memories;

  // Which context each memory sits in, taken straight from the graph — so the list
  // and the map can never disagree about what belongs with what.
  const contextOf = useMemo(() => {
    const map = new Map<string, { cluster: number; label: string }>();
    for (const node of graph?.nodes ?? []) {
      map.set(node.id, { cluster: node.cluster, label: node.cluster_label });
    }
    return map;
  }, [graph]);

  // The same rows, gathered under the subject they belong to. Named contexts come
  // first, largest first; everything the graph has not connected to a subject yet
  // falls into one trailing group rather than being hidden.
  const grouped = useMemo(() => {
    const buckets = new Map<number, { cluster: number; label: string; items: Memory[] }>();
    for (const m of visibleMemories) {
      const ctx = contextOf.get(m.id);
      const cluster = ctx?.cluster ?? -1;
      const bucket = buckets.get(cluster) ?? { cluster, label: ctx?.label ?? "", items: [] };
      bucket.items.push(m);
      buckets.set(cluster, bucket);
    }
    return [...buckets.values()].sort(
      (a, b) =>
        Number(a.cluster < 0) - Number(b.cluster < 0) ||
        b.items.length - a.items.length ||
        a.label.localeCompare(b.label)
    );
  }, [visibleMemories, contextOf]);

  // Only worth offering when the graph has actually found more than one subject.
  const hasContexts = grouped.some((g) => g.cluster >= 0) && grouped.length > 1;
  const showGrouped = groupByContext && hasContexts;

  // One row, rendered the same way whether the list is grouped or flat.
  function renderMemory(m: Memory) {
    const category = m.metadata?.category as string | undefined;
    const topics = memoryTopics(m);
    return editId === m.id ? (
      <MemoryForm
        key={m.id}
        initial={{ content: m.content, category: category ?? "", topics: memoryTopics(m).join(", "), authorized_ids: m.authorized_ids?.length ? m.authorized_ids : (m.owner_id || m.user_id) ? [m.owner_id || m.user_id || ""] : [] }}
        onSave={(s) => {
          const ids = authorizedIds(selectedUserId, s.authorized_ids);
          update.mutate({ id: m.id, body: { content: s.content, category: s.category || undefined, topics: parseTopics(s.topics), user_id: selectedUserId || undefined, authorized_ids: ids } });
        }}
        onCancel={() => setEditId(null)}
        saving={update.isPending}
        contacts={contacts}
      />
    ) : (
      <div
        key={m.id}
        ref={highlightId === m.id ? highlightRef : undefined}
        className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
          highlightId === m.id ? "border-primary ring-1 ring-primary/40" : "border-border"
        }`}
      >
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
              const names = peopleFor(m).map(
                (id) => contacts.find((c) => c.canonical_id === id)?.name ?? id.replace(/^person:/, ""),
              );
              if (!names.length) return null;
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
  }

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
          <div className="flex items-center rounded-md border border-border p-0.5">
            {([["list", List], ["graph", Network]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => { setView(mode); if (mode === "graph") setHighlightId(null); }}
                title={mode === "list" ? "List" : "Graph"}
                aria-label={mode === "list" ? "List view" : "Graph view"}
                aria-pressed={view === mode}
                className={`rounded px-2 py-1 transition-colors ${
                  view === mode ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: [view === "graph" ? "memory-graph" : "memories"] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedUserId && (
            <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>
      </div>

      {(error || writeError) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ? "Could not load memories" : "Could not save"} — {(error ?? writeError)!.message}
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
              const ids = authorizedIds(selectedUserId, s.authorized_ids);
              create.mutate({ content: s.content, category: s.category || undefined, topics: parseTopics(s.topics), user_id: selectedUserId, authorized_ids: ids });
            }}
            onCancel={() => setShowAdd(false)}
            saving={create.isPending}
            contacts={contacts}
          />
        </div>
      )}

      {view === "list" && (
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
      )}

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

      {view === "list" && hasContexts && (
        <div className="mb-4 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={() => setGroupByContext((on) => !on)}
            aria-pressed={groupByContext}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
              groupByContext
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Group by context
          </button>
          {showGrouped && (
            <span className="text-muted-foreground">
              {grouped.filter((g) => g.cluster >= 0).length} contexts found
            </span>
          )}
        </div>
      )}

      {view === "graph" ? (
        !selectedUserId ? null : graphError ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Could not load the memory graph.
          </div>
        ) : graphLoading || !graph ? (
          <div className="h-[380px] animate-pulse rounded-lg bg-muted md:h-[520px]" />
        ) : (
          <MemoryGraph
            data={graph}
            onOpenMemory={(id) => { setHighlightId(id); setView("list"); }}
          />
        )
      ) : isLoading ? (
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
      ) : showGrouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.cluster}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: clusterColor(group.cluster) }}
                />
                <h2 className="text-sm font-medium capitalize">
                  {group.label || (group.cluster < 0 ? "Not yet connected" : `Context ${group.cluster + 1}`)}
                </h2>
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>
              <div className="space-y-2">{group.items.map(renderMemory)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2">{visibleMemories.map(renderMemory)}</div>
      )}
    </div>
  );
}
