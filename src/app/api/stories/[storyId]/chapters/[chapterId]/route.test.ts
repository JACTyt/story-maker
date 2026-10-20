import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, chapters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { eq } from "drizzle-orm";
import { GET, PATCH } from "./route";
import { listProseVersions, recordProseVersion } from "@/db/proseVersions";

describe("/api/stories/:storyId/chapters/:chapterId", () => {
  let storyId: number;
  let chapterId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
    chapterId = db.insert(chapters).values({ storyId, title: "Chapter 1" }).returning().get().id;
  });

  it("returns a single chapter by id", async () => {
    const res = await GET(new Request("http://localhost") as any, { params: Promise.resolve({ chapterId: String(chapterId) }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Chapter 1");
  });

  it("returns 404 for an unknown chapter", async () => {
    const res = await GET(new Request("http://localhost") as any, { params: Promise.resolve({ chapterId: "999999" }) });
    expect(res.status).toBe(404);
  });

  it("updates generatedProse via PATCH, keyed by chapterId (not id)", async () => {
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ generatedProse: "Hand-edited opening line." }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ chapterId: String(chapterId) }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.generatedProse).toBe("Hand-edited opening line.");

    const stored = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
    expect(stored?.generatedProse).toBe("Hand-edited opening line.");
  });
});

describe("PATCH chapter prose is versioned", () => {
  let storyId2: number;
  let chapterId2: number;

  beforeEach(() => {
    resetTestDb();
    storyId2 = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
    chapterId2 = db.insert(chapters).values({ storyId: storyId2, title: "Chapter 1" }).returning().get().id;
  });

  function patch(body: Record<string, unknown>) {
    return PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }) as never,
      { params: Promise.resolve({ storyId: String(storyId2), chapterId: String(chapterId2) }) }
    );
  }

  it("records a hand-edited draft as a version", async () => {
    await patch({ generatedProse: "I rewrote this myself." });

    expect(listProseVersions(chapterId2).map((v) => v.content)).toEqual(["I rewrote this myself."]);
  });

  it("marks a hand-edited draft as edited rather than generated", async () => {
    await patch({ generatedProse: "I rewrote this myself." });

    expect(listProseVersions(chapterId2)[0].source).toBe("edited");
  });

  it("keeps the generated draft when the writer edits it", async () => {
    recordProseVersion(chapterId2, { content: "Machine draft.", source: "generated" });

    await patch({ generatedProse: "Human revision." });

    expect(listProseVersions(chapterId2).map((v) => v.content)).toEqual(["Human revision.", "Machine draft."]);
  });

  it("does not create a version when only the title changes", async () => {
    recordProseVersion(chapterId2, { content: "Draft.", source: "generated" });

    await patch({ title: "A Better Title" });

    expect(listProseVersions(chapterId2)).toHaveLength(1);
  });
});

describe("draft autosave via PATCH", () => {
  it("updates prose without a version when versioning is draft", async () => {
    resetTestDb();
    const sid = db.insert(stories).values({ title: "S" }).returning().get().id;
    const cid = db.insert(chapters).values({ storyId: sid, title: "C" }).returning().get().id;
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generatedProse: "typing…", versioning: "draft" }),
      }) as never,
      { params: Promise.resolve({ storyId: String(sid), chapterId: String(cid) }) }
    );
    expect(res.status).toBe(200);
    expect(listProseVersions(cid)).toHaveLength(0);
    expect((await res.json()).generatedProse).toBe("typing…");
  });
});
