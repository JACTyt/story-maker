import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { chapters, chatMessages, characters, places, themes, timelineEvents, stories } from "@/db/schema";
import { getProvider, type LlmProvider, type ProviderName } from "@/lib/providers";
import { buildChatSystemPrompt } from "@/lib/prompts";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  const rows = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chapterId, Number(chapterId)))
    .orderBy(asc(chatMessages.createdAt))
    .all();
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ storyId: string; chapterId: string }> },
  providerOverride?: LlmProvider
) {
  const { storyId, chapterId } = await ctx.params;
  const { content } = await req.json();
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  db.insert(chatMessages).values({ chapterId: Number(chapterId), role: "user", content }).run();

  return streamAssistantReply(Number(storyId), Number(chapterId), providerOverride);
}

export function streamAssistantReply(storyId: number, chapterId: number, providerOverride?: LlmProvider): Response {
  const story = db.select().from(stories).where(eq(stories.id, storyId)).get();
  if (!story) return NextResponse.json({ error: "story not found" }, { status: 404 });

  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chapterId, chapterId))
    .orderBy(asc(chatMessages.createdAt))
    .all();

  const systemPrompt = buildChatSystemPrompt(story, {
    characters: db.select().from(characters).where(eq(characters.storyId, storyId)).all(),
    places: db.select().from(places).where(eq(places.storyId, storyId)).all(),
    themes: db.select().from(themes).where(eq(themes.storyId, storyId)).all(),
    timelineEvents: db.select().from(timelineEvents).where(eq(timelineEvents.storyId, storyId)).all(),
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
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

  const encoder = new TextEncoder();
  let accumulated = "";
  let failed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.sendChat(messages, options)) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        failed = true;
        const message = err instanceof Error ? err.message : "Unknown provider error";
        const errorNote = `\n[error: ${message}]`;
        accumulated += errorNote;
        controller.enqueue(encoder.encode(errorNote));
      } finally {
        if (failed || accumulated.trim().length > 0) {
          db.insert(chatMessages).values({ chapterId, role: "assistant", content: accumulated, incomplete: failed }).run();
        }
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
