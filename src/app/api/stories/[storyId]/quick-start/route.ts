import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories, characters, scenes, themes } from "@/db/schema";
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
    scenes: db.select().from(scenes).where(eq(scenes.storyId, storyIdNum)).all(),
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
  return NextResponse.json({
    characters: markers.filter((m) => m.type === "character").map(({ name, description }) => ({ name, description })),
    scenes: markers.filter((m) => m.type === "scene").map(({ name, description }) => ({ title: name, description })),
    themes: markers.filter((m) => m.type === "theme").map(({ name, description }) => ({ name, description })),
  });
}
