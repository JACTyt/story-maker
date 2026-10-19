import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getImage, deleteImage, imageFilePath } from "@/db/images";

function loadScoped(storyId: string, imageId: string) {
  const image = getImage(Number(imageId));
  // Scoped by story so an id from another story is indistinguishable from a
  // missing one.
  return image && image.storyId === Number(storyId) ? image : undefined;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string; imageId: string }> }) {
  const { storyId, imageId } = await ctx.params;
  const image = loadScoped(storyId, imageId);
  if (!image) return NextResponse.json({ error: "not found" }, { status: 404 });

  const file = imageFilePath(image);
  if (!fs.existsSync(file)) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(fs.readFileSync(file) as unknown as BodyInit, {
    headers: {
      "content-type": image.mimeType,
      "content-length": String(image.byteSize),
      // Names are content-addressed, so a given URL never changes its bytes.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ storyId: string; imageId: string }> }) {
  const { storyId, imageId } = await ctx.params;
  const image = loadScoped(storyId, imageId);
  if (!image) return NextResponse.json({ error: "not found" }, { status: 404 });

  deleteImage(image.id);
  return new NextResponse(null, { status: 204 });
}
