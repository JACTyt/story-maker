import { suggestionKey, type SuggestionMarker } from "./suggestions";

const DISMISSED_STORAGE_PREFIX = "story-maker.dismissedSuggestions.";

type KnownKeys = {
  /** Keys of entities already recorded in the story bible. */
  existing: string[];
  /** Keys the writer has dismissed for this chapter. */
  dismissed: string[];
  /** Keys already on screen as pending notes. */
  pending: string[];
};

/**
 * Narrows freshly parsed markers to the ones worth showing.
 *
 * Chat history is re-parsed on every mount, so without this a suggestion the
 * writer already accepted or dismissed would return as a new note on reload.
 */
export function selectNewSuggestions(markers: SuggestionMarker[], known: KnownKeys): SuggestionMarker[] {
  const seen = new Set([...known.existing, ...known.dismissed, ...known.pending].map((k) => k.toLowerCase()));
  const fresh: SuggestionMarker[] = [];
  for (const marker of markers) {
    const key = suggestionKey(marker);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(marker);
  }
  return fresh;
}

function storageKey(chapterId: string): string {
  return `${DISMISSED_STORAGE_PREFIX}${chapterId}`;
}

export function loadDismissedKeys(chapterId: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(chapterId)) ?? "[]");
    return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : [];
  } catch {
    // Malformed or unavailable storage should not cost the writer their notes.
    return [];
  }
}

export function rememberDismissedKey(chapterId: string, key: string): void {
  const next = new Set(loadDismissedKeys(chapterId));
  next.add(key);
  try {
    localStorage.setItem(storageKey(chapterId), JSON.stringify([...next]));
  } catch {
    // Dismissal is a convenience; losing it is better than breaking the page.
  }
}
