import type { ChatMessage, LlmProvider, SendChatOptions } from "./types";
import { readLines, safeText } from "./streamUtils";

export class AnthropicProvider implements LlmProvider {
  async *sendChat(messages: ChatMessage[], options: SendChatOptions): AsyncGenerator<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system,
      messages: rest,
      stream: true,
    };
    if (options.thinking) {
      body.thinking = { type: "enabled", budget_tokens: 1024 };
    } else if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": options.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Anthropic request failed: ${res.status} ${await safeText(res)}`);
    }

    for await (const line of readLines(res.body)) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice("data: ".length);
      if (data === "[DONE]") continue;
      const json = JSON.parse(data);
      if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
        yield json.delta.text as string;
      }
    }
  }
}
