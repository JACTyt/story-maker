import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { chapters, chatMessages, characters, places, stories } from "@/db/schema";
import { getProvider, type LlmProvider, type ProviderName } from "@/lib/providers";
import { buildProseSystemPrompt, buildProseTranscript } from "@/lib/prompts";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ storyId: string; chapterId: string }> },
  providerOverride?: LlmProvider
) {
  const { storyId, chapterId } = await ctx.params;
  try {
    const prose = await generateChapterProse(Number(storyId), Number(chapterId), providerOverride);
    return NextResponse.json(prose);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function generateChapterProse(
  storyId: number,
  chapterId: number,
  providerOverride?: LlmProvider
): Promise<{ generatedProse: string; status: "generated" }> {
  const story = db.select().from(stories).where(eq(stories.id, storyId)).get();
  if (!story) throw new Error("story not found");

  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chapterId, chapterId))
    .orderBy(asc(chatMessages.createdAt))
    .all();

  const entities = {
    characters: db.select().from(characters).where(eq(characters.storyId, storyId)).all(),
    places: db.select().from(places).where(eq(places.storyId, storyId)).all(),
  };

  const transcript = buildProseTranscript(history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));

  const messages = [
    { role: "system" as const, content: buildProseSystemPrompt(story, entities) },
    {
      role: "user" as const,
      content: `Here is the conversation transcript between the novelist and their co-writing assistant for this chapter:\n\n${transcript || "(no conversation yet)"}\n\nNow write the complete, fully realized chapter prose based on everything discussed above.`,
    },
  ];

  const provider = providerOverride ?? getProvider(story.defaultProvider as ProviderName);
  const options = {
    model: story.defaultModel,
    apiKey: process.env[`${story.defaultProvider.toUpperCase()}_API_KEY`],
    ollamaHost: story.ollamaHost,
    temperature: story.temperature,
    thinking: story.extendedThinking,
    maxTokens: story.maxTokens,
  };

  let prose = "";
  for await (const chunk of provider.sendChat(messages, options)) {
    prose += chunk;
  }

  db.update(chapters)
    .set({ generatedProse: prose, status: "generated", updatedAt: new Date() })
    .where(eq(chapters.id, chapterId))
    .run();

  return { generatedProse: prose, status: "generated" };
}
