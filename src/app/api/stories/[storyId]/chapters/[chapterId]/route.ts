import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chapters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";
import { recordProseVersion, saveDraftProse } from "@/db/proseVersions";
import { deleteImagesFor } from "@/db/images";

const chapterUpdateInput = z.object({
  title: z.string().min(1),
  orderIndex: z.number().int(),
  status: z.enum(["drafting", "generated"]),
  generatedProse: z.string(),
});

const repo = createStoryScopedRepo(chapters);

export async function GET(_req: NextRequest, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  const chapter = repo.get(Number(chapterId));
  if (!chapter) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(chapter);
}

const { PATCH: patchFields, DELETE } = itemHandlers(repo, chapterUpdateInput, "chapterId", {
  afterDelete: (id) => deleteImagesFor("chapter", id),
});

/**
 * Prose is routed through the version history rather than written in place, so
 * a hand edit is as recoverable as a regeneration. Other fields patch normally.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  const body = await req.json();
  const { generatedProse, versioning, ...rest } = body ?? {};

  if (typeof generatedProse === "string") {
    const { chapterId } = await ctx.params;
    if (versioning === "draft") saveDraftProse(Number(chapterId), generatedProse);
    else recordProseVersion(Number(chapterId), { content: generatedProse, source: "edited" });
  }

  if (Object.keys(rest).length === 0) {
    const { chapterId } = await ctx.params;
    return NextResponse.json(repo.get(Number(chapterId)));
  }

  const forwarded = new NextRequest(req.url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rest),
  });
  return patchFields(forwarded, ctx);
}

export { DELETE };
