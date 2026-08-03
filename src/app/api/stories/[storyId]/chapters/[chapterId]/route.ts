import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chapters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";

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

export const { PATCH, DELETE } = itemHandlers(repo, chapterUpdateInput, "chapterId");
