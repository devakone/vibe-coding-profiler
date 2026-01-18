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

// Default free tier limit (used if not configured in database)
const DEFAULT_FREE_LLM_ANALYSES_PER_REPO = 1;

// Default limit for repos with LLM reports that can contribute to LLM profile generation
const DEFAULT_PROFILE_LLM_REPO_LIMIT = 3;

interface LLMConfigRecord {
  id: string;
  provider: LLMProvider;
  api_key_encrypted: string;
  model: string | null;
  is_active: boolean;
}

interface PlatformLLMConfigRecord {
  id: string;
  provider: LLMProvider;
  api_key_encrypted: string;
  model: string | null;
  is_active: boolean;
  free_tier_limit: number | null;
  llm_disabled: boolean | null;
  profile_llm_repo_limit: number | null;
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
 * Cached platform config to avoid repeated database queries within a request.
 */
let platformConfigCache: {
  config: LLMConfig | null;
  freeTierLimit: number;
  llmDisabled: boolean;
  profileLlmRepoLimit: number;
  fetchedAt: number;
} | null = null;

const PLATFORM_CONFIG_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get the platform's LLM configuration from database (primary) or environment (fallback).
 *
 * The platform config is stored in llm_configs table with scope='platform'.
 * Falls back to environment variables for backwards compatibility.
 */
export async function getPlatformLLMConfig(): Promise<LLMConfig | null> {
  const fullConfig = await getPlatformLLMConfigFull();
  if (fullConfig.llmDisabled) {
    return null;
  }
  return fullConfig.config;
}

/**
 * Get the full platform LLM configuration including free tier limit, disabled flag,
 * and profile LLM repo limit.
 */
export async function getPlatformLLMConfigFull(): Promise<{
  config: LLMConfig | null;
  freeTierLimit: number;
  llmDisabled: boolean;
  profileLlmRepoLimit: number;
}> {
  // Check cache
  if (
    platformConfigCache &&
    Date.now() - platformConfigCache.fetchedAt < PLATFORM_CONFIG_CACHE_TTL_MS
  ) {
    return {
      config: platformConfigCache.config,
      freeTierLimit: platformConfigCache.freeTierLimit,
      llmDisabled: platformConfigCache.llmDisabled,
      profileLlmRepoLimit: platformConfigCache.profileLlmRepoLimit,
    };
  }

  // Try database first
  const dbConfig = await getPlatformLLMConfigFromDB();
  if (dbConfig) {
    platformConfigCache = {
      config: dbConfig.config,
      freeTierLimit: dbConfig.freeTierLimit,
      llmDisabled: dbConfig.llmDisabled,
      profileLlmRepoLimit: dbConfig.profileLlmRepoLimit,
      fetchedAt: Date.now(),
    };
    return dbConfig;
  }

  // Fallback to environment variables (for backwards compatibility)
  const envConfig = getPlatformLLMConfigFromEnv();
  platformConfigCache = {
    config: envConfig,
    freeTierLimit: DEFAULT_FREE_LLM_ANALYSES_PER_REPO,
    llmDisabled: false,
    profileLlmRepoLimit: DEFAULT_PROFILE_LLM_REPO_LIMIT,
    fetchedAt: Date.now(),
  };
  return {
    config: envConfig,
    freeTierLimit: DEFAULT_FREE_LLM_ANALYSES_PER_REPO,
    llmDisabled: false,
    profileLlmRepoLimit: DEFAULT_PROFILE_LLM_REPO_LIMIT,
  };
}

/**
 * Get platform LLM config from the database.
 */
async function getPlatformLLMConfigFromDB(): Promise<{
  config: LLMConfig | null;
  freeTierLimit: number;
  llmDisabled: boolean;
  profileLlmRepoLimit: number;
} | null> {
  if (!isLLMKeyEncryptionConfigured()) {
    return null;
  }

  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from("llm_configs")
    .select("id, provider, api_key_encrypted, model, is_active, free_tier_limit, llm_disabled, profile_llm_repo_limit")
    .eq("scope", "platform")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const record = data as PlatformLLMConfigRecord;
  const freeTierLimit = record.free_tier_limit ?? DEFAULT_FREE_LLM_ANALYSES_PER_REPO;
  const llmDisabled = record.llm_disabled ?? false;
  const profileLlmRepoLimit = record.profile_llm_repo_limit ?? DEFAULT_PROFILE_LLM_REPO_LIMIT;

  if (llmDisabled || !record.api_key_encrypted) {
    return { config: null, freeTierLimit, llmDisabled, profileLlmRepoLimit };
  }

  try {
    const apiKey = decryptLLMKey(record.api_key_encrypted);
    return {
      config: {
        provider: record.provider,
        apiKey,
        model: record.model ?? getDefaultModel(record.provider),
      },
      freeTierLimit,
      llmDisabled,
      profileLlmRepoLimit,
    };
  } catch {
    console.error("Failed to decrypt platform LLM key");
    return { config: null, freeTierLimit, llmDisabled, profileLlmRepoLimit };
  }
}

/**
 * Get platform LLM config from environment variables (fallback).
 */
function getPlatformLLMConfigFromEnv(): LLMConfig | null {
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
  const platformConfig = await getPlatformLLMConfigFull();
  return used < platformConfig.freeTierLimit;
}

/**
 * Get the free tier limit (from database or default).
 */
export async function getFreeTierLimit(): Promise<number> {
  const platformConfig = await getPlatformLLMConfigFull();
  return platformConfig.freeTierLimit;
}

/**
 * Resolve which LLM configuration to use for a given user and repo.
 *
 * Resolution order:
 * 1. Check if LLM is disabled at platform level
 * 2. User's own API key (if configured)
 * 3. Platform key (if user has free tier remaining)
 * 4. No LLM (fallback to metrics-only)
 */
export async function resolveLLMConfig(
  userId: string,
  repoId: string
): Promise<LLMResolutionResult> {
  // 0. Check if LLM is disabled at platform level
  const platformFull = await getPlatformLLMConfigFull();
  if (platformFull.llmDisabled) {
    return { config: null, source: "none", reason: "llm_disabled" };
  }

  // 1. Check if user has their own key configured
  const userConfig = await getUserLLMConfig(userId);
  if (userConfig) {
    return { config: userConfig, source: "user", reason: "user_key" };
  }

  // 2. Check if user has free tier remaining for this repo
  const used = await countFreeAnalysesUsed(userId, repoId);
  const canUseFree = used < platformFull.freeTierLimit;

  if (canUseFree) {
    if (platformFull.config) {
      return { config: platformFull.config, source: "platform", reason: "free_tier" };
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

/**
 * Get the profile LLM repo limit (from database or default).
 * This is the maximum number of repos with LLM-generated reports
 * that can contribute to an LLM-generated aggregated profile.
 */
export async function getProfileLlmRepoLimit(): Promise<number> {
  const platformConfig = await getPlatformLLMConfigFull();
  return platformConfig.profileLlmRepoLimit;
}

/**
 * Count how many repos have successful LLM-generated reports for a user.
 */
export async function countReposWithLlmReports(userId: string): Promise<number> {
  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from("llm_usage")
    .select("repo_id")
    .eq("user_id", userId)
    .eq("success", true)
    .not("repo_id", "is", null);

  if (error) {
    console.error("Error counting repos with LLM reports:", error);
    return 0;
  }

  // Count unique repo IDs
  const uniqueRepoIds = new Set((data ?? []).map((r: { repo_id: string }) => r.repo_id));
  return uniqueRepoIds.size;
}

/**
 * Resolve LLM configuration for profile generation.
 *
 * Resolution order:
 * 1. Check if LLM is disabled at platform level
 * 2. User's own API key (always allowed for profile)
 * 3. Platform key (if user has <= profileLlmRepoLimit repos with LLM reports)
 * 4. No LLM (fallback to deterministic profile)
 */
export async function resolveProfileLLMConfig(
  userId: string
): Promise<LLMResolutionResult> {
  const platformFull = await getPlatformLLMConfigFull();

  // 0. Check if LLM is disabled at platform level
  if (platformFull.llmDisabled) {
    return { config: null, source: "none", reason: "llm_disabled" };
  }

  // 1. Check if user has their own key configured (always allowed)
  const userConfig = await getUserLLMConfig(userId);
  if (userConfig) {
    return { config: userConfig, source: "user", reason: "user_key" };
  }

  // 2. Check if user is within profile LLM repo limit
  const reposWithLlm = await countReposWithLlmReports(userId);
  const canUsePlatformForProfile = reposWithLlm <= platformFull.profileLlmRepoLimit;

  if (canUsePlatformForProfile) {
    if (platformFull.config) {
      return { config: platformFull.config, source: "platform", reason: "free_tier" };
    }
    // Platform key not configured
    return { config: null, source: "none", reason: "no_platform_key" };
  }

  // 3. Profile LLM limit exceeded, no user key
  return { config: null, source: "none", reason: "profile_llm_limit_exceeded" };
}
