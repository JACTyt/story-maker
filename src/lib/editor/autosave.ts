export const DRAFT_DELAY_MS = 1500;
export const VERSION_EVERY_MS = 5 * 60_000;

type AutosaveOptions = {
  saveDraft: (content: string) => void;
  saveVersion: (content: string) => void;
  now?: () => number;
  draftDelayMs?: number;
  versionEveryMs?: number;
};

/**
 * Decides when typing becomes a cheap draft save and when it becomes a history
 * entry. Drafts keep the server current; versions are cut on explicit save, on
 * leaving, or when enough time has passed — never on every pause.
 */
export function createAutosave({
  saveDraft,
  saveVersion,
  now = Date.now,
  draftDelayMs = DRAFT_DELAY_MS,
  versionEveryMs = VERSION_EVERY_MS,
}: AutosaveOptions) {
  let latest = "";
  let unversioned = false;
  let lastVersionAt = now();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function cutVersion() {
    clearTimer();
    if (!unversioned) return;
    saveVersion(latest);
    unversioned = false;
    lastVersionAt = now();
  }

  return {
    change(content: string) {
      latest = content;
      unversioned = true;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        if (now() - lastVersionAt >= versionEveryMs) cutVersion();
        else saveDraft(latest);
      }, draftDelayMs);
    },
    /** Ctrl+S. */
    saveNow: cutVersion,
    /** Leaving the chapter. */
    flush: cutVersion,
    /** Something else already recorded a version (generation, revert). */
    markVersioned(content: string) {
      clearTimer();
      latest = content;
      unversioned = false;
      lastVersionAt = now();
    },
    dispose: clearTimer,
  };
}

export type Autosave = ReturnType<typeof createAutosave>;
