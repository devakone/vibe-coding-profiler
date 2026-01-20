/**
 * OpenAI LLM Client
 *
 * Implementation of the LLM client interface for OpenAI's Chat API.
 */

import type { LLMClient, LLMConfig, LLMMessage, LLMResponse, LLMValidationResult } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
  };
  finish_reason: "stop" | "length" | "content_filter" | "tool_calls" | null;
}

interface OpenAIResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIError {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

export class OpenAIClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // OpenAI messages format matches our format directly
    const openaiMessages: OpenAIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const requestBody: OpenAIRequest = {
      model: this.config.model,
      messages: openaiMessages,
    };

    if (this.config.maxTokens !== undefined) {
      requestBody.max_tokens = this.config.maxTokens;
    }

    if (this.config.temperature !== undefined) {
      requestBody.temperature = this.config.temperature;
    }

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as OpenAIError;
      const errorMessage = errorData?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    const choice = data.choices[0];
    if (!choice) {
      throw new Error("OpenAI API returned no choices");
    }

    // Map finish reason
    let finishReason: LLMResponse["finishReason"] = "stop";
    if (choice.finish_reason === "length") {
      finishReason = "length";
    } else if (choice.finish_reason === "content_filter") {
      finishReason = "error";
    } else if (choice.finish_reason === null) {
      finishReason = "error";
    }

    return {
      content: choice.message.content ?? "",
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      finishReason,
    };
  }

  async validateKey(): Promise<LLMValidationResult> {
    try {
      // Minimal API call to verify key works - use models endpoint instead of chat
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
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

      if (response.status === 429) {
        // Rate limited but key is valid
        return { valid: true };
      }

      const errorData = (await response.json().catch(() => ({}))) as OpenAIError;
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
