import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, chapters, chatMessages } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { eq } from "drizzle-orm";
import { POST, GET } from "./route";
import type { ChatMessage, LlmProvider, SendChatOptions } from "@/lib/providers";

class FakeProvider implements LlmProvider {
  constructor(private chunks: string[], private shouldFail = false) {}
  async *sendChat(_messages: ChatMessage[], _options: SendChatOptions) {
    if (this.shouldFail) throw new Error("provider unavailable");
    for (const chunk of this.chunks) yield chunk;
  }
}

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

describe("/api/.../messages", () => {
  let storyId: number;
  let chapterId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story" }).returning().get().id;
    chapterId = db.insert(chapters).values({ storyId, title: "Chapter 1" }).returning().get().id;
  });

  it("persists the user message and streams+persists the assistant reply", async () => {
    const req = new Request(`http://localhost/api/stories/${storyId}/chapters/${chapterId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Let's start the story" }),
    });

    const res = await POST(
      req as any,
      { params: Promise.resolve({ storyId: String(storyId), chapterId: String(chapterId) }) },
      new FakeProvider(["Once ", "upon ", "a time."])
    );
    const streamed = await readAll(res);
    expect(streamed).toBe("Once upon a time.");

    const rows = db.select().from(chatMessages).where(eq(chatMessages.chapterId, chapterId)).all();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ role: "user", content: "Let's start the story" });
    expect(rows[1]).toMatchObject({ role: "assistant", content: "Once upon a time.", incomplete: false });
  });

  it("marks the assistant message incomplete when the provider fails mid-stream", async () => {
    const req = new Request(`http://localhost/api/stories/${storyId}/chapters/${chapterId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Keep going" }),
    });

    const res = await POST(
      req as any,
      { params: Promise.resolve({ storyId: String(storyId), chapterId: String(chapterId) }) },
      new FakeProvider([], true)
    );
    await readAll(res);

    const rows = db.select().from(chatMessages).where(eq(chatMessages.chapterId, chapterId)).all();
    const assistantRow = rows.find((r) => r.role === "assistant");
    expect(assistantRow?.incomplete).toBe(true);
  });

  it("lists message history in order", async () => {
    db.insert(chatMessages).values({ chapterId, role: "user", content: "Hi" }).run();
    db.insert(chatMessages).values({ chapterId, role: "assistant", content: "Hello!" }).run();

    const res = await GET(new Request("http://localhost") as any, {
      params: Promise.resolve({ chapterId: String(chapterId) }),
    });
    const body = await res.json();
    expect(body.map((m: any) => m.content)).toEqual(["Hi", "Hello!"]);
  });
});
