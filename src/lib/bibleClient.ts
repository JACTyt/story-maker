"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Bible } from "@/db/bible";
import { bibleMentionEntities } from "@/lib/bibleEntities";
import { buildMatcher, entityKey, type EntityKind, type Matcher } from "@/lib/mentions";

export type { Bible };
export type CharacterRow = Bible["characters"][number];
export type PlaceRow = Bible["places"][number];
export type ThemeRow = Bible["themes"][number];
export type TimelineRow = Bible["timeline"][number];

/** One shape for any bible entry, so cards, rails and pickers render every type alike. */
export type EntityView = {
  key: string;
  type: EntityKind;
  id: number;
  name: string;
  aliases: string[];
  /** role for characters, kind for places, date label for events */
  label: string;
  summary: string;
};

const truncate = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function entityViews(bible: Bible | null): EntityView[] {
  if (!bible) return [];
  return [
    ...bible.characters.map((c) => ({
      key: entityKey("character", c.id),
      type: "character" as const,
      id: c.id,
      name: c.name,
      aliases: c.aliases,
      label: c.role,
      summary: truncate(c.summary || c.personality || c.appearance),
    })),
    ...bible.places.map((p) => ({
      key: entityKey("place", p.id),
      type: "place" as const,
      id: p.id,
      name: p.name,
      aliases: p.aliases,
      label: p.kind,
      summary: truncate(p.summary || p.description),
    })),
    ...bible.timeline.map((t) => ({
      key: entityKey("timeline", t.id),
      type: "timeline" as const,
      id: t.id,
      name: t.title,
      aliases: t.aliases,
      label: t.inStoryDateLabel,
      summary: truncate(t.description),
    })),
    ...bible.themes.map((t) => ({
      key: entityKey("theme", t.id),
      type: "theme" as const,
      id: t.id,
      name: t.name,
      aliases: [],
      label: "theme",
      summary: truncate(t.description),
    })),
  ];
}

export const RESOURCE_PATH: Record<EntityKind, string> = {
  character: "characters",
  place: "places",
  timeline: "timeline",
  theme: "themes",
};

export function portraitUrl(storyId: string, bible: Bible | null, key: string): string | null {
  const imageId = bible?.portraits[key];
  return imageId ? `/api/stories/${storyId}/images/${imageId}` : null;
}

export function useBible(storyId: string) {
  const [bible, setBible] = useState<Bible | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return fetch(`/api/stories/${storyId}/bible`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Bible) => {
        setBible(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load the story bible."));
  }, [storyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const views = useMemo(() => entityViews(bible), [bible]);
  const byKey = useMemo(() => new Map(views.map((v) => [v.key, v])), [views]);
  const matcher: Matcher = useMemo(() => buildMatcher(bible ? bibleMentionEntities(bible) : []), [bible]);

  return { bible, error, refresh, views, byKey, matcher };
}

export type BibleState = ReturnType<typeof useBible>;
