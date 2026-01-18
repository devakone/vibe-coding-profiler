/**
 * LLM Configuration Resolution
 *
 * Determines which LLM configuration to use for a given user and repo.
 * Implements free tier logic and key resolution order.
 */

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { decryptLLMKey, isLLMKeyEncryptionConfigured } from "@/lib/llmKey";
import {
  type LLMProvider,
  type LLMConfig,
  type LLMKeySource,
  type LLMResolutionResult,
  getDefaultModel,
} from "@vibed/core";

// Default free tier limit
const FREE_LLM_ANALYSES_PER_REPO = 1;

interface LLMConfigRecord {
  id: string;
  provider: LLMProvider;
  api_key_encrypted: string;
  model: string | null;
  is_active: boolean;
}

// Type for llm_configs queries (until DB types regenerated)
type LLMConfigsQuery = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: boolean) => {
          single: () => Promise<{ data: unknown; error: unknown }>;
          limit: (n: number) => Promise<{ data: unknown[]; error: unknown }>;
        };
      };
    };
  };
};

// Type for llm_usage queries (until DB types regenerated)
type LLMUsageQuery = {
  select: (columns: string, options?: { count: string; head: boolean }) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: boolean) => Promise<{ count: number | null; error: unknown }>;
        };
      };
    };
  };
  insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
};

/**
 * Get a user's active LLM configuration (their own API key).
 */
export async function getUserLLMConfig(userId: string): Promise<LLMConfig | null> {
  if (!isLLMKeyEncryptionConfigured()) {
    return null;
  }

  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmConfigs = (service as any).from("llm_configs") as LLMConfigsQuery;

  const { data, error } = await llmConfigs
    .select("id, provider, api_key_encrypted, model, is_active")
    .eq("scope", "user")
    .eq("scope_id", userId)
    .eq("is_active", true)
    .limit(1);

  if (error || !data || (data as unknown[]).length === 0) {
    return null;
  }

  const record = (data as unknown[])[0] as LLMConfigRecord;

  try {
    const apiKey = decryptLLMKey(record.api_key_encrypted);
    return {
      provider: record.provider,
      apiKey,
      model: record.model ?? getDefaultModel(record.provider),
    };
  } catch {
    console.error("Failed to decrypt user LLM key");
    return null;
  }
}

/**
 * Get the platform's default LLM configuration from environment.
 */
export function getPlatformLLMConfig(): LLMConfig | null {
  // Try each provider in order of preference
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: process.env.ANTHROPIC_MODEL?.trim() || getDefaultModel("anthropic"),
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL?.trim() || getDefaultModel("openai"),
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return {
      provider: "gemini",
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL?.trim() || getDefaultModel("gemini"),
    };
  }

  return null;
}

/**
 * Count how many free LLM analyses a user has used for a specific repo.
 */
export async function countFreeAnalysesUsed(userId: string, repoId: string): Promise<number> {
  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmUsage = (service as any).from("llm_usage") as LLMUsageQuery;

  const { count, error } = await llmUsage
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("repo_id", repoId)
    .eq("key_source", "platform")
    .eq("success", true);

  if (error) {
    console.error("Error counting free analyses:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Check if a user can use a free analysis for a specific repo.
 */
export async function canUseFreeAnalysis(userId: string, repoId: string): Promise<boolean> {
  const used = await countFreeAnalysesUsed(userId, repoId);
  const limit = FREE_LLM_ANALYSES_PER_REPO;
  return used < limit;
}

/**
 * Get the free tier limit.
 */
export function getFreeTierLimit(): number {
  return FREE_LLM_ANALYSES_PER_REPO;
}

/**
 * Resolve which LLM configuration to use for a given user and repo.
 *
 * Resolution order:
 * 1. User's own API key (if configured)
 * 2. Platform key (if user has free tier remaining)
 * 3. No LLM (fallback to metrics-only)
 */
export async function resolveLLMConfig(
  userId: string,
  repoId: string
): Promise<LLMResolutionResult> {
  // 1. Check if user has their own key configured
  const userConfig = await getUserLLMConfig(userId);
  if (userConfig) {
    return { config: userConfig, source: "user", reason: "user_key" };
  }

  // 2. Check if user has free tier remaining for this repo
  const canUseFree = await canUseFreeAnalysis(userId, repoId);
  if (canUseFree) {
    const platformConfig = getPlatformLLMConfig();
    if (platformConfig) {
      return { config: platformConfig, source: "platform", reason: "free_tier" };
    }
    // Platform key not configured
    return { config: null, source: "none", reason: "no_platform_key" };
  }

  // 3. Free tier exhausted, no user key
  return { config: null, source: "none", reason: "free_tier_exhausted" };
}

/**
 * Record LLM usage for analytics and free tier tracking.
 */
export async function recordLLMUsage(params: {
  userId: string;
  jobId?: string;
  repoId?: string;
  provider: LLMProvider;
  model: string;
  keySource: LLMKeySource;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmUsage = (service as any).from("llm_usage") as LLMUsageQuery;

  const { error } = await llmUsage.insert({
    user_id: params.userId,
    job_id: params.jobId ?? null,
    repo_id: params.repoId ?? null,
    provider: params.provider,
    model: params.model,
    key_source: params.keySource,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    success: params.success,
    error_message: params.errorMessage ?? null,
  });

  if (error) {
    console.error("Error recording LLM usage:", error);
  }
}
