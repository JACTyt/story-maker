import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { characters, places, chapters, stories } from "@/db/schema";
import { storeImage, listImages, primaryImages, MAX_IMAGE_BYTES, type ImageEntityType } from "@/db/images";

const ENTITY_TABLES = { character: characters, place: places, chapter: chapters, story: stories } as const;

function isEntityType(value: string): value is ImageEntityType {
  return value in ENTITY_TABLES;
}

/**
 * Confirms the target exists *and* belongs to this story, so an image cannot be
 * attached across story boundaries by guessing an id.
 */
function entityBelongsToStory(entityType: ImageEntityType, entityId: number, storyId: number): boolean {
  if (entityType === "story") return entityId === storyId;
  const table = ENTITY_TABLES[entityType];
  const row = db.select().from(table).where(eq(table.id, entityId)).get();
  return !!row && row.storyId === storyId;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType") ?? "";
  if (url.searchParams.get("primary") === "1" && isEntityType(entityType)) {
    return NextResponse.json(primaryImages(Number(storyId), entityType));
  }
  const entityId = Number(url.searchParams.get("entityId"));
  if (!isEntityType(entityType) || !Number.isFinite(entityId)) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }
  return NextResponse.json(listImages(entityType, entityId));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;

  const form = await req.formData();
  const file = form.get("file");
  const entityType = String(form.get("entityType") ?? "");
  const entityId = Number(form.get("entityId"));

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  }
  if (!isEntityType(entityType) || !Number.isFinite(entityId)) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "That image is too large" }, { status: 413 });
  }
  if (!entityBelongsToStory(entityType, entityId, Number(storyId))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const row = storeImage({
      storyId: Number(storyId),
      entityType,
      entityId,
      bytes,
      caption: String(form.get("caption") ?? ""),
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
