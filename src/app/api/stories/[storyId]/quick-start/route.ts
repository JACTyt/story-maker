import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories, characters, places, themes } from "@/db/schema";
import { getProvider, type LlmProvider, type ProviderName } from "@/lib/providers";
import { buildQuickStartPrompt } from "@/lib/prompts";
import { parseSuggestionMarkers } from "@/lib/suggestions";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ storyId: string }> },
  providerOverride?: LlmProvider
) {
  const { storyId } = await ctx.params;
  const storyIdNum = Number(storyId);
  const { description } = await req.json();
  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const story = db.select().from(stories).where(eq(stories.id, storyIdNum)).get();
  if (!story) return NextResponse.json({ error: "story not found" }, { status: 404 });

  const existing = {
    characters: db.select().from(characters).where(eq(characters.storyId, storyIdNum)).all(),
    places: db.select().from(places).where(eq(places.storyId, storyIdNum)).all(),
    themes: db.select().from(themes).where(eq(themes.storyId, storyIdNum)).all(),
  };

  const messages = [
    { role: "system" as const, content: buildQuickStartPrompt(story, existing) },
    { role: "user" as const, content: description },
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

  let text = "";
  try {
    for await (const chunk of provider.sendChat(messages, options)) {
      text += chunk;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const markers = parseSuggestionMarkers(text);
  type Marker = (typeof markers)[number];
  const isType =
    <T extends Marker["type"]>(type: T) =>
    (m: Marker): m is Extract<Marker, { type: T }> =>
      m.type === type;

  return NextResponse.json({
    characters: markers.filter(isType("character")).map(({ name, appearance, personality }) => ({ name, appearance, personality })),
    places: markers.filter(isType("place")).map(({ name, description }) => ({ name, description })),
    themes: markers.filter(isType("theme")).map(({ name, description }) => ({ name, description })),
  });
}
