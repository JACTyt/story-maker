import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, characters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { GET, POST } from "./route";
import { DELETE } from "./[id]/route";

let storyId: number;
let a: number;
let b: number;

beforeEach(() => {
  resetTestDb();
  storyId = db.insert(stories).values({ title: "S" }).returning().get().id;
  a = db.insert(characters).values({ storyId, name: "Liz" }).returning().get().id;
  b = db.insert(characters).values({ storyId, name: "Tom" }).returning().get().id;
});

const ctx = () => ({ params: Promise.resolve({ storyId: String(storyId) }) });
const post = (body: unknown) =>
  new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("/relationships", () => {
  it("creates, lists and deletes a relationship", async () => {
    const res = await POST(post({ fromCharacterId: a, toCharacterId: b, label: "rival" }) as never, ctx());
    expect(res.status).toBe(201);
    const created = await res.json();
    expect((await (await GET(new Request("http://localhost") as never, ctx())).json())).toHaveLength(1);
    await DELETE(new Request("http://localhost") as never, { params: Promise.resolve({ storyId: String(storyId), id: String(created.id) }) });
    expect((await (await GET(new Request("http://localhost") as never, ctx())).json())).toHaveLength(0);
  });

  it("rejects a self-relationship", async () => {
    const res = await POST(post({ fromCharacterId: a, toCharacterId: a, label: "" }) as never, ctx());
    expect(res.status).toBe(400);
  });
});
