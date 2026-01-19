import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  type LLMProvider,
  LLM_PROVIDERS,
  PROVIDER_INFO,
  getDefaultModel,
} from "@vibed/core";
import { encryptLLMKey, isLLMKeyEncryptionConfigured, maskApiKey } from "@/lib/llmKey";

export const runtime = "nodejs";

type LLMConfigRow = {
  id: string;
  provider: LLMProvider;
  api_key_encrypted: string;
  model: string | null;
  is_active: boolean;
  free_tier_limit: number | null;
  llm_disabled: boolean | null;
  updated_at: string | null;
};

function defaultConfig(provider: LLMProvider) {
  return {
    provider,
    model: getDefaultModel(provider),
    maskedKey: "",
    hasKey: false,
    perRepoLimit: 1,
    llmDisabled: false,
    updatedAt: null as string | null,
  };
}

function maskForProvider(provider: LLMProvider, apiKey?: string) {
  if (apiKey) return maskApiKey(apiKey);
  return `${PROVIDER_INFO[provider].keyPrefix}...••••`;
}

export async function GET() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from("llm_configs")
    .select(
      "id, provider, api_key_encrypted, model, is_active, free_tier_limit, llm_disabled, updated_at"
    )
    .eq("scope", "platform")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "failed_to_fetch" }, { status: 500 });
  }

  const row = data as LLMConfigRow | null;
  const provider = row?.provider ?? "anthropic";

  const config = row
    ? {
        provider,
        model: row.model ?? getDefaultModel(provider),
        maskedKey: maskForProvider(provider),
        hasKey: Boolean(row.api_key_encrypted),
        perRepoLimit: row.free_tier_limit ?? 1,
        llmDisabled: row.llm_disabled ?? false,
        updatedAt: row.updated_at ?? null,
      }
    : defaultConfig(provider);

  return NextResponse.json({
    config,
    providers: LLM_PROVIDERS.map((id) => ({
      id,
      name: PROVIDER_INFO[id].name,
      keyUrl: PROVIDER_INFO[id].keyUrl,
      defaultModel: getDefaultModel(id),
    })),
  });
}

export async function POST(request: Request) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!isLLMKeyEncryptionConfigured()) {
    return NextResponse.json(
      { error: "llm_keys_not_configured", message: "LLM key storage is not configured" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        provider?: string;
        model?: string;
        apiKey?: string;
        perRepoLimit?: number;
        llmDisabled?: boolean;
      }
    | null;

  if (!body || typeof body.provider !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!LLM_PROVIDERS.includes(body.provider as LLMProvider)) {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }

  const provider = body.provider as LLMProvider;
  const model = typeof body.model === "string" && body.model.trim().length > 0
    ? body.model.trim()
    : getDefaultModel(provider);

  const perRepoLimit =
    typeof body.perRepoLimit === "number" && Number.isFinite(body.perRepoLimit)
      ? Math.max(0, Math.floor(body.perRepoLimit))
      : 1;

  const llmDisabled = Boolean(body.llmDisabled);

  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmConfigs = (service as any).from("llm_configs");
  const { data: existing } = await llmConfigs
    .select("id, api_key_encrypted")
    .eq("scope", "platform")
    .maybeSingle();

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKeyEncrypted =
    apiKey.length > 0 ? encryptLLMKey(apiKey) : (existing as { api_key_encrypted?: string } | null)?.api_key_encrypted;

  if (!apiKeyEncrypted && !llmDisabled) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  const { data, error } = await llmConfigs
    .upsert(
      {
        id: (existing as { id?: string } | null)?.id,
        scope: "platform",
        scope_id: null,
        provider,
        api_key_encrypted: apiKeyEncrypted ?? "",
        model,
        label: "Platform Default",
        is_active: true,
        free_tier_limit: perRepoLimit,
        llm_disabled: llmDisabled,
      },
      { onConflict: "scope,scope_id,provider" }
    )
    .select(
      "id, provider, api_key_encrypted, model, is_active, free_tier_limit, llm_disabled, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const saved = data as LLMConfigRow;

  return NextResponse.json({
    config: {
      provider: saved.provider,
      model: saved.model ?? getDefaultModel(saved.provider),
      maskedKey: maskForProvider(saved.provider, apiKey.length > 0 ? apiKey : undefined),
      hasKey: Boolean(saved.api_key_encrypted),
      perRepoLimit: saved.free_tier_limit ?? 1,
      llmDisabled: saved.llm_disabled ?? false,
      updatedAt: saved.updated_at ?? null,
    },
  });
}
