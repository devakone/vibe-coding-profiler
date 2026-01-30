import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptLLMKey, maskApiKey, isLLMKeyEncryptionConfigured } from "@/lib/llmKey";
import {
  type LLMProvider,
  LLM_PROVIDERS,
  PROVIDER_INFO,
  detectProviderFromKey,
  getDefaultModel,
  createLLMClient,
} from "@vibe-coding-profiler/core";

export const runtime = "nodejs";

// Type for llm_configs table (until DB types are regenerated)
type LLMConfigsTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown[]; error: unknown }>;
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
  upsert: (
    values: Record<string, unknown>,
    options?: { onConflict?: string }
  ) => {
    select: (columns: string) => {
      single: () => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

interface LLMKeyRecord {
  id: string;
  provider: LLMProvider;
  label: string | null;
  api_key_encrypted: string;
  model: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LLMKeyResponse {
  id: string;
  provider: LLMProvider;
  providerName: string;
  label: string | null;
  maskedKey: string;
  model: string | null;
  isActive: boolean;
  createdAt: string;
}

function toKeyResponse(record: LLMKeyRecord, originalKey?: string): LLMKeyResponse {
  // For masking, we need the original key or derive it from the prefix
  const providerInfo = PROVIDER_INFO[record.provider];
  const maskedKey = originalKey
    ? maskApiKey(originalKey)
    : `${providerInfo.keyPrefix}...••••`;

  return {
    id: record.id,
    provider: record.provider,
    providerName: providerInfo.name,
    label: record.label,
    maskedKey,
    model: record.model,
    isActive: record.is_active,
    createdAt: record.created_at,
  };
}

/**
 * GET /api/settings/llm-keys
 * List user's configured LLM API keys (masked)
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Use service client with type escape for new table (until DB types regenerated)
  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmConfigs = (service as any).from("llm_configs") as LLMConfigsTable;

  const { data: keys, error } = await llmConfigs
    .select("id, provider, label, api_key_encrypted, model, is_active, created_at, updated_at")
    .eq("scope", "user")
    .eq("scope_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching LLM keys:", error);
    return NextResponse.json({ error: "failed_to_fetch" }, { status: 500 });
  }

  const keyRecords = (keys ?? []) as LLMKeyRecord[];
  const responseKeys = keyRecords.map((k) => toKeyResponse(k));

  return NextResponse.json({
    keys: responseKeys,
    platformLimits: {
      perRepoLimit: 1,
      description: "1 AI narrative per repo included",
    },
    supportedProviders: LLM_PROVIDERS.map((p) => ({
      id: p,
      name: PROVIDER_INFO[p].name,
      keyUrl: PROVIDER_INFO[p].keyUrl,
    })),
  });
}

/**
 * POST /api/settings/llm-keys
 * Add a new LLM API key
 */
export async function POST(request: Request) {
  // Check if encryption is configured
  if (!isLLMKeyEncryptionConfigured()) {
    return NextResponse.json(
      { error: "llm_keys_not_configured", message: "LLM key storage is not configured on this server" },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { provider?: string; apiKey?: string; label?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { provider, apiKey, label, model } = body;

  // Validate provider
  if (!provider || !LLM_PROVIDERS.includes(provider as LLMProvider)) {
    return NextResponse.json(
      { error: "invalid_provider", message: `Provider must be one of: ${LLM_PROVIDERS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate API key
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  const trimmedKey = apiKey.trim();
  const typedProvider = provider as LLMProvider;

  // Auto-detect provider from key if mismatched
  const detectedProvider = detectProviderFromKey(trimmedKey);
  if (detectedProvider && detectedProvider !== typedProvider) {
    return NextResponse.json(
      {
        error: "provider_mismatch",
        message: `API key appears to be for ${PROVIDER_INFO[detectedProvider].name}, not ${PROVIDER_INFO[typedProvider].name}`,
      },
      { status: 400 }
    );
  }

  // Validate key by testing it
  const testModel = model ?? getDefaultModel(typedProvider);
  const client = createLLMClient({
    provider: typedProvider,
    apiKey: trimmedKey,
    model: testModel,
  });

  const validation = await client.validateKey();
  if (!validation.valid) {
    return NextResponse.json(
      { error: "invalid_api_key", message: validation.error ?? "API key validation failed" },
      { status: 400 }
    );
  }

  // Encrypt and store
  const encryptedKey = encryptLLMKey(trimmedKey);

  // Use service client with type escape for new table (until DB types regenerated)
  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmConfigs = (service as any).from("llm_configs") as LLMConfigsTable;

  const { data: inserted, error: insertError } = await llmConfigs
    .upsert(
      {
        scope: "user",
        scope_id: user.id,
        provider: typedProvider,
        api_key_encrypted: encryptedKey,
        label: label?.trim() || null,
        model: model?.trim() || null,
        is_active: true,
      },
      { onConflict: "scope,scope_id,provider" }
    )
    .select("id, provider, label, api_key_encrypted, model, is_active, created_at, updated_at")
    .single();

  if (insertError) {
    console.error("Error inserting LLM key:", insertError);
    return NextResponse.json({ error: "failed_to_save" }, { status: 500 });
  }

  const record = inserted as LLMKeyRecord;
  return NextResponse.json(toKeyResponse(record, trimmedKey), { status: 201 });
}
