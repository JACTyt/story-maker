"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { portraitUrl, type BibleState, type EntityView } from "@/lib/bibleClient";
import type { EntityKind } from "@/lib/mentions";
import { EntityRow } from "./EntityBits";

export const GROUPS: { type: EntityKind; label: string }[] = [
  { type: "character", label: "Characters" },
  { type: "place", label: "Places" },
  { type: "timeline", label: "Timeline" },
  { type: "theme", label: "Themes" },
];

export function BibleList({
  storyId,
  bible,
  activeKey,
  only,
  onOpen,
  onCreate,
}: {
  storyId: string;
  bible: BibleState;
  activeKey?: string | null;
  only?: EntityKind;
  onOpen: (key: string) => void;
  onCreate: (type: EntityKind) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const match = (v: EntityView) => !q || [v.name, ...v.aliases, v.summary].some((s) => s.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5">
        <Search size={14} className="text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the bible" className="w-full bg-transparent py-1.5 text-sm outline-none" />
      </label>
      {GROUPS.filter((g) => !only || g.type === only).map((group) => {
        const items = bible.views.filter((v) => v.type === group.type && match(v));
        return (
          <section key={group.type}>
            <div className="mb-1 flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {group.label} <span className="font-normal">({items.length})</span>
              </h4>
              <button onClick={() => onCreate(group.type)} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-fg">
                <Plus size={12} /> Add
              </button>
            </div>
            {items.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted">{q ? "No matches." : "Nothing yet."}</p>
            ) : (
              items.map((v) => (
                <EntityRow key={v.key} entity={v} portrait={portraitUrl(storyId, bible.bible, v.key)} active={activeKey === v.key} onClick={() => onOpen(v.key)} />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
