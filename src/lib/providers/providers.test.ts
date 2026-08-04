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

  it("sends temperature and max_tokens when thinking is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(fakeStream([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await collect(
      new AnthropicProvider().sendChat([{ role: "user", content: "hi" }], {
        model: "claude",
        temperature: 0.5,
        maxTokens: 2048,
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(2048);
    expect(body.thinking).toBeUndefined();
  });

  it("enables thinking and omits temperature when thinking is on", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(fakeStream([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await collect(
      new AnthropicProvider().sendChat([{ role: "user", content: "hi" }], {
        model: "claude",
        temperature: 0.5,
        thinking: true,
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 1024 });
    expect(body.temperature).toBeUndefined();
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

  it("sends reasoning_effort instead of temperature when thinking is on", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(fakeStream(["data: [DONE]"]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await collect(
      new OpenAIProvider().sendChat([{ role: "user", content: "hi" }], {
        model: "gpt",
        temperature: 0.5,
        thinking: true,
        maxTokens: 2048,
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reasoning_effort).toBe("medium");
    expect(body.temperature).toBeUndefined();
    expect(body.max_completion_tokens).toBe(2048);
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

  it("forwards think flag and options.temperature/num_predict", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(fakeStream([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await collect(
      new OllamaProvider().sendChat([{ role: "user", content: "hi" }], {
        model: "deepseek-r1",
        temperature: 0.7,
        thinking: true,
        maxTokens: 8192,
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.think).toBe(true);
    expect(body.options).toEqual({ temperature: 0.7, num_predict: 8192 });
  });
});
