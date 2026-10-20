import { describe, it, expect, beforeEach } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories, chapters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { POST } from "./route";
import { POST as DUPLICATE } from "../../duplicate/route";

describe("chapter reorder and story duplicate routes", () => {
  let storyId: number;
  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "S" }).returning().get().id;
  });

  it("rewrites chapter order from an id list, ignoring other stories", async () => {
    const a = db.insert(chapters).values({ storyId, title: "A", orderIndex: 0 }).returning().get().id;
    const b = db.insert(chapters).values({ storyId, title: "B", orderIndex: 1 }).returning().get().id;
    const other = db.insert(stories).values({ title: "O" }).returning().get().id;
    const foreign = db.insert(chapters).values({ storyId: other, title: "X", orderIndex: 5 }).returning().get().id;
    const res = await POST(
      new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: [b, a, foreign] }) }) as never,
      { params: Promise.resolve({ storyId: String(storyId) }) }
    );
    expect(res.status).toBe(204);
    const titles = db.select().from(chapters).where(eq(chapters.storyId, storyId)).orderBy(asc(chapters.orderIndex)).all().map((c) => c.title);
    expect(titles).toEqual(["B", "A"]);
    expect(db.select().from(chapters).where(eq(chapters.id, foreign)).get()?.orderIndex).toBe(5);
  });

  it("duplicates a story, and 404s for an unknown one", async () => {
    const res = await DUPLICATE(new Request("http://localhost", { method: "POST" }) as never, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(res.status).toBe(201);
    expect((await res.json()).title).toBe("S (copy)");
    const missing = await DUPLICATE(new Request("http://localhost", { method: "POST" }) as never, { params: Promise.resolve({ storyId: "99999" }) });
    expect(missing.status).toBe(404);
  });
});
