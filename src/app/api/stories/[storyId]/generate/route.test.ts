import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, chapters } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { eq } from "drizzle-orm";
import { POST } from "./route";
import type { ChatMessage, LlmProvider, SendChatOptions } from "@/lib/providers";

class FakeProvider implements LlmProvider {
  async *sendChat(_messages: ChatMessage[], _options: SendChatOptions) {
    yield "Generated text for an ungenerated chapter.";
  }
}

class FailingProvider implements LlmProvider {
  async *sendChat(_messages: ChatMessage[], _options: SendChatOptions): AsyncGenerator<string> {
    throw new Error("provider unreachable");
  }
}

describe("/api/stories/:storyId/generate (whole story)", () => {
  let storyId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db
      .insert(stories)
      .values({ title: "Test Story", premise: "A smuggler finds a reason to stay." })
      .returning()
      .get().id;
    db.insert(chapters)
      .values({ storyId, title: "Chapter 1", orderIndex: 0, status: "generated", generatedProse: "Chapter one prose." })
      .run();
    db.insert(chapters).values({ storyId, title: "Chapter 2", orderIndex: 1, status: "drafting" }).run();
  });

  it("generates missing chapters, then compiles all chapters in order behind a title/premise header", async () => {
    const res = await POST(
      new Request("http://localhost") as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FakeProvider()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.compiledProse.startsWith("# Test Story\n\nA smuggler finds a reason to stay.\n\n---\n\n")).toBe(true);
    expect(body.compiledProse).toContain("# Chapter 1");
    expect(body.compiledProse).toContain("Chapter one prose.");
    expect(body.compiledProse).toContain("# Chapter 2");
    expect(body.compiledProse).toContain("Generated text for an ungenerated chapter.");
    expect(body.compiledProse.indexOf("Chapter one prose.")).toBeLessThan(
      body.compiledProse.indexOf("Generated text for an ungenerated chapter.")
    );

    const secondChapter = db.select().from(chapters).where(eq(chapters.orderIndex, 1)).get();
    expect(secondChapter?.status).toBe("generated");
  });

  it("returns a 502 JSON error instead of crashing when generating a missing chapter fails", async () => {
    const res = await POST(
      new Request("http://localhost") as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FailingProvider()
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("provider unreachable");
  });
});
