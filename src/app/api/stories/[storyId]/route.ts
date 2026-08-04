import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories } from "@/db/schema";

const storyUpdateInput = z.object({
  title: z.string().min(1).optional(),
  premise: z.string().optional(),
  defaultProvider: z.enum(["anthropic", "openai", "ollama"]).optional(),
  defaultModel: z.string().optional(),
  ollamaHost: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  extendedThinking: z.boolean().optional(),
  maxTokens: z.number().int().min(256).max(64000).optional(),
  compiledProse: z.string().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const story = db.select().from(stories).where(eq(stories.id, Number(storyId))).get();
  if (!story) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(story);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  const parsed = storyUpdateInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = db
    .update(stories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(stories.id, Number(storyId)))
    .returning()
    .get();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await ctx.params;
  db.delete(stories).where(eq(stories.id, Number(storyId))).run();
  return new NextResponse(null, { status: 204 });
}
