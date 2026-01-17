import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AnalysisJobRow = {
  id: string;
  status: string;
  error_message: string | null;
  repo_id: string;
  commit_count?: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type UserProfileRow = {
  total_commits: number | null;
  total_repos: number | null;
  job_ids: unknown;
  updated_at: string | null;
  persona_name: string | null;
};

type AnalysisQuery = {
  select: (columns: string) => AnalysisQuery;
  eq: (column: string, value: string) => AnalysisQuery;
  in?: (column: string, values: string[]) => AnalysisQuery;
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
    .select("id, status, error_message, repo_id, commit_count, created_at, started_at, completed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const job = jobData as AnalysisJobRow | null;
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let report = null;
  let metrics = null;
  let insights = null;
  let profileContribution: unknown | null = null;

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

    const { data: repoData } = await (supabase as unknown as SupabaseQueryLike)
      .from("repos")
      .select("full_name")
      .eq("id", job.repo_id)
      .single();

    const repoName = (() => {
      if (!repoData || typeof repoData !== "object") return null;
      const name = (repoData as { full_name?: unknown }).full_name;
      return typeof name === "string" ? name : null;
    })();

    const { data: profileData } = await (supabase as unknown as SupabaseQueryLike)
      .from("user_profiles")
      .select("total_commits, total_repos, job_ids, updated_at, persona_name")
      .eq("user_id", user.id)
      .single();

    const profile = profileData as UserProfileRow | null;
    const profileJobIds = Array.isArray(profile?.job_ids)
      ? profile?.job_ids.filter((v): v is string => typeof v === "string")
      : null;

    const metricsTotalCommits = (() => {
      if (!m || typeof m !== "object") return null;
      const metricsJson = (m as { metrics_json?: unknown }).metrics_json;
      if (!metricsJson || typeof metricsJson !== "object") return null;
      const totalCommits = (metricsJson as { total_commits?: unknown }).total_commits;
      return typeof totalCommits === "number" ? totalCommits : null;
    })();

    const jobCommitCount =
      typeof job.commit_count === "number" ? job.commit_count : metricsTotalCommits ?? null;

    profileContribution = {
      repoName,
      jobCommitCount,
      includedInProfile: profileJobIds ? profileJobIds.includes(id) : null,
      profileTotalCommits: typeof profile?.total_commits === "number" ? profile.total_commits : null,
      profileTotalRepos: typeof profile?.total_repos === "number" ? profile.total_repos : null,
      profilePersonaName: typeof profile?.persona_name === "string" ? profile.persona_name : null,
      profileUpdatedAt: profile?.updated_at ?? null,
    };
  }

  return NextResponse.json({ job, report, metrics, insights, profileContribution });
}
