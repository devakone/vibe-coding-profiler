/**
 * Google Gemini LLM Client
 *
 * Implementation of the LLM client interface for Google's Gemini API.
 */

import type { LLMClient, LLMConfig, LLMMessage, LLMResponse, LLMValidationResult } from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiRequest {
  systemInstruction?: {
    parts: GeminiPart[];
  };
  contents: GeminiContent[];
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
}

interface GeminiCandidate {
  content: {
    parts: GeminiPart[];
    role: "model";
  };
  finishReason: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER";
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: string;
}

interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiClient implements LLMClient {
  constructor(private config: LLMConfig) {}

  private getApiUrl(endpoint: string): string {
    return `${GEMINI_API_BASE}${endpoint}?key=${this.config.apiKey}`;
  }

  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    // Convert to Gemini format
    // Note: Gemini uses "model" instead of "assistant"
    const geminiContents: GeminiContent[] = chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const requestBody: GeminiRequest = {
      contents: geminiContents,
    };

    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const generationConfig: GeminiRequest["generationConfig"] = {};
    if (this.config.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = this.config.maxTokens;
    }
    if (this.config.temperature !== undefined) {
      generationConfig.temperature = this.config.temperature;
    }
    if (Object.keys(generationConfig).length > 0) {
      requestBody.generationConfig = generationConfig;
    }

    const url = this.getApiUrl(`/models/${this.config.model}:generateContent`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as GeminiError;
      const errorMessage = errorData?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = (await response.json()) as GeminiResponse;

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error("Gemini API returned no candidates");
    }

    // Extract text content
    const textContent = candidate.content.parts
      .map((part) => part.text)
      .join("");

    // Map finish reason
    let finishReason: LLMResponse["finishReason"] = "stop";
    if (candidate.finishReason === "MAX_TOKENS") {
      finishReason = "length";
    } else if (candidate.finishReason === "SAFETY" || candidate.finishReason === "OTHER") {
      finishReason = "error";
    }

    return {
      content: textContent,
      model: this.config.model,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      finishReason,
    };
  }

  async validateKey(): Promise<LLMValidationResult> {
    try {
      // Use models list endpoint to validate key
      const url = this.getApiUrl("/models");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 400) {
        return { valid: false, error: "Invalid API key" };
      }

      if (response.status === 403) {
        return { valid: false, error: "API key does not have sufficient permissions" };
      }

      if (response.status === 429) {
        // Rate limited but key is valid
        return { valid: true };
      }

      const errorData = (await response.json().catch(() => ({}))) as GeminiError;
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
