import type { LlmProvider, ProviderName } from "./types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";

export * from "./types";

export function getProvider(name: ProviderName): LlmProvider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      throw new Error(`Unknown provider: ${name satisfies never}`);
  }
}
