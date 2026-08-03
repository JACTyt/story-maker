import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { GET, POST } from "./route";

describe("/api/stories/:storyId/chapters", () => {
  let storyId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
  });

  it("creates and lists chapters scoped to the story", async () => {
    const req = new Request(`http://localhost/api/stories/${storyId}/chapters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Chapter 1", orderIndex: 0 }),
    });
    const created = await POST(req as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(created.status).toBe(201);

    const listed = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ storyId: String(storyId) }),
    });
    const body = await listed.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Chapter 1");
    expect(body[0].status).toBe("drafting");
  });
});
