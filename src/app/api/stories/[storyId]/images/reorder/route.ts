import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getImage, reorderImages } from "@/db/images";

const reorderInput = z.object({ ids: z.array(z.number().int()) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const parsed = reorderInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Ids from another story are dropped rather than rejected, so a stale client cannot reorder foreign rows.
  const owned = parsed.data.ids.filter((id) => getImage(id)?.storyId === Number(storyId));
  reorderImages(owned);
  return new NextResponse(null, { status: 204 });
}
