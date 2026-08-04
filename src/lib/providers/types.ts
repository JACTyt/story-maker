export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface SendChatOptions {
  model: string;
  apiKey?: string;
  ollamaHost?: string;
  temperature?: number;
  thinking?: boolean;
  maxTokens?: number;
}

export interface LlmProvider {
  sendChat(messages: ChatMessage[], options: SendChatOptions): AsyncGenerator<string>;
}

export type ProviderName = "anthropic" | "openai" | "ollama";
