"use client";

/**
 * Who else may see this entry.
 *
 * The ACL on a memory, a note or a scheduled item is the same idea each time — a
 * set of canonical contact ids — so it is the same control each time, and the
 * toggle semantics live here rather than being re-derived per form.
 *
 * Renders nothing when there are no contacts to choose from: a picker with no
 * options is a label and an empty row, which reads as something broken.
 */

import type { Contact } from "@/types/api";

export function PeoplePicker({
  contacts,
  selected,
  onToggle,
  label = "People",
}: {
  contacts: Array<Pick<Contact, "canonical_id" | "name">>;
  selected: string[];
  onToggle: (canonicalId: string) => void;
  label?: string;
}) {
  if (!contacts.length) return null;
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {contacts.map((c) => (
          <label key={c.canonical_id} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(c.canonical_id)}
              onChange={() => onToggle(c.canonical_id)}
              className="h-3.5 w-3.5 accent-primary"
            />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Add or remove one id — the toggle every caller of PeoplePicker was writing itself. */
export function togglePersonId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
