import type { ChatMessage, LlmProvider, SendChatOptions } from "./types";
import { readLines, safeText } from "./streamUtils";

export class OpenAIProvider implements LlmProvider {
  async *sendChat(messages: ChatMessage[], options: SendChatOptions): AsyncGenerator<string> {
    const body: Record<string, unknown> = { model: options.model, messages, stream: true };
    if (options.maxTokens !== undefined) body.max_completion_tokens = options.maxTokens;
    if (options.thinking) {
      body.reasoning_effort = "medium";
    } else if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey ?? ""}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI request failed: ${res.status} ${await safeText(res)}`);
    }

    for await (const line of readLines(res.body)) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice("data: ".length);
      if (data === "[DONE]") continue;
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield delta as string;
    }
  }
}
