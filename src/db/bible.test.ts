import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { stories, chapters, characters, places, themes } from "./schema";
import { resetTestDb } from "./testDb";
import { loadBible, bibleMentionEntities } from "./bible";
import { createTimelineEvent, createRelationship } from "./storyLinks";

let storyId: number;
let ch1: number;
let ch2: number;
let liz: number;
let tom: number;

function setProse(chapterId: number, prose: string) {
  db.update(chapters).set({ generatedProse: prose }).where(eq(chapters.id, chapterId)).run();
}

beforeEach(() => {
  resetTestDb();
  storyId = db.insert(stories).values({ title: "S" }).returning().get().id;
  ch1 = db.insert(chapters).values({ storyId, title: "One", orderIndex: 0 }).returning().get().id;
  ch2 = db.insert(chapters).values({ storyId, title: "Two", orderIndex: 1 }).returning().get().id;
  liz = db.insert(characters).values({ storyId, name: "Elizabeth", aliases: ["Liz"] }).returning().get().id;
  tom = db.insert(characters).values({ storyId, name: "Tom" }).returning().get().id;
});

describe("loadBible", () => {
  it("returns every entity type, relationships and chapters", () => {
    db.insert(places).values({ storyId, name: "Harbour" }).run();
    db.insert(themes).values({ storyId, name: "Inheritance" }).run();
    createTimelineEvent(storyId, { title: "Storm", chapterIds: [ch1] });
    createRelationship(storyId, { fromCharacterId: liz, toCharacterId: tom, label: "owes" });

    const bible = loadBible(storyId);
    expect(bible.characters.map((c) => c.name)).toEqual(["Elizabeth", "Tom"]);
    expect(bible.places).toHaveLength(1);
    expect(bible.themes).toHaveLength(1);
    expect(bible.timeline[0].chapterIds).toEqual([ch1]);
    expect(bible.relationships).toHaveLength(1);
    expect(bible.chapters.map((c) => c.title)).toEqual(["One", "Two"]);
  });

  it("reports where each entity appears, per chapter, with counts", () => {
    setProse(ch1, "Liz and Tom. Liz again.");
    setProse(ch2, `Only [her](entity:character/${liz}).`);

    const { appearances } = loadBible(storyId);
    expect(appearances[`character:${liz}`]).toEqual([
      { chapterId: ch1, count: 2 },
      { chapterId: ch2, count: 1 },
    ]);
    expect(appearances[`character:${tom}`]).toEqual([{ chapterId: ch1, count: 1 }]);
  });

  it("feeds names and aliases to the matcher", () => {
    const entities = bibleMentionEntities(loadBible(storyId));
    expect(entities.find((e) => e.id === liz)?.names).toEqual(["Elizabeth", "Liz"]);
  });
});
