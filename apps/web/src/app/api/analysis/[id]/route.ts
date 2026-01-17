import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AnalysisJobRow = {
  id: string;
  status: string;
  error_message: string | null;
  repo_id: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type AnalysisQuery = {
  select: (columns: string) => AnalysisQuery;
  eq: (column: string, value: string) => AnalysisQuery;
  single: () => Promise<{ data: unknown | null }>;
};

type SupabaseQueryLike = {
  from: (table: string) => AnalysisQuery;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: jobData } = await (supabase as unknown as SupabaseQueryLike)
    .from("analysis_jobs")
    .select("id, status, error_message, repo_id, created_at, started_at, completed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const job = jobData as AnalysisJobRow | null;
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let report = null;
  let metrics = null;
  let insights = null;

  if (job.status === "done") {
    const { data: r } = await (supabase as unknown as SupabaseQueryLike)
      .from("analysis_reports")
      .select("vibe_type, narrative_json, evidence_json, llm_model, generated_at")
      .eq("job_id", id)
      .single();

    const { data: m } = await (supabase as unknown as SupabaseQueryLike)
      .from("analysis_metrics")
      .select("metrics_json, events_json, computed_at")
      .eq("job_id", id)
      .single();

    const { data: i } = await (supabase as unknown as SupabaseQueryLike)
      .from("analysis_insights")
      .select("insights_json, generator_version, generated_at")
      .eq("job_id", id)
      .single();

    report = r ?? null;
    metrics = m ?? null;
    insights = i ?? null;
  }

  return NextResponse.json({ job, report, metrics, insights });
}
