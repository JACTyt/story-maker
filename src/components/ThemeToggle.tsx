"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, subscribeTheme } from "@/lib/theme";

export function ThemeToggle() {
  // The boot script already set the attribute; the server cannot know it.
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  return (
    <button
      onClick={() => applyTheme(theme === "light" ? "dark" : "light")}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
