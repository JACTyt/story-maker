import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, chapters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { recordProseVersion, currentProse } from "@/db/proseVersions";
import { GET } from "./route";
import { POST as REVERT } from "./[versionId]/revert/route";

describe("/api/.../chapters/:id/versions", () => {
  let storyId: number;
  let chapterId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
    chapterId = db.insert(chapters).values({ storyId, title: "Chapter 1" }).returning().get().id;
  });

  function params() {
    return { params: Promise.resolve({ storyId: String(storyId), chapterId: String(chapterId) }) };
  }

  it("lists versions newest first", async () => {
    recordProseVersion(chapterId, { content: "First.", source: "generated" });
    recordProseVersion(chapterId, { content: "Second.", source: "generated" });

    const body = await (await GET(new Request("http://localhost") as never, params())).json();

    expect(body.map((v: { content: string }) => v.content)).toEqual(["Second.", "First."]);
  });

  it("returns an empty list for a chapter with no prose", async () => {
    const body = await (await GET(new Request("http://localhost") as never, params())).json();

    expect(body).toEqual([]);
  });

  it("reverts the chapter to an earlier version", async () => {
    const first = recordProseVersion(chapterId, { content: "First.", source: "generated" });
    recordProseVersion(chapterId, { content: "Second.", source: "generated" });

    const res = await REVERT(new Request("http://localhost", { method: "POST" }) as never, {
      params: Promise.resolve({
        storyId: String(storyId),
        chapterId: String(chapterId),
        versionId: String(first.id),
      }),
    });

    expect(res.status).toBe(200);
    expect(currentProse(chapterId)).toBe("First.");
  });

  it("rejects reverting to a version from a different chapter", async () => {
    const other = db.insert(chapters).values({ storyId, title: "Chapter 2" }).returning().get().id;
    const foreign = recordProseVersion(other, { content: "Elsewhere.", source: "generated" });

    const res = await REVERT(new Request("http://localhost", { method: "POST" }) as never, {
      params: Promise.resolve({
        storyId: String(storyId),
        chapterId: String(chapterId),
        versionId: String(foreign.id),
      }),
    });

    expect(res.status).toBe(404);
  });
});
