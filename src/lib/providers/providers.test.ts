import { describe, it, expect, vi, afterEach } from "vitest";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";

function fakeStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + "\n"));
      controller.close();
    },
  });
}

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const chunk of gen) out += chunk;
  return out;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AnthropicProvider", () => {
  it("extracts text deltas from SSE events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          fakeStream([
            'event: content_block_delta',
            'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}',
            'event: content_block_delta',
            'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}',
          ]),
          { status: 200 }
        )
      )
    );
    const text = await collect(new AnthropicProvider().sendChat([{ role: "user", content: "hi" }], { model: "claude" }));
    expect(text).toBe("Hello world");
  });

  it("throws on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad key", { status: 401 })));
    await expect(collect(new AnthropicProvider().sendChat([], { model: "claude" }))).rejects.toThrow(/401/);
  });
});

describe("OpenAIProvider", () => {
  it("extracts delta content from SSE events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          fakeStream([
            'data: {"choices":[{"delta":{"content":"Hello"}}]}',
            'data: {"choices":[{"delta":{"content":" world"}}]}',
            'data: [DONE]',
          ]),
          { status: 200 }
        )
      )
    );
    const text = await collect(new OpenAIProvider().sendChat([{ role: "user", content: "hi" }], { model: "gpt" }));
    expect(text).toBe("Hello world");
  });
});

describe("OllamaProvider", () => {
  it("extracts message content from newline-delimited JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          fakeStream([
            '{"message":{"content":"Hello"},"done":false}',
            '{"message":{"content":" world"},"done":false}',
            '{"done":true}',
          ]),
          { status: 200 }
        )
      )
    );
    const text = await collect(new OllamaProvider().sendChat([{ role: "user", content: "hi" }], { model: "llama3" }));
    expect(text).toBe("Hello world");
  });
});
