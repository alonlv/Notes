"use client";

import { useCallback, useSyncExternalStore, ReactNode } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/**
 * A script the browser runs before it paints, so the page never renders in the
 * wrong theme and then corrects itself. Inlined into <head> by the root layout;
 * it is the only thing that decides the class on first load.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
document.documentElement.classList.toggle("dark",t==="dark");
}catch(e){}})()`;

const listeners = new Set<() => void>();

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) applyStored(); };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function set(next: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch { /* private mode — the choice just won't outlive the tab */ }
  document.documentElement.classList.toggle("dark", next === "dark");
  for (const listener of listeners) listener();
}

/** Another tab changed the theme; follow it. */
function applyStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") set(stored);
  } catch { /* nothing to follow */ }
}

/** Kept so the tree still has one place to wrap; the theme itself lives on the
 *  document element, where the pre-paint script already put it. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  return {
    theme,
    toggleTheme: useCallback(() => set(currentTheme() === "dark" ? "light" : "dark"), []),
  };
}
