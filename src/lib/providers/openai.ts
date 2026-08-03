import type { ChatMessage, LlmProvider, SendChatOptions } from "./types";
import { readLines, safeText } from "./streamUtils";

export class OpenAIProvider implements LlmProvider {
  async *sendChat(messages: ChatMessage[], options: SendChatOptions): AsyncGenerator<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey ?? ""}`,
      },
      body: JSON.stringify({ model: options.model, messages, stream: true }),
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
