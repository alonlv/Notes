"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Contact } from "@/types/api";
import type { ToastFn } from "./types";

/** The fields this panel actually touches, across notes, tasks and topics. */
interface OwnedItem {
  id: string;
  title?: string;
  name?: string;
  user_id?: string;
  owner_id?: string;
  authorized_ids?: string[];
}

interface UserData {
  notes?: OwnedItem[];
  tasks?: OwnedItem[];
  topics?: OwnedItem[];
  news_interests?: { id: string; query: string }[];
  memories?: { id: string; content: string }[];
}

type OwnedKind = "notes" | "tasks" | "topics";

/** The three resources whose owner and access list can be reassigned here.
 *  They were three copies of the same block; the only difference is the label. */
const EDITABLE: { key: OwnedKind; label: string }[] = [
  { key: "notes", label: "Notes" },
  { key: "tasks", label: "Tasks" },
  { key: "topics", label: "Topics" },
];

export function DataManager({ contacts, toast }: { contacts: Contact[]; toast: ToastFn }) {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUserData() {
    if (!userId.trim()) {
      toast("Enter a user ID first", "error");
      return;
    }
    setLoading(true);
    try {
      setData(await api.userData.get<UserData>(userId.trim()));
    } catch (e) {
      toast((e as Error).message, "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateData(kind: OwnedKind, id: string, updates: Record<string, unknown>) {
    // Tasks take PATCH, not PUT — a PUT here came back 405 and reassigning a
    // task's owner from this panel silently did nothing.
    const write = {
      notes: () => api.notes.update(id, updates),
      tasks: () => api.tasks.update(id, updates),
      topics: () => api.topics.update(id, updates),
    }[kind];

    try {
      await write();
      toast("Updated successfully", "success");
      loadUserData(); // Refresh data
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {contacts.length > 0 ? (
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a person…</option>
            {contacts.map((c) => (
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
          {EDITABLE.map(({ key, label }) => {
            const items = data[key] ?? [];
            return (
              <Section key={key} title={label} count={items.length} empty={`No ${label.toLowerCase()}`}>
                {items.map((item) => (
                  <DataItem
                    key={item.id}
                    item={item}
                    contacts={contacts}
                    onUpdate={(updates) => updateData(key, item.id, updates)}
                  />
                ))}
              </Section>
            );
          })}

          <Section
            title="News Interests"
            count={data.news_interests?.length ?? 0}
            empty="No news interests"
          >
            {(data.news_interests ?? []).map((interest) => (
              <ReadOnlyRow key={interest.id} id={interest.id} text={interest.query} />
            ))}
          </Section>

          <Section title="Memories" count={data.memories?.length ?? 0} empty="No memories">
            {(data.memories ?? []).slice(0, 10).map((memory) => (
              <ReadOnlyRow key={memory.id} id={memory.id} text={memory.content} />
            ))}
            {(data.memories?.length ?? 0) > 10 && (
              <p className="text-xs text-muted-foreground">
                … and {data.memories!.length - 10} more
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

/** A titled block that says so when it is empty — `[].map()` is truthy, so the
 *  `map(...) || <empty>` this replaced never showed the empty state at all. */
function Section({
  title, count, empty, children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title} ({count})</h3>
      <div className="space-y-2">
        {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
      </div>
    </div>
  );
}

function ReadOnlyRow({ id, text }: { id: string; text: string }) {
  return (
    <div className="rounded border p-3 text-sm">
      <p className="text-xs text-muted-foreground mb-1">ID: {id}</p>
      <p>{text}</p>
    </div>
  );
}

function DataItem({
  item, contacts, onUpdate,
}: {
  item: OwnedItem;
  contacts: Contact[];
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState(item.user_id ?? "");
  const [authorizedIds, setAuthorizedIds] = useState((item.authorized_ids ?? []).join(", "));

  function handleSave() {
    const updates: Record<string, unknown> = {};
    if (userId !== item.user_id) updates.user_id = userId;
    const authIds = authorizedIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify(authIds) !== JSON.stringify(item.authorized_ids)) {
      updates.authorized_ids = authIds;
    }
    if (Object.keys(updates).length > 0) onUpdate(updates);
    setEditing(false);
  }

  return (
    <div className="rounded border p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title || item.name || "Untitled"}</p>
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
            <label className="block text-xs text-muted-foreground mb-1">
              Authorized IDs (comma-separated)
            </label>
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
          <p>Person: {contacts.find((c) => c.canonical_id === item.user_id)?.name || item.user_id || "none"}</p>
          <p>Authorized: {item.authorized_ids?.join(", ") || "none"}</p>
        </div>
      )}
    </div>
  );
}
