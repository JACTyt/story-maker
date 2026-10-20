import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./client";
import { stories, chapters, characters } from "./schema";
import { resetTestDb } from "./testDb";
import {
  createTimelineEvent,
  listTimelineEvents,
  updateTimelineEvent,
  listRelationships,
  createRelationship,
  deleteRelationship,
} from "./storyLinks";

let storyId: number;
let otherStoryId: number;
let chapterId: number;
let foreignChapterId: number;
let liz: number;
let tom: number;

beforeEach(() => {
  resetTestDb();
  storyId = db.insert(stories).values({ title: "A" }).returning().get().id;
  otherStoryId = db.insert(stories).values({ title: "B" }).returning().get().id;
  chapterId = db.insert(chapters).values({ storyId, title: "Ch 1" }).returning().get().id;
  foreignChapterId = db.insert(chapters).values({ storyId: otherStoryId, title: "X" }).returning().get().id;
  liz = db.insert(characters).values({ storyId, name: "Liz" }).returning().get().id;
  tom = db.insert(characters).values({ storyId, name: "Tom" }).returning().get().id;
});

describe("timeline events with links", () => {
  it("creates an event with linked chapters and characters, dropping ids from other stories", () => {
    const event = createTimelineEvent(storyId, {
      title: "The storm",
      chapterIds: [chapterId, foreignChapterId],
      characterIds: [liz],
    });
    expect(event.chapterIds).toEqual([chapterId]);
    expect(event.characterIds).toEqual([liz]);
    expect(listTimelineEvents(storyId)[0].title).toBe("The storm");
  });

  it("replaces links on update and leaves them alone when omitted", () => {
    const event = createTimelineEvent(storyId, { title: "Arrest", characterIds: [liz] });
    const updated = updateTimelineEvent(storyId, event.id, { characterIds: [tom] });
    expect(updated?.characterIds).toEqual([tom]);
    const renamed = updateTimelineEvent(storyId, event.id, { title: "Tom's arrest" });
    expect(renamed?.characterIds).toEqual([tom]);
    expect(renamed?.title).toBe("Tom's arrest");
  });

  it("lists events in sort order", () => {
    createTimelineEvent(storyId, { title: "Later", sortOrder: 2 });
    createTimelineEvent(storyId, { title: "Earlier", sortOrder: 1 });
    expect(listTimelineEvents(storyId).map((e) => e.title)).toEqual(["Earlier", "Later"]);
  });
});

describe("character relationships", () => {
  it("creates, lists and deletes relationships within one story", () => {
    const rel = createRelationship(storyId, { fromCharacterId: liz, toCharacterId: tom, label: "owes a favour" });
    expect(rel).not.toBeNull();
    expect(listRelationships(storyId)).toHaveLength(1);
    deleteRelationship(storyId, rel!.id);
    expect(listRelationships(storyId)).toHaveLength(0);
  });

  it("refuses a relationship to a character in another story or to itself", () => {
    const stranger = db.insert(characters).values({ storyId: otherStoryId, name: "Stranger" }).returning().get().id;
    expect(createRelationship(storyId, { fromCharacterId: liz, toCharacterId: stranger, label: "" })).toBeNull();
    expect(createRelationship(storyId, { fromCharacterId: liz, toCharacterId: liz, label: "" })).toBeNull();
  });
});
