import { asc, eq } from "drizzle-orm";
import { db } from "./client";
import { chapters, characters, places, themes } from "./schema";
import { listRelationships, listTimelineEvents, type Relationship, type TimelineEventWithLinks } from "./storyLinks";
import { primaryImages } from "./images";
import { buildMatcher, countMentions } from "@/lib/mentions";
import { bibleMentionEntities } from "@/lib/bibleEntities";

export { bibleMentionEntities };

export type CharacterRow = typeof characters.$inferSelect;
export type PlaceRow = typeof places.$inferSelect;
export type ThemeRow = typeof themes.$inferSelect;
export type ChapterSummary = { id: number; title: string; orderIndex: number; status: string };
export type Appearance = { chapterId: number; count: number };

export type Bible = {
  characters: CharacterRow[];
  places: PlaceRow[];
  themes: ThemeRow[];
  timeline: TimelineEventWithLinks[];
  relationships: Relationship[];
  chapters: ChapterSummary[];
  /** entity key → image id of its portrait */
  portraits: Record<string, number>;
  /** entity key → chapters it is mentioned in, in reading order */
  appearances: Record<string, Appearance[]>;
};

/**
 * Everything the chapter page and the bible page need, in one read: the
 * entities, their portraits, and where each one appears across the manuscript.
 */
export function loadBible(storyId: number): Bible {
  const chapterRows = db
    .select()
    .from(chapters)
    .where(eq(chapters.storyId, storyId))
    .orderBy(asc(chapters.orderIndex), asc(chapters.id))
    .all();

  const base = {
    characters: db.select().from(characters).where(eq(characters.storyId, storyId)).orderBy(asc(characters.id)).all(),
    places: db.select().from(places).where(eq(places.storyId, storyId)).orderBy(asc(places.id)).all(),
    themes: db.select().from(themes).where(eq(themes.storyId, storyId)).orderBy(asc(themes.id)).all(),
    timeline: listTimelineEvents(storyId),
  };

  const portraits: Record<string, number> = {};
  for (const type of ["character", "place"] as const) {
    for (const image of primaryImages(storyId, type)) portraits[`${type}:${image.entityId}`] = image.id;
  }

  const matcher = buildMatcher(bibleMentionEntities(base));
  const appearances: Record<string, Appearance[]> = {};
  for (const chapter of chapterRows) {
    for (const [key, count] of countMentions(chapter.generatedProse ?? "", matcher)) {
      (appearances[key] ??= []).push({ chapterId: chapter.id, count });
    }
  }

  return {
    ...base,
    relationships: listRelationships(storyId),
    chapters: chapterRows.map(({ id, title, orderIndex, status }) => ({ id, title, orderIndex, status })),
    portraits,
    appearances,
  };
}
