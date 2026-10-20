import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  chapters,
  characterRelationships,
  characters,
  timelineEventChapters,
  timelineEventCharacters,
  timelineEvents,
} from "./schema";

type TimelineRow = typeof timelineEvents.$inferSelect;
export type TimelineEventWithLinks = TimelineRow & { chapterIds: number[]; characterIds: number[] };

type TimelineInput = Partial<Omit<TimelineRow, "id" | "storyId" | "createdAt" | "updatedAt">> & {
  chapterIds?: number[];
  characterIds?: number[];
};

/** Keeps only ids that belong to this story, so links can never cross story boundaries. */
function ownedIds(table: typeof chapters | typeof characters, storyId: number, ids: number[]): number[] {
  if (ids.length === 0) return [];
  const rows = db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.storyId, storyId), inArray(table.id, ids)))
    .all();
  const owned = new Set(rows.map((r) => r.id));
  return [...new Set(ids)].filter((id) => owned.has(id));
}

function withLinks(event: TimelineRow): TimelineEventWithLinks {
  const chapterIds = db
    .select({ id: timelineEventChapters.chapterId })
    .from(timelineEventChapters)
    .where(eq(timelineEventChapters.eventId, event.id))
    .all()
    .map((r) => r.id);
  const characterIds = db
    .select({ id: timelineEventCharacters.characterId })
    .from(timelineEventCharacters)
    .where(eq(timelineEventCharacters.eventId, event.id))
    .all()
    .map((r) => r.id);
  return { ...event, chapterIds, characterIds };
}

function syncLinks(storyId: number, eventId: number, input: TimelineInput): void {
  if (input.chapterIds) {
    db.delete(timelineEventChapters).where(eq(timelineEventChapters.eventId, eventId)).run();
    for (const chapterId of ownedIds(chapters, storyId, input.chapterIds)) {
      db.insert(timelineEventChapters).values({ eventId, chapterId }).run();
    }
  }
  if (input.characterIds) {
    db.delete(timelineEventCharacters).where(eq(timelineEventCharacters.eventId, eventId)).run();
    for (const characterId of ownedIds(characters, storyId, input.characterIds)) {
      db.insert(timelineEventCharacters).values({ eventId, characterId }).run();
    }
  }
}

export function listTimelineEvents(storyId: number): TimelineEventWithLinks[] {
  return db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.storyId, storyId))
    .orderBy(asc(timelineEvents.sortOrder), asc(timelineEvents.id))
    .all()
    .map(withLinks);
}

export function getTimelineEvent(storyId: number, id: number): TimelineEventWithLinks | undefined {
  const row = db
    .select()
    .from(timelineEvents)
    .where(and(eq(timelineEvents.id, id), eq(timelineEvents.storyId, storyId)))
    .get();
  return row ? withLinks(row) : undefined;
}

export function createTimelineEvent(storyId: number, input: TimelineInput & { title: string }): TimelineEventWithLinks {
  const { chapterIds, characterIds, ...fields } = input;
  const row = db
    .insert(timelineEvents)
    .values({ ...fields, storyId })
    .returning()
    .get();
  syncLinks(storyId, row.id, { chapterIds, characterIds });
  return withLinks(row);
}

export function updateTimelineEvent(storyId: number, id: number, input: TimelineInput): TimelineEventWithLinks | undefined {
  if (!getTimelineEvent(storyId, id)) return undefined;
  const { chapterIds, characterIds, ...fields } = input;
  db.update(timelineEvents)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(timelineEvents.id, id))
    .run();
  syncLinks(storyId, id, { chapterIds, characterIds });
  return getTimelineEvent(storyId, id);
}

export function deleteTimelineEvent(storyId: number, id: number): void {
  db.delete(timelineEvents)
    .where(and(eq(timelineEvents.id, id), eq(timelineEvents.storyId, storyId)))
    .run();
}

// ---------- relationships ----------

export type Relationship = typeof characterRelationships.$inferSelect;

export function listRelationships(storyId: number): Relationship[] {
  return db.select().from(characterRelationships).where(eq(characterRelationships.storyId, storyId)).all();
}

export function createRelationship(
  storyId: number,
  input: { fromCharacterId: number; toCharacterId: number; label: string }
): Relationship | null {
  if (input.fromCharacterId === input.toCharacterId) return null;
  if (ownedIds(characters, storyId, [input.fromCharacterId, input.toCharacterId]).length !== 2) return null;
  return db
    .insert(characterRelationships)
    .values({ ...input, storyId })
    .returning()
    .get();
}

export function updateRelationshipLabel(storyId: number, id: number, label: string): Relationship | undefined {
  return db
    .update(characterRelationships)
    .set({ label })
    .where(and(eq(characterRelationships.id, id), eq(characterRelationships.storyId, storyId)))
    .returning()
    .get();
}

export function deleteRelationship(storyId: number, id: number): void {
  db.delete(characterRelationships)
    .where(and(eq(characterRelationships.id, id), eq(characterRelationships.storyId, storyId)))
    .run();
}
