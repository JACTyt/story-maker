import { NextRequest, NextResponse } from "next/server";
import { createTimelineEvent, listTimelineEvents } from "@/db/storyLinks";
import { timelineCreate } from "@/lib/entitySchemas";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  return NextResponse.json(listTimelineEvents(Number(storyId)));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const parsed = timelineCreate.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(createTimelineEvent(Number(storyId), parsed.data), { status: 201 });
}
