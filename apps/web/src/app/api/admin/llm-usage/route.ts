import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type UsageRow = {
  key_source: "platform" | "user" | "sponsor";
  input_tokens: number | null;
  output_tokens: number | null;
};

export async function GET() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const service = createSupabaseServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from("llm_usage")
    .select("key_source, input_tokens, output_tokens")
    .gte("created_at", since.toISOString());

  if (error) {
    return NextResponse.json({ error: "failed_to_fetch" }, { status: 500 });
  }

  const rows = (data ?? []) as UsageRow[];
  const totals = {
    calls: rows.length,
    inputTokens: rows.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
    outputTokens: rows.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
  };

  const bySource = rows.reduce(
    (acc, r) => {
      acc[r.key_source] = (acc[r.key_source] ?? 0) + 1;
      return acc;
    },
    {} as Record<UsageRow["key_source"], number>
  );

  return NextResponse.json({
    totals,
    bySource,
    windowDays: 30,
  });
}
