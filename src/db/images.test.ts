import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { db } from "./client";
import { stories, characters } from "./schema";
import { resetTestDb } from "./testDb";
import { storeImage, listImages, getImage, deleteImage, imageFilePath } from "./images";

let uploadRoot: string;

beforeEach(() => {
  resetTestDb();
  uploadRoot = fs.mkdtempSync(path.join(os.tmpdir(), "story-maker-uploads-"));
  process.env.UPLOADS_PATH = uploadRoot;
});

afterEach(() => {
  fs.rmSync(uploadRoot, { recursive: true, force: true });
  delete process.env.UPLOADS_PATH;
});

function png(marker = 1): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, marker]);
}

function seed() {
  const storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
  const characterId = db.insert(characters).values({ storyId, name: "Mira" }).returning().get().id;
  return { storyId, characterId };
}

describe("storeImage", () => {
  it("writes the bytes to disk and returns a row describing them", () => {
    const { storyId, characterId } = seed();

    const row = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png() });

    expect(row.mimeType).toBe("image/png");
    expect(row.byteSize).toBe(png().length);
    expect(fs.existsSync(imageFilePath(row))).toBe(true);
  });

  it("refuses content that is not a supported image", () => {
    const { storyId, characterId } = seed();
    const notAnImage = new TextEncoder().encode("<?php echo 1; ?>");

    expect(() =>
      storeImage({ storyId, entityType: "character", entityId: characterId, bytes: notAnImage })
    ).toThrow(/unsupported/i);
  });

  it("stores identical bytes only once on disk", () => {
    const { storyId, characterId } = seed();

    const first = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png() });
    const second = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png() });

    expect(second.storedName).toBe(first.storedName);
    expect(fs.readdirSync(path.join(uploadRoot, String(storyId)))).toHaveLength(1);
  });

  it("still records a second attachment when the same file is reused", () => {
    const { storyId, characterId } = seed();

    storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png() });
    storeImage({ storyId, entityType: "story", entityId: storyId, bytes: png() });

    expect(listImages("character", characterId)).toHaveLength(1);
    expect(listImages("story", storyId)).toHaveLength(1);
  });

  it("keeps the caller's filename out of the stored name", () => {
    const { storyId, characterId } = seed();

    const row = storeImage({
      storyId,
      entityType: "character",
      entityId: characterId,
      bytes: png(),
      filename: "../../etc/passwd.png",
    });

    expect(row.storedName).not.toContain("..");
    expect(row.storedName).toMatch(/^[0-9a-f]+\.png$/);
  });
});

describe("listImages", () => {
  it("returns images for the requested entity only", () => {
    const { storyId, characterId } = seed();
    storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png(1) });
    storeImage({ storyId, entityType: "story", entityId: storyId, bytes: png(2) });

    expect(listImages("character", characterId)).toHaveLength(1);
  });

  it("orders images by their sort order", () => {
    const { storyId, characterId } = seed();
    const a = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png(1) });
    const b = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png(2) });

    expect(listImages("character", characterId).map((i) => i.id)).toEqual([a.id, b.id]);
  });
});

describe("deleteImage", () => {
  it("removes the row and the file", () => {
    const { storyId, characterId } = seed();
    const row = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png() });

    deleteImage(row.id);

    expect(getImage(row.id)).toBeUndefined();
    expect(fs.existsSync(imageFilePath(row))).toBe(false);
  });

  it("keeps the file while another row still references it", () => {
    const { storyId, characterId } = seed();
    const first = storeImage({ storyId, entityType: "character", entityId: characterId, bytes: png() });
    const second = storeImage({ storyId, entityType: "story", entityId: storyId, bytes: png() });

    deleteImage(first.id);

    expect(fs.existsSync(imageFilePath(second))).toBe(true);
  });
});
