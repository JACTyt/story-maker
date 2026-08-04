import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db/client";
import { stories, characters } from "@/db/schema";
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

describe("/api/stories/:storyId/quick-start", () => {
  let storyId: number;

  beforeEach(() => {
    resetTestDb();
    storyId = db.insert(stories).values({ title: "Test Story", premise: "A war brews" }).returning().get().id;
  });

  it("rejects a missing description", async () => {
    const res = await POST(req({}) as any, { params: Promise.resolve({ storyId: String(storyId) }) });
    expect(res.status).toBe(400);
  });

  it("groups parsed markers by type", async () => {
    const text = [
      "[[suggest:character|Mira|A smuggler's leather jacket|Guarded but loyal]]",
      "[[suggest:character|Jax|A grizzled pilot|Quietly reckless]]",
      "[[suggest:place|Docking bay|Mira is cornered here]]",
      "[[suggest:theme|Cyberpunk|Neon-lit megacorp dystopia]]",
    ].join("\n");

    const res = await POST(
      req({ description: "A heist with a found-family crew" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FakeProvider(text)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.characters).toEqual([
      { name: "Mira", appearance: "A smuggler's leather jacket", personality: "Guarded but loyal" },
      { name: "Jax", appearance: "A grizzled pilot", personality: "Quietly reckless" },
    ]);
    expect(body.places).toEqual([{ name: "Docking bay", description: "Mira is cornered here" }]);
    expect(body.themes).toEqual([{ name: "Cyberpunk", description: "Neon-lit megacorp dystopia" }]);
  });

  it("still generates correctly when the story already has existing characters (context assembly doesn't error)", async () => {
    db.insert(characters).values({ storyId, name: "Existing Character", appearance: "Already here", personality: "" }).run();
    const res = await POST(
      req({ description: "More heist crew" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FakeProvider("[[suggest:character|Zara|A hacker's cybernetic eye|Paranoid but brilliant]]")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.characters).toEqual([{ name: "Zara", appearance: "A hacker's cybernetic eye", personality: "Paranoid but brilliant" }]);
  });

  it("returns a 502 JSON error instead of crashing when the provider is unreachable", async () => {
    const res = await POST(
      req({ description: "A heist" }) as any,
      { params: Promise.resolve({ storyId: String(storyId) }) },
      new FailingProvider()
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("provider unreachable");
  });
});
