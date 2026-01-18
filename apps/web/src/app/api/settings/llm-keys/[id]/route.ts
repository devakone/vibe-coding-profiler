import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// Type for llm_configs table operations (until DB types are regenerated)
type LLMConfigsDeleteTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
  delete: () => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    };
  };
};

/**
 * DELETE /api/settings/llm-keys/[id]
 * Remove an LLM API key
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
  const llmConfigs = (service as any).from("llm_configs") as LLMConfigsDeleteTable;

  // Verify ownership before deleting
  const { data: existing, error: fetchError } = await llmConfigs
    .select("id")
    .eq("id", id)
    .eq("scope", "user")
    .eq("scope_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error: deleteError } = await llmConfigs
    .delete()
    .eq("id", id)
    .eq("scope", "user")
    .eq("scope_id", user.id);

  if (deleteError) {
    console.error("Error deleting LLM key:", deleteError);
    return NextResponse.json({ error: "failed_to_delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
