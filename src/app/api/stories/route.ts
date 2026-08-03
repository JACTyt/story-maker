import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { stories } from "@/db/schema";
import { desc } from "drizzle-orm";

const storyInput = z.object({
  title: z.string().min(1, "Title is required"),
  premise: z.string().optional().default(""),
});

export async function GET() {
  const all = db.select().from(stories).orderBy(desc(stories.updatedAt)).all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const parsed = storyInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const created = db.insert(stories).values(parsed.data).returning().get();
  return NextResponse.json(created, { status: 201 });
}
