import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./client";
import { stories, chapters } from "./schema";
import { resetTestDb } from "./testDb";
import { recordProseVersion, listProseVersions, revertToProseVersion, currentProse } from "./proseVersions";

describe("prose versions", () => {
  let chapterId: number;

  beforeEach(() => {
    resetTestDb();
    const storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
    chapterId = db.insert(chapters).values({ storyId, title: "Chapter One" }).returning().get().id;
  });

  it("makes a recorded version the chapter's current prose", () => {
    recordProseVersion(chapterId, { content: "First draft.", source: "generated" });

    expect(currentProse(chapterId)).toBe("First draft.");
  });

  it("keeps the earlier version when a second is recorded", () => {
    recordProseVersion(chapterId, { content: "First draft.", source: "generated" });
    recordProseVersion(chapterId, { content: "Second draft.", source: "generated" });

    expect(currentProse(chapterId)).toBe("Second draft.");
    expect(listProseVersions(chapterId).map((v) => v.content)).toEqual(["Second draft.", "First draft."]);
  });

  it("does not store a duplicate when the same prose is generated twice", () => {
    recordProseVersion(chapterId, { content: "Same words.", source: "generated" });
    recordProseVersion(chapterId, { content: "Same words.", source: "generated" });

    expect(listProseVersions(chapterId)).toHaveLength(1);
  });

  it("links each version to the one it replaced", () => {
    const first = recordProseVersion(chapterId, { content: "First.", source: "generated" });
    const second = recordProseVersion(chapterId, { content: "Second.", source: "generated" });

    expect(second.parentVersionId).toBe(first.id);
    expect(first.parentVersionId).toBeNull();
  });

  it("records which model produced a version", () => {
    const v = recordProseVersion(chapterId, { content: "Draft.", source: "generated", model: "claude-opus-5" });

    expect(v.model).toBe("claude-opus-5");
  });

  it("reverting restores the older prose as the current version", () => {
    const first = recordProseVersion(chapterId, { content: "First.", source: "generated" });
    recordProseVersion(chapterId, { content: "Second.", source: "generated" });

    revertToProseVersion(chapterId, first.id);

    expect(currentProse(chapterId)).toBe("First.");
  });

  it("reverting adds a version rather than deleting the one left behind", () => {
    const first = recordProseVersion(chapterId, { content: "First.", source: "generated" });
    recordProseVersion(chapterId, { content: "Second.", source: "generated" });

    revertToProseVersion(chapterId, first.id);

    expect(listProseVersions(chapterId).map((v) => v.content)).toEqual(["First.", "Second.", "First."]);
  });

  it("marks a reverted version with the revert source", () => {
    const first = recordProseVersion(chapterId, { content: "First.", source: "generated" });
    recordProseVersion(chapterId, { content: "Second.", source: "generated" });

    const reverted = revertToProseVersion(chapterId, first.id);

    expect(reverted.source).toBe("reverted");
  });

  it("refuses to revert to a version belonging to another chapter", () => {
    const storyId = db.select().from(stories).all()[0].id;
    const other = db.insert(chapters).values({ storyId, title: "Chapter Two" }).returning().get().id;
    const foreign = recordProseVersion(other, { content: "Elsewhere.", source: "generated" });

    expect(() => revertToProseVersion(chapterId, foreign.id)).toThrow();
  });

  it("reports no prose for a chapter that has never been generated", () => {
    expect(currentProse(chapterId)).toBe("");
    expect(listProseVersions(chapterId)).toEqual([]);
  });
});
