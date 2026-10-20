import { NextRequest, NextResponse } from "next/server";
import { createRelationship, listRelationships } from "@/db/storyLinks";
import { relationshipCreate } from "@/lib/entitySchemas";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  return NextResponse.json(listRelationships(Number(storyId)));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const parsed = relationshipCreate.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = createRelationship(Number(storyId), parsed.data);
  if (!created) return NextResponse.json({ error: "Both characters must be different and belong to this story" }, { status: 400 });
  return NextResponse.json(created, { status: 201 });
}
