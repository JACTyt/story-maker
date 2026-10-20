import fs from "node:fs";
import path from "node:path";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "./client";
import {
  chapters,
  characterRelationships,
  characters,
  chatMessages,
  images,
  places,
  proseVersions,
  stories,
  themes,
  timelineEventChapters,
  timelineEventCharacters,
  timelineEvents,
} from "./schema";
import { imageFilePath } from "./images";

type IdMap = Map<number, number>;
type Story = typeof stories.$inferSelect;

/** Drops the identity and timestamps so a row can be re-inserted as a new one. */
function fresh<T extends { id: number }>(row: T): Omit<T, "id" | "createdAt" | "updatedAt"> {
  const rest: Record<string, unknown> = { ...row };
  delete rest.id;
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest as Omit<T, "id" | "createdAt" | "updatedAt">;
}

const mapped = (map: IdMap, id: number | null) => (id === null ? null : (map.get(id) ?? null));

/**
 * Copies a whole story — chapters with their full draft history and chat,
 * the bible with every link between entries, and images including their files.
 * Manual entity links inside prose point at the copies, not the originals.
 */
export function duplicateStory(storyId: number): Story | null {
  const original = db.select().from(stories).where(eq(stories.id, storyId)).get();
  if (!original) return null;

  const fileCopies: { from: string; to: string }[] = [];

  const copy = db.transaction((tx) => {
    const story = tx
      .insert(stories)
      .values({ ...fresh(original), title: `${original.title} (copy)` })
      .returning()
      .get();

    const ids = { chapter: new Map(), character: new Map(), place: new Map(), timeline: new Map(), theme: new Map() } as Record<
      "chapter" | "character" | "place" | "timeline" | "theme",
      IdMap
    >;

    // Bible first: prose links are rewritten against these maps.
    for (const row of tx.select().from(characters).where(eq(characters.storyId, storyId)).orderBy(asc(characters.id)).all()) {
      ids.character.set(row.id, tx.insert(characters).values({ ...fresh(row), storyId: story.id }).returning().get().id);
    }
    for (const row of tx.select().from(themes).where(eq(themes.storyId, storyId)).orderBy(asc(themes.id)).all()) {
      ids.theme.set(row.id, tx.insert(themes).values({ ...fresh(row), storyId: story.id }).returning().get().id);
    }
    const chapterRows = tx.select().from(chapters).where(eq(chapters.storyId, storyId)).orderBy(asc(chapters.id)).all();
    for (const row of chapterRows) {
      ids.chapter.set(
        row.id,
        tx.insert(chapters).values({ ...fresh(row), storyId: story.id, currentVersionId: null }).returning().get().id
      );
    }
    const placeRows = tx.select().from(places).where(eq(places.storyId, storyId)).orderBy(asc(places.id)).all();
    for (const row of placeRows) {
      ids.place.set(
        row.id,
        tx.insert(places).values({ ...fresh(row), storyId: story.id, parentPlaceId: null, chapterId: mapped(ids.chapter, row.chapterId) }).returning().get().id
      );
    }
    // Parents may have been inserted after their children, so link them in a second pass.
    for (const row of placeRows) {
      if (row.parentPlaceId === null) continue;
      tx.update(places).set({ parentPlaceId: mapped(ids.place, row.parentPlaceId) }).where(eq(places.id, ids.place.get(row.id)!)).run();
    }
    for (const row of tx.select().from(timelineEvents).where(eq(timelineEvents.storyId, storyId)).orderBy(asc(timelineEvents.id)).all()) {
      ids.timeline.set(
        row.id,
        tx.insert(timelineEvents).values({ ...fresh(row), storyId: story.id, placeId: mapped(ids.place, row.placeId) }).returning().get().id
      );
    }

    const relink = (text: string | null) =>
      text?.replace(/entity:(character|place|timeline|theme)\/(\d+)/g, (all, type: keyof typeof ids, id: string) => {
        const next = ids[type].get(Number(id));
        return next ? `entity:${type}/${next}` : all;
      }) ?? null;

    // Relationships and event links.
    for (const row of tx.select().from(characterRelationships).where(eq(characterRelationships.storyId, storyId)).all()) {
      tx.insert(characterRelationships)
        .values({
          storyId: story.id,
          fromCharacterId: ids.character.get(row.fromCharacterId)!,
          toCharacterId: ids.character.get(row.toCharacterId)!,
          label: row.label,
        })
        .run();
    }
    const oldEvents = [...ids.timeline.keys()];
    if (oldEvents.length > 0) {
      for (const row of tx.select().from(timelineEventChapters).where(inArray(timelineEventChapters.eventId, oldEvents)).all()) {
        tx.insert(timelineEventChapters).values({ eventId: ids.timeline.get(row.eventId)!, chapterId: ids.chapter.get(row.chapterId)! }).run();
      }
      for (const row of tx.select().from(timelineEventCharacters).where(inArray(timelineEventCharacters.eventId, oldEvents)).all()) {
        tx.insert(timelineEventCharacters).values({ eventId: ids.timeline.get(row.eventId)!, characterId: ids.character.get(row.characterId)! }).run();
      }
    }

    // Chapters' content: chat, then versions in order so parents exist before children.
    for (const row of chapterRows) {
      const newChapterId = ids.chapter.get(row.id)!;
      for (const msg of tx.select().from(chatMessages).where(eq(chatMessages.chapterId, row.id)).orderBy(asc(chatMessages.id)).all()) {
        tx.insert(chatMessages).values({ ...fresh(msg), chapterId: newChapterId, createdAt: msg.createdAt }).run();
      }
      const versionIds: IdMap = new Map();
      for (const v of tx.select().from(proseVersions).where(eq(proseVersions.chapterId, row.id)).orderBy(asc(proseVersions.id)).all()) {
        const created = tx
          .insert(proseVersions)
          .values({
            ...fresh(v),
            chapterId: newChapterId,
            content: relink(v.content)!,
            parentVersionId: mapped(versionIds, v.parentVersionId),
            createdAt: v.createdAt,
          })
          .returning()
          .get();
        versionIds.set(v.id, created.id);
      }
      tx.update(chapters)
        .set({ generatedProse: relink(row.generatedProse), currentVersionId: mapped(versionIds, row.currentVersionId) })
        .where(eq(chapters.id, newChapterId))
        .run();
    }

    tx.update(stories).set({ compiledProse: relink(original.compiledProse) }).where(eq(stories.id, story.id)).run();

    // Images: same content-addressed name, new story folder.
    const ownerMap = { character: ids.character, place: ids.place, chapter: ids.chapter } as Record<string, IdMap>;
    for (const row of tx.select().from(images).where(eq(images.storyId, storyId)).all()) {
      const entityId = row.entityType === "story" ? story.id : ownerMap[row.entityType]?.get(row.entityId);
      if (!entityId) continue;
      const created = tx
        .insert(images)
        .values({ ...fresh(row), storyId: story.id, entityId })
        .returning()
        .get();
      fileCopies.push({ from: imageFilePath(row), to: imageFilePath(created) });
    }

    return tx.select().from(stories).where(eq(stories.id, story.id)).get()!;
  });

  for (const { from, to } of fileCopies) {
    if (!fs.existsSync(from) || fs.existsSync(to)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }

  return copy;
}
