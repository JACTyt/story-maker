import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { chapters, chatMessages, stories } from "@/db/schema";
import { loadBible } from "@/db/bible";
import { buildStoryContext } from "@/lib/storyContext";
import { getProvider, type LlmProvider, type ProviderName } from "@/lib/providers";
import { buildProseSystemPrompt, buildProseTranscript } from "@/lib/prompts";
import { recordProseVersion } from "@/db/proseVersions";
import { STREAM_ERROR_PREFIX } from "@/lib/streamProtocol";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ storyId: string; chapterId: string }> },
  providerOverride?: LlmProvider
) {
  const { storyId, chapterId } = await ctx.params;
  if (new URL(req.url).searchParams.get("stream") === "1") {
    return streamChapterProse(Number(storyId), Number(chapterId), providerOverride);
  }
  try {
    const prose = await generateChapterProse(Number(storyId), Number(chapterId), providerOverride);
    return NextResponse.json(prose);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Streams prose as it is written; the version is only recorded once the whole chapter arrived. */
function streamChapterProse(storyId: number, chapterId: number, providerOverride?: LlmProvider): Response {
  let request: ReturnType<typeof buildChapterRequest>;
  try {
    request = buildChapterRequest(storyId, chapterId, providerOverride);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed" }, { status: 404 });
  }
  const { provider, messages, options, model } = request;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let prose = "";
      try {
        for await (const chunk of provider.sendChat(messages, options)) {
          prose += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        if (prose.trim()) recordProseVersion(chapterId, { content: prose, source: "generated", model });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown provider error";
        controller.enqueue(encoder.encode(`${STREAM_ERROR_PREFIX}${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

function buildChapterRequest(storyId: number, chapterId: number, providerOverride?: LlmProvider) {
  const story = db.select().from(stories).where(eq(stories.id, storyId)).get();
  if (!story) throw new Error("story not found");

  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chapterId, chapterId))
    .orderBy(asc(chatMessages.createdAt))
    .all();

  const chapter = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
  const storyBible = buildStoryContext(loadBible(storyId), {
    chapterId,
    texts: [chapter?.generatedProse ?? "", ...history.map((m) => m.content)],
  }).toPrompt();

  const transcript = buildProseTranscript(history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));

  const messages = [
    { role: "system" as const, content: buildProseSystemPrompt(story, storyBible) },
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

  return { provider, messages, options, model: story.defaultModel || undefined };
}

export async function generateChapterProse(
  storyId: number,
  chapterId: number,
  providerOverride?: LlmProvider
): Promise<{ generatedProse: string; status: "generated" }> {
  const { provider, messages, options, model } = buildChapterRequest(storyId, chapterId, providerOverride);

  let prose = "";
  for await (const chunk of provider.sendChat(messages, options)) {
    prose += chunk;
  }

  // Appends to the chapter's history instead of overwriting it: a regeneration
  // must never be able to destroy a draft the writer might still want.
  recordProseVersion(chapterId, { content: prose, source: "generated", model });

  return { generatedProse: prose, status: "generated" };
}
