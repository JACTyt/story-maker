"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

export type Suggestion = { type: "character" | "scene" | "theme" | "timeline"; name: string; description: string };

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
  const [description, setDescription] = useState(suggestion.description);

  return (
    <div className="carbon-note rounded-sm p-3 text-sm shadow-lg shadow-black/30">
      <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-carbon">
        Margin note &middot; new {suggestion.type}
      </div>
      <input
        className="mb-2 w-full border-b border-carbon/40 bg-transparent pb-1 font-display text-base text-paper focus:border-carbon focus:outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="mb-3 w-full resize-none bg-transparent text-paper/80 focus:outline-none"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex gap-3">
        <button
          onClick={() => onAccept({ type: suggestion.type, name, description })}
          className="flex items-center gap-1 text-fountain underline hover:text-paper"
        >
          <Check size={13} /> Accept
        </button>
        <button onClick={onDismiss} className="flex items-center gap-1 text-paper/50 underline hover:text-paper/80">
          <X size={13} /> Dismiss
        </button>
      </div>
    </div>
  );
}
