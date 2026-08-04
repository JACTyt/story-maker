import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories } from "@/db/schema";
import { resetTestDb } from "@/db/testDb";
import { POST } from "./route";
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

function req(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/stories/:storyId/suggest-entity", () => {
  let storyId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story", premise: "A war brews" }).returning().get().id;
  });

  it("rejects a missing name", async () => {
    const res = await POST(req({ type: "character" }) as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid type", async () => {
    const res = await POST(req({ type: "timeline", name: "Zara" }) as any, {
      params: Promise.resolve({ storyId: String(storyId) }),
    });
    expect(res.status).toBe(400);
  });

  it("returns appearance and personality for a character", async () => {
    const res = await POST(
      req({ type: "character", name: "Zara" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FakeProvider("[[suggest:character|Zara|A hacker's cybernetic eye|Paranoid but brilliant]]")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ appearance: "A hacker's cybernetic eye", personality: "Paranoid but brilliant" });
  });

  it("returns a description for a place", async () => {
    const res = await POST(
      req({ type: "place", name: "The Rust Market" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FakeProvider("[[suggest:place|The Rust Market|A sprawling scrapyard bazaar]]")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ description: "A sprawling scrapyard bazaar" });
  });

  it("returns a 502 when the model produces no usable marker", async () => {
    const res = await POST(
      req({ type: "theme", name: "Cyberpunk" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FakeProvider("I'm not sure what to suggest.")
    );
    expect(res.status).toBe(502);
  });

  it("returns a 502 JSON error instead of crashing when the provider is unreachable", async () => {
    const res = await POST(
      req({ type: "theme", name: "Cyberpunk" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FailingProvider()
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("provider unreachable");
  });
});
