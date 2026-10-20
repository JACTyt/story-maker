import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chapters } from "@/db/schema";

const reorderInput = z.object({ ids: z.array(z.number().int()) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const parsed = reorderInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Scoped by story, so ids from elsewhere are silently ignored.
  db.transaction((tx) => {
    parsed.data.ids.forEach((id, orderIndex) => {
      tx.update(chapters)
        .set({ orderIndex })
        .where(and(eq(chapters.id, id), eq(chapters.storyId, Number(storyId))))
        .run();
    });
  });
  return new NextResponse(null, { status: 204 });
}
