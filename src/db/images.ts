import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "./client";
import { images } from "./schema";
import { detectImageType, extensionFor } from "@/lib/images/sniff";

export type ImageEntityType = "character" | "place" | "chapter" | "story";

export type ImageRow = typeof images.$inferSelect;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type StoreInput = {
  storyId: number;
  entityType: ImageEntityType;
  entityId: number;
  bytes: Uint8Array;
  /** Only used for diagnostics — never for the stored path. */
  filename?: string;
  caption?: string;
};

function uploadsRoot(): string {
  return process.env.UPLOADS_PATH ?? path.join(process.cwd(), "data", "uploads");
}

function storyDir(storyId: number): string {
  return path.join(uploadsRoot(), String(storyId));
}

export function imageFilePath(image: Pick<ImageRow, "storyId" | "storedName">): string {
  return path.join(storyDir(image.storyId), image.storedName);
}

/**
 * Writes an upload to disk and records it.
 *
 * The stored name is derived from a hash of the content, never from the
 * client-supplied filename, which removes both path traversal and collisions.
 * Re-uploading identical bytes reuses the file already on disk.
 */
export function storeImage(input: StoreInput): ImageRow {
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`image exceeds the ${MAX_IMAGE_BYTES} byte limit`);
  }

  const mimeType = detectImageType(input.bytes);
  if (!mimeType) throw new Error("unsupported image format");

  const contentHash = createHash("sha256").update(input.bytes).digest("hex");
  const storedName = `${contentHash}.${extensionFor(mimeType)}`;

  const dir = storyDir(input.storyId);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, storedName);
  if (!fs.existsSync(target)) fs.writeFileSync(target, input.bytes);

  const siblings = listImages(input.entityType, input.entityId);

  return db
    .insert(images)
    .values({
      storyId: input.storyId,
      entityType: input.entityType,
      entityId: input.entityId,
      storedName,
      contentHash,
      mimeType,
      byteSize: input.bytes.byteLength,
      caption: input.caption ?? "",
      // The first picture of an entity is its portrait until the writer picks another.
      isPrimary: siblings.length === 0,
      sortOrder: siblings.length,
    })
    .returning()
    .get();
}

export function listImages(entityType: ImageEntityType, entityId: number): ImageRow[] {
  return db
    .select()
    .from(images)
    .where(and(eq(images.entityType, entityType), eq(images.entityId, entityId)))
    .orderBy(asc(images.sortOrder), asc(images.id))
    .all();
}

export function getImage(id: number): ImageRow | undefined {
  return db.select().from(images).where(eq(images.id, id)).get();
}

/**
 * Removes the row, and the file too once no other row references those bytes —
 * identical uploads share one file, so deleting eagerly would break siblings.
 */
export function deleteImage(id: number): void {
  const image = getImage(id);
  if (!image) return;

  db.delete(images).where(eq(images.id, id)).run();

  if (image.isPrimary) {
    const next = listImages(image.entityType as ImageEntityType, image.entityId)[0];
    if (next) db.update(images).set({ isPrimary: true }).where(eq(images.id, next.id)).run();
  }

  const stillReferenced = db
    .select()
    .from(images)
    .where(and(eq(images.storyId, image.storyId), eq(images.contentHash, image.contentHash)))
    .all();
  if (stillReferenced.length === 0) {
    fs.rmSync(imageFilePath(image), { force: true });
  }
}

type ImagePatch = { caption?: string; isPrimary?: boolean };

/** Only `isPrimary: true` is meaningful — an entity always keeps one portrait while it has images. */
export function updateImage(id: number, patch: ImagePatch): ImageRow | undefined {
  const image = getImage(id);
  if (!image) return undefined;

  if (patch.isPrimary) {
    db.update(images)
      .set({ isPrimary: false })
      .where(and(eq(images.entityType, image.entityType), eq(images.entityId, image.entityId), ne(images.id, id)))
      .run();
    db.update(images).set({ isPrimary: true }).where(eq(images.id, id)).run();
  }
  if (patch.caption !== undefined) {
    db.update(images).set({ caption: patch.caption }).where(eq(images.id, id)).run();
  }
  return getImage(id);
}

export function reorderImages(orderedIds: number[]): void {
  orderedIds.forEach((id, index) => {
    db.update(images).set({ sortOrder: index }).where(eq(images.id, id)).run();
  });
}

/** Portraits for every entity of one type in a story — one query for lists, rails and hover cards. */
export function primaryImages(storyId: number, entityType: ImageEntityType): ImageRow[] {
  return db
    .select()
    .from(images)
    .where(and(eq(images.storyId, storyId), eq(images.entityType, entityType), eq(images.isPrimary, true)))
    .all();
}

/** Images belong to an entity by (type, id) without a foreign key, so owners must clean up explicitly. */
export function deleteImagesFor(entityType: ImageEntityType, entityId: number): void {
  for (const image of listImages(entityType, entityId)) deleteImage(image.id);
}

/** Story rows cascade in the database; their files live outside it. */
export function deleteStoryUploads(storyId: number): void {
  fs.rmSync(storyDir(storyId), { recursive: true, force: true });
}
