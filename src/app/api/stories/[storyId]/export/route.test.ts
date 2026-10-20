import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { GET } from "./route";

describe("/api/stories/:storyId/export", () => {
  beforeEach(() => resetTestDb());

  it("returns 404 when nothing has been compiled yet", async () => {
    const storyId = db.insert(stories).values({ title: "Empty Story" }).returning().get().id;
    const res = await GET(new Request("http://localhost") as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(res.status).toBe(404);
  });

  it("returns the compiled prose as a downloadable Markdown file", async () => {
    const storyId = db
      .insert(stories)
      .values({
        title: "My Story",
        compiledProse: "# My Story\n\nA smuggler finds a reason to stay.\n\n---\n\n# Chapter 1\n\nOnce upon a time.",
      })
      .returning()
      .get().id;

    const res = await GET(new Request("http://localhost") as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toContain("My Story.md");
    const text = await res.text();
    expect(text).toBe(
      "# My Story\n\nA smuggler finds a reason to stay.\n\n---\n\n# Chapter 1\n\nOnce upon a time."
    );
  });
});

describe("export cleans editing aids", () => {
  it("removes entity links but keeps their text", async () => {
    resetTestDb();
    const storyId = db
      .insert(stories)
      .values({ title: "S", compiledProse: "Then [the old man](entity:character/3) coughed." })
      .returning()
      .get().id;
    const res = await GET(new Request("http://localhost") as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(await res.text()).toBe("Then the old man coughed.");
  });
});
