"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { SuggestionMarker } from "@/lib/suggestions";
import { TypeChip } from "./EntityBits";

export type Suggestion = SuggestionMarker;

const field = "w-full resize-none rounded-md bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-surface-2";

export function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: Suggestion;
  onAccept: (s: Suggestion) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(suggestion.name);
  const [description, setDescription] = useState(suggestion.type === "character" ? "" : suggestion.description);
  const [appearance, setAppearance] = useState(suggestion.type === "character" ? suggestion.appearance : "");
  const [personality, setPersonality] = useState(suggestion.type === "character" ? suggestion.personality : "");

  // Optional AI-proposed extras ride along untouched, and only when present.
  const extras = Object.fromEntries(
    (["aliases", "role", "summary", "kind"] as const).filter((k) => suggestion[k] !== undefined).map((k) => [k, suggestion[k]])
  );

  function accept() {
    if (suggestion.type === "character") {
      onAccept({ type: "character", name, appearance, personality, ...extras });
    } else {
      onAccept({ type: suggestion.type, name, description, ...extras });
    }
  }

  const type = suggestion.type === "timeline" ? "timeline" : suggestion.type;

  return (
    <div className={`t-${type} rounded-xl border border-dashed border-[var(--c)] bg-surface p-3 text-sm`}>
      <div className="mb-1.5 flex items-center gap-2">
        <TypeChip type={type}>New {suggestion.type === "timeline" ? "event" : suggestion.type}</TypeChip>
        {(suggestion.role || suggestion.kind) && <span className="text-xs text-muted">{suggestion.role ?? suggestion.kind}</span>}
      </div>
      <input className={`${field} text-base font-semibold`} value={name} onChange={(e) => setName(e.target.value)} />
      {suggestion.aliases && suggestion.aliases.length > 0 && <p className="px-1 text-xs text-muted">aka {suggestion.aliases.join(", ")}</p>}
      {suggestion.summary && <p className="px-1 text-xs italic text-muted">{suggestion.summary}</p>}
      {suggestion.type === "character" ? (
        <>
          <div className="mt-1.5 px-1 text-[10px] uppercase tracking-widest text-muted">Appearance</div>
          <textarea className={field} value={appearance} onChange={(e) => setAppearance(e.target.value)} />
          <div className="px-1 text-[10px] uppercase tracking-widest text-muted">Personality</div>
          <textarea className={field} value={personality} onChange={(e) => setPersonality(e.target.value)} />
        </>
      ) : (
        <textarea className={`${field} mt-1`} value={description} onChange={(e) => setDescription(e.target.value)} />
      )}
      <div className="mt-2 flex gap-2">
        <button onClick={accept} className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg">
          <Check size={13} /> Accept
        </button>
        <button onClick={onDismiss} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted hover:text-fg">
          <X size={13} /> Dismiss
        </button>
      </div>
    </div>
  );
}
