import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("analysis_insights")
    .select(
      "job_id, persona_id, persona_label, persona_confidence, generated_at, share_template, analysis_jobs(status, created_at, repo_id)"
    )
    .eq("analysis_jobs.user_id", user.id)
    .order("created_at", { ascending: false, referencedTable: "analysis_jobs" });

  if (error) {
    console.error("Failed to fetch insight history:", error);
    return NextResponse.json({ error: "failed_to_fetch" }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}
