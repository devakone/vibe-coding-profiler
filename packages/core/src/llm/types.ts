/**
 * LLM Provider Abstraction Types
 *
 * Provider-agnostic interfaces for interacting with LLM APIs.
 */

export type LLMProvider = "anthropic" | "openai" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: "stop" | "length" | "error";
}

export interface LLMValidationResult {
  valid: boolean;
  error?: string;
}

export interface LLMClient {
  /**
   * Send a chat completion request to the LLM.
   */
  chat(messages: LLMMessage[]): Promise<LLMResponse>;

  /**
   * Validate that the API key is valid and has sufficient permissions.
   */
  validateKey(): Promise<LLMValidationResult>;
}

export type LLMKeySource = "platform" | "user" | "sponsor" | "none";

export interface LLMResolutionResult {
  config: LLMConfig | null;
  source: LLMKeySource;
  reason: string;
}
