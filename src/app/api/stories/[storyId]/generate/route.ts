import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { chapters, stories } from "@/db/schema";
import { generateChapterProse } from "../chapters/[chapterId]/generate/route";
import type { LlmProvider } from "@/lib/providers";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ storyId: string }> },
  providerOverride?: LlmProvider
) {
  const { storyId } = await ctx.params;
  const storyIdNum = Number(storyId);

  const story = db.select().from(stories).where(eq(stories.id, storyIdNum)).get();
  if (!story) return NextResponse.json({ error: "not found" }, { status: 404 });

  const chapterRows = db
    .select()
    .from(chapters)
    .where(eq(chapters.storyId, storyIdNum))
    .orderBy(asc(chapters.orderIndex))
    .all();

  const sections: string[] = [];
  try {
    for (const chapter of chapterRows) {
      let prose = chapter.generatedProse;
      if (!prose || chapter.status !== "generated") {
        const generated = await generateChapterProse(storyIdNum, chapter.id, providerOverride);
        prose = generated.generatedProse;
      }
      sections.push(`# ${chapter.title}\n\n${prose}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const header = story.premise ? `# ${story.title}\n\n${story.premise}\n\n---\n\n` : `# ${story.title}\n\n`;
  const compiledProse = header + sections.join("\n\n");
  const compiledAt = new Date();

  db.update(stories).set({ compiledProse, compiledAt, updatedAt: compiledAt }).where(eq(stories.id, storyIdNum)).run();

  return NextResponse.json({ compiledProse, compiledAt });
}
