/**
 * LLM Model Configuration
 *
 * Default models, fallbacks, and provider metadata.
 */

import type { LLMProvider } from "./types";

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
};

export const FALLBACK_MODELS: Record<LLMProvider, string[]> = {
  anthropic: ["claude-3-haiku-20240307"],
  openai: ["gpt-4o-mini"],
  gemini: ["gemini-1.5-flash"],
};

export interface ProviderInfo {
  name: string;
  keyPrefix: string;
  keyUrl: string;
}

export const PROVIDER_INFO: Record<LLMProvider, ProviderInfo> = {
  anthropic: {
    name: "Anthropic",
    keyPrefix: "sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    name: "OpenAI",
    keyPrefix: "sk-",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  gemini: {
    name: "Google Gemini",
    keyPrefix: "AIza",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
};

export const LLM_PROVIDERS: LLMProvider[] = ["anthropic", "openai", "gemini"];

/**
 * Get the default model for a provider.
 */
export function getDefaultModel(provider: LLMProvider): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Get fallback models for a provider (ordered by preference).
 */
export function getFallbackModels(provider: LLMProvider): string[] {
  return FALLBACK_MODELS[provider];
}

/**
 * Get all models for a provider (default + fallbacks).
 */
export function getModelCandidates(provider: LLMProvider): string[] {
  return [DEFAULT_MODELS[provider], ...FALLBACK_MODELS[provider]];
}

/**
 * Detect provider from API key prefix.
 */
export function detectProviderFromKey(apiKey: string): LLMProvider | null {
  const key = apiKey.trim();
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

/**
 * Mask an API key for display (show prefix + last 4 chars).
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 7) + "..." + key.slice(-4);
}
