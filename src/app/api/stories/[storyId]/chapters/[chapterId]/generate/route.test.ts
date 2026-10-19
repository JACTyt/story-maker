import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, chapters, chatMessages } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { eq } from "drizzle-orm";
import { POST } from "./route";
import { listProseVersions, currentProse } from "@/db/proseVersions";
import type { ChatMessage, LlmProvider, SendChatOptions } from "@/lib/providers";

class FakeProvider implements LlmProvider {
  constructor(private text: string) {}
  async *sendChat(_messages: ChatMessage[], _options: SendChatOptions) {
    yield this.text;
  }
}

class FailingProvider implements LlmProvider {
  async *sendChat(_messages: ChatMessage[], _options: SendChatOptions): AsyncGenerator<string> {
    throw new Error("provider unreachable");
  }
}

describe("/api/.../generate (chapter)", () => {
  let storyId: number;
  let chapterId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story", premise: "A war brews" }).returning().get().id;
    chapterId = db.insert(chapters).values({ storyId, title: "Chapter 1" }).returning().get().id;
    db.insert(chatMessages).values({ chapterId, role: "user", content: "Mira sneaks aboard the freighter." }).run();
  });

  it("generates prose from chat history and marks the chapter generated", async () => {
    const res = await POST(
      new Request("http://localhost") as any,
      { params: Promise.resolve({ storyId: String(storyId), chapterId: String(chapterId) }) },
      new FakeProvider("Mira crept aboard the freighter, heart pounding.")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.generatedProse).toBe("Mira crept aboard the freighter, heart pounding.");
    expect(body.status).toBe("generated");

    const stored = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
    expect(stored?.generatedProse).toBe("Mira crept aboard the freighter, heart pounding.");
    expect(stored?.status).toBe("generated");
  });

  it("returns a 502 JSON error instead of crashing when the provider is unreachable", async () => {
    const res = await POST(
      new Request("http://localhost") as any,
      { params: Promise.resolve({ storyId: String(storyId), chapterId: String(chapterId) }) },
      new FailingProvider()
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("provider unreachable");

    const stored = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
    expect(stored?.status).toBe("drafting");
  });
});

describe("/api/.../generate keeps prior drafts", () => {
  let storyId: number;
  let chapterId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story", premise: "A war brews" }).returning().get().id;
    chapterId = db.insert(chapters).values({ storyId, title: "Chapter 1" }).returning().get().id;
    db.insert(chatMessages).values({ chapterId, role: "user", content: "Mira sneaks aboard." }).run();
  });

  function generate(text: string) {
    return POST(
      new Request("http://localhost") as any,
      { params: Promise.resolve({ storyId: String(storyId), chapterId: String(chapterId) }) },
      new FakeProvider(text)
    );
  }

  it("preserves the first draft after a second generation", async () => {
    await generate("First draft.");
    await generate("Second draft.");

    expect(listProseVersions(chapterId).map((v) => v.content)).toEqual(["Second draft.", "First draft."]);
  });

  it("returns the newest draft as the chapter's prose", async () => {
    await generate("First draft.");
    const res = await generate("Second draft.");

    expect((await res.json()).generatedProse).toBe("Second draft.");
    expect(currentProse(chapterId)).toBe("Second draft.");
  });

  it("records the model that produced the draft", async () => {
    db.update(stories).set({ defaultModel: "claude-opus-5" }).where(eq(stories.id, storyId)).run();

    await generate("First draft.");

    expect(listProseVersions(chapterId)[0].model).toBe("claude-opus-5");
  });
});
