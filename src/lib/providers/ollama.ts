import type { ChatMessage, LlmProvider, SendChatOptions } from "./types";
import { readLines, safeText } from "./streamUtils";

export class OllamaProvider implements LlmProvider {
  async *sendChat(messages: ChatMessage[], options: SendChatOptions): AsyncGenerator<string> {
    const host = options.ollamaHost ?? "http://localhost:11434";
    const body: Record<string, unknown> = { model: options.model, messages, stream: true };
    if (options.thinking !== undefined) body.think = options.thinking;
    if (options.temperature !== undefined || options.maxTokens !== undefined) {
      body.options = {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.maxTokens !== undefined && { num_predict: options.maxTokens }),
      };
    }

    const res = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama request failed: ${res.status} ${await safeText(res)}`);
    }

    for await (const line of readLines(res.body)) {
      if (!line.trim()) continue;
      const json = JSON.parse(line);
      const content = json.message?.content;
      if (content) yield content as string;
    }
  }
}
