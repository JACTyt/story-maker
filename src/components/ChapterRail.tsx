"use client";

import { useMemo } from "react";
import { portraitUrl, type BibleState } from "@/lib/bibleClient";
import { countMentions } from "@/lib/mentions";
import { EntityRow } from "./EntityBits";

/** "In this chapter": who and where the current prose is about, plus events linked to the chapter. */
export function ChapterRail({
  storyId,
  bible,
  chapterId,
  prose,
  activeKey,
  onOpen,
  onFocus,
}: {
  storyId: string;
  bible: BibleState;
  chapterId: number;
  prose: string;
  activeKey: string | null;
  onOpen: (key: string) => void;
  onFocus: (key: string | null) => void;
}) {
  const groups = useMemo(() => {
    const counts = countMentions(prose, bible.matcher);
    const linkedEvents = (bible.bible?.timeline ?? []).filter((t) => t.chapterIds.includes(chapterId)).map((t) => `timeline:${t.id}`);
    const present = bible.views.filter((v) => counts.has(v.key) || linkedEvents.includes(v.key));
    const byCount = (a: { key: string }, b: { key: string }) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0);
    return [
      { label: "Characters", items: present.filter((v) => v.type === "character").sort(byCount) },
      { label: "Places", items: present.filter((v) => v.type === "place").sort(byCount) },
      { label: "Events", items: present.filter((v) => v.type === "timeline") },
      { label: "Themes", items: present.filter((v) => v.type === "theme") },
    ].filter((g) => g.items.length > 0);
  }, [prose, bible.matcher, bible.bible, bible.views, chapterId]);

  return (
    <nav aria-label="In this chapter" className="h-full overflow-y-auto border-l border-line bg-surface-2 px-2.5 py-3">
      <h3 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">In this chapter</h3>
      {groups.length === 0 && <p className="px-1 text-sm text-muted">No characters, places or events mentioned yet.</p>}
      {groups.map((g) => (
        <section key={g.label} className="mb-4">
          <h4 className="mb-1 px-1 text-[10px] uppercase tracking-widest text-muted">{g.label}</h4>
          {g.items.map((v) => (
            <EntityRow
              key={v.key}
              entity={v}
              portrait={portraitUrl(storyId, bible.bible, v.key)}
              active={activeKey === v.key}
              onClick={() => onOpen(v.key)}
              onHover={(on) => onFocus(on ? v.key : null)}
            />
          ))}
        </section>
      ))}
      {groups.length > 0 && <p className="px-1 text-[11px] text-muted">Hover a name to light up its mentions.</p>}
    </nav>
  );
}
