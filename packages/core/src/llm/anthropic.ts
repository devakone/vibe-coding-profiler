/**
 * Anthropic LLM Client
 *
 * Implementation of the LLM client interface for Anthropic's Claude API.
 */

import type { LLMClient, LLMConfig, LLMMessage, LLMResponse, LLMValidationResult } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  system?: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{ type: "text"; text: string }>;
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicError {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

export class AnthropicClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // Convert to Anthropic format
    const anthropicMessages: AnthropicMessage[] = chatMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const requestBody: AnthropicRequest = {
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 4096,
      messages: anthropicMessages,
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    if (this.config.temperature !== undefined) {
      requestBody.temperature = this.config.temperature;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
        "x-api-key": this.config.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as AnthropicError;
      const errorMessage = errorData?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    // Extract text content
    const textContent = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Map stop reason to finish reason
    let finishReason: LLMResponse["finishReason"] = "stop";
    if (data.stop_reason === "max_tokens") {
      finishReason = "length";
    } else if (data.stop_reason === null) {
      finishReason = "error";
    }

    return {
      content: textContent,
      model: data.model,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      finishReason,
    };
  }

  async validateKey(): Promise<LLMValidationResult> {
    try {
      // Minimal API call to verify key works
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": ANTHROPIC_VERSION,
          "x-api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          temperature: 0,
          messages: [{ role: "user", content: "ping" }],
        }),
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { valid: false, error: "Invalid API key" };
      }

      if (response.status === 403) {
        return { valid: false, error: "API key does not have sufficient permissions" };
      }

      if (response.status === 404) {
        return { valid: false, error: `Model not found: ${this.config.model}` };
      }

      if (response.status === 429) {
        // Rate limited but key is valid
        return { valid: true };
      }

      const errorData = (await response.json().catch(() => ({}))) as AnthropicError;
      return {
        valid: false,
        error: errorData?.error?.message ?? `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Failed to validate key",
      };
    }
  }
}
