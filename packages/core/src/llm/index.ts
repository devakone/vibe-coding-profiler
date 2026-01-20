/**
 * LLM Provider Abstraction
 *
 * Provider-agnostic LLM client factory and utilities.
 *
 * @example
 * ```typescript
 * import { createLLMClient, getDefaultModel } from "@vibed/core/llm";
 *
 * const client = createLLMClient({
 *   provider: "anthropic",
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: getDefaultModel("anthropic"),
 * });
 *
 * const response = await client.chat([
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: "Hello!" },
 * ]);
 *
 * console.log(response.content);
 * ```
 */

export * from "./types";
export * from "./models";
export { AnthropicClient } from "./anthropic";
export { OpenAIClient } from "./openai";
export { GeminiClient } from "./gemini";

import type { LLMClient, LLMConfig, LLMMessage, LLMResponse } from "./types";
import { AnthropicClient } from "./anthropic";
import { OpenAIClient } from "./openai";
import { GeminiClient } from "./gemini";
import { getModelCandidates } from "./models";

/**
 * Create an LLM client for the specified provider.
 *
 * @param config - Configuration including provider, API key, and model
 * @returns An LLM client instance
 * @throws Error if provider is unknown
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case "anthropic":
      return new AnthropicClient(config);
    case "openai":
      return new OpenAIClient(config);
    case "gemini":
      return new GeminiClient(config);
    default:
      throw new Error(`Unknown LLM provider: ${(config as LLMConfig).provider}`);
  }
}

/**
 * Chat with automatic model fallback.
 *
 * Tries the primary model first, then falls back to alternate models
 * if the primary fails (e.g., model not available, quota exceeded).
 *
 * @param config - Base configuration (model will be overridden)
 * @param messages - Chat messages
 * @returns Response and the model that succeeded
 */
export async function chatWithFallback(
  config: Omit<LLMConfig, "model">,
  messages: LLMMessage[]
): Promise<{ response: LLMResponse; model: string } | null> {
  const candidates = getModelCandidates(config.provider);

  for (const model of candidates) {
    try {
      const client = createLLMClient({ ...config, model });
      const response = await client.chat(messages);
      return { response, model };
    } catch (error) {
      // Log and try next model
      console.warn(`LLM model ${model} failed, trying fallback:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Validate an API key for a provider.
 *
 * @param config - Configuration with provider and API key
 * @returns Validation result
 */
export async function validateLLMKey(
  config: Pick<LLMConfig, "provider" | "apiKey"> & Partial<Pick<LLMConfig, "model">>
): Promise<{ valid: boolean; error?: string }> {
  const model = config.model ?? getModelCandidates(config.provider)[0];
  const client = createLLMClient({ ...config, model });
  return client.validateKey();
}
