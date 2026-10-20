import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { stories, chapters, characters, places, themes, chatMessages } from "./schema";
import { resetTestDb } from "./testDb";
import { duplicateStory } from "./duplicateStory";
import { recordProseVersion, listProseVersions } from "./proseVersions";
import { createRelationship, createTimelineEvent, listRelationships, listTimelineEvents } from "./storyLinks";
import { storeImage, listImages, imageFilePath } from "./images";

let uploadRoot: string;
beforeEach(() => {
  resetTestDb();
  uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), "story-maker-dup-"));
  process.env.UPLOADS_PATH = uploadRoot;
});
afterEach(() => {
  fs.rmSync(uploadRoot, { recursive: true, force: true });
  delete process.env.UPLOADS_PATH;
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);

function seed() {
  const storyId = db.insert(stories).values({ title: "Harbour", premise: "p", defaultModel: "m" }).returning().get().id;
  const ch = db.insert(chapters).values({ storyId, title: "One", orderIndex: 0 }).returning().get().id;
  const liz = db.insert(characters).values({ storyId, name: "Liz", aliases: ["Elizabeth"] }).returning().get().id;
  const tom = db.insert(characters).values({ storyId, name: "Tom" }).returning().get().id;
  const town = db.insert(places).values({ storyId, name: "Town" }).returning().get().id;
  const dock = db.insert(places).values({ storyId, name: "Dock", parentPlaceId: town }).returning().get().id;
  db.insert(themes).values({ storyId, name: "Gothic" }).run();
  db.insert(chatMessages).values({ chapterId: ch, role: "user", content: "Hi" }).run();
  recordProseVersion(ch, { content: "First.", source: "generated" });
  recordProseVersion(ch, { content: `Then [she](entity:character/${liz}) left.`, source: "edited" });
  createRelationship(storyId, { fromCharacterId: liz, toCharacterId: tom, label: "owes" });
  createTimelineEvent(storyId, { title: "Storm", placeId: dock, chapterIds: [ch], characterIds: [tom] });
  storeImage({ storyId, entityType: "character", entityId: liz, bytes: PNG });
  storeImage({ storyId, entityType: "story", entityId: storyId, bytes: PNG });
  return { storyId, ch, liz, tom, town, dock };
}

describe("duplicateStory", () => {
  it("copies the story with a marked title and its settings", () => {
    const { storyId } = seed();
    const copy = duplicateStory(storyId)!;
    expect(copy.id).not.toBe(storyId);
    expect(copy.title).toBe("Harbour (copy)");
    expect(copy.defaultModel).toBe("m");
  });

  it("copies chapters, chat, and the full version history pointing at the new chapter", () => {
    const { storyId } = seed();
    const copy = duplicateStory(storyId)!;
    const [chapter] = db.select().from(chapters).where(eq(chapters.storyId, copy.id)).all();
    expect(chapter.title).toBe("One");
    expect(db.select().from(chatMessages).where(eq(chatMessages.chapterId, chapter.id)).all()).toHaveLength(1);
    const versions = listProseVersions(chapter.id);
    expect(versions).toHaveLength(2);
    expect(chapter.currentVersionId).toBe(versions[0].id);
    expect(versions[0].parentVersionId).toBe(versions[1].id);
  });

  it("remaps entity links inside prose to the copied entities", () => {
    const { storyId, liz } = seed();
    const copy = duplicateStory(storyId)!;
    const newLiz = db.select().from(characters).where(eq(characters.storyId, copy.id)).all().find((c) => c.name === "Liz")!;
    const [chapter] = db.select().from(chapters).where(eq(chapters.storyId, copy.id)).all();
    expect(newLiz.id).not.toBe(liz);
    expect(chapter.generatedProse).toBe(`Then [she](entity:character/${newLiz.id}) left.`);
    expect(listProseVersions(chapter.id)[0].content).toContain(`entity:character/${newLiz.id}`);
  });

  it("copies the bible with its internal links remapped", () => {
    const { storyId } = seed();
    const copy = duplicateStory(storyId)!;
    const copiedPlaces = db.select().from(places).where(eq(places.storyId, copy.id)).all();
    const town = copiedPlaces.find((p) => p.name === "Town")!;
    expect(copiedPlaces.find((p) => p.name === "Dock")!.parentPlaceId).toBe(town.id);

    const copiedChars = db.select().from(characters).where(eq(characters.storyId, copy.id)).all();
    const [rel] = listRelationships(copy.id);
    expect(copiedChars.map((c) => c.id)).toContain(rel.fromCharacterId);
    expect(copiedChars.find((c) => c.name === "Liz")!.aliases).toEqual(["Elizabeth"]);

    const [event] = listTimelineEvents(copy.id);
    const [chapter] = db.select().from(chapters).where(eq(chapters.storyId, copy.id)).all();
    expect(event.chapterIds).toEqual([chapter.id]);
    expect(event.characterIds).toEqual([copiedChars.find((c) => c.name === "Tom")!.id]);
    expect(event.placeId).toBe(copiedPlaces.find((p) => p.name === "Dock")!.id);
  });

  it("copies images, including the cover, as files of the new story", () => {
    const { storyId } = seed();
    const copy = duplicateStory(storyId)!;
    const lizCopy = db.select().from(characters).where(eq(characters.storyId, copy.id)).all().find((c) => c.name === "Liz")!;
    const [portrait] = listImages("character", lizCopy.id);
    expect(portrait.storyId).toBe(copy.id);
    expect(portrait.isPrimary).toBe(true);
    expect(fs.existsSync(imageFilePath(portrait))).toBe(true);
    expect(listImages("story", copy.id)).toHaveLength(1);
  });

  it("leaves the original untouched and returns null for an unknown story", () => {
    const { storyId } = seed();
    duplicateStory(storyId);
    expect(db.select().from(chapters).where(eq(chapters.storyId, storyId)).all()).toHaveLength(1);
    expect(duplicateStory(99999)).toBeNull();
  });
});
