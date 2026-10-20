import { NextRequest, NextResponse } from "next/server";
import { loadBible } from "@/db/bible";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  return NextResponse.json(loadBible(Number(storyId)));
}
