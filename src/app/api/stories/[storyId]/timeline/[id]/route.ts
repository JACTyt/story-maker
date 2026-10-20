import { NextRequest, NextResponse } from "next/server";
import { deleteTimelineEvent, updateTimelineEvent } from "@/db/storyLinks";
import { timelineUpdate } from "@/lib/entitySchemas";

type Ctx = { params: Promise<{ storyId: string; id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { storyId, id } = await ctx.params;
  const parsed = timelineUpdate.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = updateTimelineEvent(Number(storyId), Number(id), parsed.data);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { storyId, id } = await ctx.params;
  deleteTimelineEvent(Number(storyId), Number(id));
  return new NextResponse(null, { status: 204 });
}
