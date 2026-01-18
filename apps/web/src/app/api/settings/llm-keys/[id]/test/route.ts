import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { decryptLLMKey, isLLMKeyEncryptionConfigured } from "@/lib/llmKey";
import { type LLMProvider, createLLMClient, getDefaultModel } from "@vibed/core";

export const runtime = "nodejs";

// Type for llm_configs table operations (until DB types are regenerated)
type LLMConfigsSelectTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
};

interface LLMKeyRecord {
  id: string;
  provider: LLMProvider;
  api_key_encrypted: string;
  model: string | null;
}

/**
 * POST /api/settings/llm-keys/[id]/test
 * Test an existing LLM API key
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // Use service client with type escape for new table (until DB types regenerated)
  const service = createSupabaseServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llmConfigs = (service as any).from("llm_configs") as LLMConfigsSelectTable;

  // Fetch the key record
  const { data: keyRecord, error: fetchError } = await llmConfigs
    .select("id, provider, api_key_encrypted, model")
    .eq("id", id)
    .eq("scope", "user")
    .eq("scope_id", user.id)
    .single();

  if (fetchError || !keyRecord) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const record = keyRecord as LLMKeyRecord;

  // Decrypt and test the key
  let decryptedKey: string;
  try {
    decryptedKey = decryptLLMKey(record.api_key_encrypted);
  } catch (error) {
    console.error("Error decrypting LLM key:", error);
    return NextResponse.json(
      { error: "decryption_failed", message: "Failed to decrypt stored key" },
      { status: 500 }
    );
  }

  const model = record.model ?? getDefaultModel(record.provider);
  const client = createLLMClient({
    provider: record.provider,
    apiKey: decryptedKey,
    model,
  });

  const validation = await client.validateKey();

  return NextResponse.json({
    valid: validation.valid,
    error: validation.error,
    provider: record.provider,
    model,
  });
}
