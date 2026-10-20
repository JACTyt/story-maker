import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteRelationship, updateRelationshipLabel } from "@/db/storyLinks";

type Ctx = { params: Promise<{ storyId: string; id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { storyId, id } = await ctx.params;
  const parsed = z.object({ label: z.string() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = updateRelationshipLabel(Number(storyId), Number(id), parsed.data.label);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { storyId, id } = await ctx.params;
  deleteRelationship(Number(storyId), Number(id));
  return new NextResponse(null, { status: 204 });
}
