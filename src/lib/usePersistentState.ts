"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage blocked: fall back to this tab's memory.
    return memory.get(key) ?? null;
  }
}

function write(key: string, raw: string): void {
  memory.set(key, raw);
  try {
    localStorage.setItem(key, raw);
  } catch {
    // keep the in-memory copy
  }
  listeners.get(key)?.forEach((notify) => notify());
}

/**
 * Per-browser UI preference (panel visibility, widths). The server render and
 * hydration use the default; the stored value takes over right after.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (notify: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(notify);
      listeners.set(key, set);
      return () => set.delete(notify);
    },
    [key]
  );
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);

  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
    // `initial` is a literal default; re-parsing only when the stored value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = (() => {
        const stored = read(key);
        try {
          return stored === null ? initial : (JSON.parse(stored) as T);
        } catch {
          return initial;
        }
      })();
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      write(key, JSON.stringify(resolved));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, setValue];
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
