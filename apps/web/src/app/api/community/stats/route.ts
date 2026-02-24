import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * GET /api/community/stats
 *
 * Returns anonymized, aggregated community statistics.
 * No authentication required — publicly accessible.
 * Payload is precomputed by the hourly Inngest rollup function.
 *
 * Uses a raw Supabase client (not typed) because community_rollups
 * is not yet in the generated database types.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("community_rollups")
    .select("payload_json")
    .eq("rollup_window", "30d")
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch community rollup:", error.message);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        suppressed: true,
        reason: "no_data_yet",
        eligible_profiles: 0,
        threshold: 10,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  return NextResponse.json(data.payload_json, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
