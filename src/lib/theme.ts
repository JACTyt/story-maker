export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "story-maker.theme";

const listeners = new Set<() => void>();

export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function subscribeTheme(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage blocked: the theme still applies for this page view
  }
  listeners.forEach((notify) => notify());
}

/**
 * Runs before first paint (inlined in the root layout), so a dark-theme reader
 * never sees a white flash while React hydrates.
 */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)})==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
