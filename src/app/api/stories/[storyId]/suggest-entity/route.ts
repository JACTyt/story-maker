import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories, characters, places, themes } from "@/db/schema";
import { getProvider, type LlmProvider, type ProviderName } from "@/lib/providers";
import { buildSuggestEntityPrompt } from "@/lib/prompts";
import { parseSuggestionMarkers } from "@/lib/suggestions";

const VALID_TYPES = ["character", "place", "theme"] as const;
type EntityType = (typeof VALID_TYPES)[number];

function isValidType(value: unknown): value is EntityType {
  return typeof value === "string" && (VALID_TYPES as readonly string[]).includes(value);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ storyId: string }> },
  providerOverride?: LlmProvider
) {
  const { storyId } = await ctx.params;
  const storyIdNum = Number(storyId);
  const { type, name } = await req.json();
  if (!isValidType(type) || !name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "type and name are required" }, { status: 400 });
  }

  const story = db.select().from(stories).where(eq(stories.id, storyIdNum)).get();
  if (!story) return NextResponse.json({ error: "story not found" }, { status: 404 });

  const existing = {
    characters: db.select().from(characters).where(eq(characters.storyId, storyIdNum)).all(),
    places: db.select().from(places).where(eq(places.storyId, storyIdNum)).all(),
    themes: db.select().from(themes).where(eq(themes.storyId, storyIdNum)).all(),
  };

  const messages = [
    { role: "system" as const, content: buildSuggestEntityPrompt(story, type, name.trim(), existing) },
    { role: "user" as const, content: `Flesh out "${name.trim()}".` },
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

  const marker = parseSuggestionMarkers(text)[0];
  if (!marker) {
    return NextResponse.json({ error: "Couldn't generate a suggestion — try again." }, { status: 502 });
  }

  if (marker.type === "character") {
    return NextResponse.json({ appearance: marker.appearance, personality: marker.personality });
  }
  return NextResponse.json({ description: marker.description });
}
