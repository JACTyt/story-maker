import { NextRequest, NextResponse } from "next/server";
import { duplicateStory } from "@/db/duplicateStory";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const copy = duplicateStory(Number(storyId));
  if (!copy) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
