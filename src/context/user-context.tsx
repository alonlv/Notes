"use client";

import { useCallback, useSyncExternalStore, ReactNode } from "react";

interface SelectedUser {
  id: string;
  name: string;
}

const STORAGE_KEY = "selected-user";

/**
 * Which person the app is scoped to, kept in localStorage.
 *
 * Nearly every page reads this, so losing it on reload meant coming back to a
 * different person's memory than the one you were looking at. It lives outside
 * React because that is where it survives: `useSyncExternalStore` subscribes to
 * it and renders `null` on the server, so there is no hydration mismatch and no
 * setState-in-an-effect to cascade a second render.
 */
const listeners = new Set<() => void>();
let snapshot: string | null = null;
let parsed: SelectedUser | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode, or storage disabled
  }
}

/** The raw string is the snapshot: identical reads must be identical values. */
function getSnapshot(): string | null {
  return read();
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab switching person should switch this one too.
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) listener(); };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: SelectedUser | null) {
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* the choice just won't outlive the tab */ }
  for (const listener of listeners) listener();
}

/** Parse once per distinct stored value rather than on every render. */
function parse(raw: string | null): SelectedUser | null {
  if (raw !== snapshot) {
    snapshot = raw;
    try {
      const value = raw ? JSON.parse(raw) : null;
      parsed = typeof value?.id === "string" && typeof value?.name === "string" ? value : null;
    } catch {
      parsed = null;
    }
  }
  return parsed;
}

/** Kept as a provider so the tree still has one place to wrap, and callers do
 *  not have to change; the value itself no longer lives in React state. */
export function UserProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSelectedUser() {
  const user = parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
  return {
    selectedUserId: user?.id ?? null,
    selectedUserName: user?.name ?? null,
    setSelectedUser: useCallback((id: string, name: string) => write({ id, name }), []),
    clearSelectedUser: useCallback(() => write(null), []),
  };
}
