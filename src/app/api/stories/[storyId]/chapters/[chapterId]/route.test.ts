import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, chapters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { eq } from "drizzle-orm";
import { GET, PATCH } from "./route";

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
