import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { db } from "@/db/client";
import { stories, characters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { storeImage } from "@/db/images";
import { GET, POST } from "./route";
import { GET as GET_FILE, DELETE } from "./[imageId]/route";

let uploadRoot: string;
let storyId: number;
let characterId: number;

beforeEach(() => {
  resetTestDb();
  uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), "story-maker-img-"));
  process.env.UPLOADS_PATH = uploadRoot;
  storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
  characterId = db.insert(characters).values({ storyId, name: "Mira" }).returning().get().id;
});

afterEach(() => {
  fs.rmSync(uploadRoot, { recursive: true, force: true });
  delete process.env.UPLOADS_PATH;
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);

function uploadRequest(bytes: Uint8Array, entityType: string, entityId: number) {
  const form = new FormData();
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: "image/png" }), "portrait.png");
  form.append("entityType", entityType);
  form.append("entityId", String(entityId));
  return new Request("http://localhost", { method: "POST", body: form });
}

function ctx() {
  return { params: Promise.resolve({ storyId: String(storyId) }) };
}

describe("POST /api/stories/:storyId/images", () => {
  it("accepts a PNG and returns the stored image", async () => {
    const res = await POST(uploadRequest(PNG, "character", characterId) as never, ctx());

    expect(res.status).toBe(201);
    expect((await res.json()).mimeType).toBe("image/png");
  });

  it("rejects a file whose bytes are not an image", async () => {
    const evil = new TextEncoder().encode("<?php echo 1; ?>");

    const res = await POST(uploadRequest(evil, "character", characterId) as never, ctx());

    expect(res.status).toBe(400);
  });

  it("rejects an unknown entity type", async () => {
    const res = await POST(uploadRequest(PNG, "spaceship", characterId) as never, ctx());

    expect(res.status).toBe(400);
  });

  it("rejects attaching to an entity from another story", async () => {
    const otherStory = db.insert(stories).values({ title: "Other" }).returning().get().id;
    const foreign = db.insert(characters).values({ storyId: otherStory, name: "Jax" }).returning().get().id;

    const res = await POST(uploadRequest(PNG, "character", foreign) as never, ctx());

    expect(res.status).toBe(404);
  });

  it("rejects a request with no file attached", async () => {
    const form = new FormData();
    form.append("entityType", "character");
    form.append("entityId", String(characterId));

    const res = await POST(new Request("http://localhost", { method: "POST", body: form }) as never, ctx());

    expect(res.status).toBe(400);
  });
});

describe("GET /api/stories/:storyId/images", () => {
  it("lists images attached to the requested entity", async () => {
    storeImage({ storyId, entityType: "character", entityId: characterId, bytes: PNG });

    const res = await GET(
      new Request(`http://localhost?entityType=character&entityId=${characterId}`) as never,
      ctx()
    );

    expect(await res.json()).toHaveLength(1);
  });

  it("returns nothing for an entity with no images", async () => {
    const res = await GET(
      new Request(`http://localhost?entityType=character&entityId=${characterId}`) as never,
      ctx()
    );

    expect(await res.json()).toEqual([]);
  });
});

describe("GET and DELETE /api/stories/:storyId/images/:imageId", () => {
  it("serves the stored bytes with the sniffed content type", async () => {
    const row = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: PNG });

    const res = await GET_FILE(new Request("http://localhost") as never, {
      params: Promise.resolve({ storyId: String(storyId), imageId: String(row.id) }),
    });

    expect(res.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
  });

  it("returns 404 for an image belonging to a different story", async () => {
    const otherStory = db.insert(stories).values({ title: "Other" }).returning().get().id;
    const row = storeImage({ storyId: otherStory, entityType: "story", entityId: otherStory, bytes: PNG });

    const res = await GET_FILE(new Request("http://localhost") as never, {
      params: Promise.resolve({ storyId: String(storyId), imageId: String(row.id) }),
    });

    expect(res.status).toBe(404);
  });

  it("deletes an image", async () => {
    const row = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: PNG });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }) as never, {
      params: Promise.resolve({ storyId: String(storyId), imageId: String(row.id) }),
    });

    expect(res.status).toBe(204);
  });
});
