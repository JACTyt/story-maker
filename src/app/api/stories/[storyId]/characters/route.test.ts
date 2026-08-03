import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { GET, POST } from "./route";

describe("/api/stories/:storyId/characters", () => {
  let storyId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
  });

  it("rejects a character with no name", async () => {
    const req = new Request(`http://localhost/api/stories/${storyId}/characters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(res.status).toBe(400);
  });

  it("creates and lists characters", async () => {
    const req = new Request(`http://localhost/api/stories/${storyId}/characters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Mira", description: "A smuggler" }),
    });
    await POST(req as any, { params: Promise.resolve({ storyId: String(storyId) }) });

    const listed = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ storyId: String(storyId) }),
    });
    const body = await listed.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Mira");
  });
});
