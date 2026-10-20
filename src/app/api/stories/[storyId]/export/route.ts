import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories } from "@/db/schema";
import { stripEntityLinks } from "@/lib/mentions";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const story = db.select().from(stories).where(eq(stories.id, Number(storyId))).get();
  if (!story || !story.compiledProse) {
    return NextResponse.json({ error: "Nothing has been generated for this story yet" }, { status: 404 });
  }
  // Entity links are an editing aid; the exported manuscript is plain prose.
  return new NextResponse(stripEntityLinks(story.compiledProse), {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${story.title}.md"`,
    },
  });
}
