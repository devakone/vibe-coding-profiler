import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  aggregateUserProfile,
  computeVibeFromCommits,
  detectVibePersona,
  type RepoInsightSummary,
  type VibeAxes,
  type VibeCommitEvent,
} from "@vibed/core";

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

type DoneJobRow = {
  id: string;
  repo_id: string;
  commit_count: number | null;
  completed_at: string | null;
};

type RepoNameRow = { id: string; full_name: string };

type VibeInsightsRow = {
  job_id: string;
  axes_json: unknown;
  persona_id: string;
  persona_name: string;
  persona_tagline: string | null;
  persona_confidence: string;
  persona_score: number | null;
  cards_json: unknown;
};

type MetricsRow = {
  job_id: string;
  events_json: unknown;
  metrics_json: unknown;
};

function toCommitEvents(input: unknown): VibeCommitEvent[] | null {
  if (!Array.isArray(input)) return null;

  const commits: VibeCommitEvent[] = [];
  for (const row of input) {
    if (typeof row !== "object" || row === null) return null;
    const r = row as Record<string, unknown>;

    const sha = r.sha;
    const message = r.message;
    const author_date = r.author_date;
    const committer_date = r.committer_date;
    const author_email = r.author_email;
    const files_changed = r.files_changed;
    const additions = r.additions;
    const deletions = r.deletions;

    if (
      typeof sha !== "string" ||
      typeof message !== "string" ||
      typeof author_date !== "string" ||
      typeof committer_date !== "string" ||
      typeof author_email !== "string" ||
      typeof files_changed !== "number" ||
      typeof additions !== "number" ||
      typeof deletions !== "number"
    ) {
      return null;
    }

    const parentsRaw = r.parents;
    const parents = Array.isArray(parentsRaw)
      ? parentsRaw.filter((p): p is string => typeof p === "string")
      : [];

    const filePathsRaw = r.file_paths;
    const file_paths = Array.isArray(filePathsRaw)
      ? filePathsRaw.filter((p): p is string => typeof p === "string")
      : undefined;

    commits.push({
      sha,
      message,
      author_date,
      committer_date,
      author_email,
      files_changed,
      additions,
      deletions,
      parents,
      ...(file_paths ? { file_paths } : {}),
    });
  }

  return commits;
}

async function rebuildUserProfileIfNeeded(args: {
  userId: string;
  triggerJobId: string;
}): Promise<{ profileJobIds: string[]; profile: ReturnType<typeof aggregateUserProfile> } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey);

  const { data: completedJobsData, error: jobsError } = await supabase
    .from("analysis_jobs")
    .select("id, repo_id, commit_count, completed_at")
    .eq("user_id", args.userId)
    .eq("status", "done");

  if (jobsError || !completedJobsData || completedJobsData.length === 0) return null;

  const completedJobs = completedJobsData as DoneJobRow[];

  const repoIds = Array.from(
    new Set(completedJobs.map((j) => j.repo_id).filter((id): id is string => typeof id === "string"))
  );

  const { data: reposData } = await supabase.from("repos").select("id, full_name").in("id", repoIds);
  const repoNameById = new Map<string, string>();
  for (const r of (reposData ?? []) as RepoNameRow[]) {
    repoNameById.set(r.id, r.full_name);
  }

  const jobIds = completedJobs.map((j) => j.id);

  const { data: vibeInsightsData } = await supabase
    .from("vibe_insights")
    .select(
      "job_id, axes_json, persona_id, persona_name, persona_tagline, persona_confidence, persona_score, cards_json"
    )
    .in("job_id", jobIds);

  const vibeInsights = (vibeInsightsData ?? []) as VibeInsightsRow[];
  const vibeInsightByJobId = new Map<string, VibeInsightsRow>();
  for (const insight of vibeInsights) {
    vibeInsightByJobId.set(insight.job_id, insight);
  }

  const missingJobIds = jobIds.filter((jobId) => !vibeInsightByJobId.has(jobId));
  const { data: metricsData } =
    missingJobIds.length > 0
      ? await supabase.from("analysis_metrics").select("job_id, events_json, metrics_json").in("job_id", missingJobIds)
      : { data: [] as MetricsRow[] };

  const metricsByJobId = new Map<string, MetricsRow>();
  for (const row of (metricsData ?? []) as MetricsRow[]) {
    metricsByJobId.set(row.job_id, row);
  }

  const computedByJobId = new Map<string, ReturnType<typeof computeVibeFromCommits>>();
  for (const jobId of missingJobIds) {
    const row = metricsByJobId.get(jobId);
    const commits = row ? toCommitEvents(row.events_json) : null;
    if (!commits) continue;
    computedByJobId.set(jobId, computeVibeFromCommits({ commits, episodeGapHours: 4 }));
  }

  const commitCountByJobId = new Map<string, number>();
  for (const row of (metricsData ?? []) as MetricsRow[]) {
    const metricsJson = row.metrics_json;
    if (typeof metricsJson !== "object" || metricsJson === null) continue;
    const totalCommits = (metricsJson as { total_commits?: unknown }).total_commits;
    if (typeof totalCommits === "number") commitCountByJobId.set(row.job_id, totalCommits);
  }

  const repoInsights: RepoInsightSummary[] = [];

  for (const job of completedJobs) {
    const repoName = repoNameById.get(job.repo_id) ?? "Unknown";
    const commitCount = job.commit_count ?? commitCountByJobId.get(job.id) ?? 0;

    const vibeInsight = vibeInsightByJobId.get(job.id);
    if (vibeInsight) {
      const axes = vibeInsight.axes_json as VibeAxes;
      repoInsights.push({
        jobId: job.id,
        repoName,
        commitCount,
        axes,
        persona: detectVibePersona(axes, { commitCount, prCount: 0 }),
        analyzedAt: job.completed_at ?? new Date().toISOString(),
      });
      continue;
    }

    const computed = computedByJobId.get(job.id);
    if (computed) {
      repoInsights.push({
        jobId: job.id,
        repoName,
        commitCount,
        axes: computed.axes,
        persona: computed.persona,
        analyzedAt: job.completed_at ?? new Date().toISOString(),
      });
    }
  }

  if (repoInsights.length === 0) return null;

  const profile = aggregateUserProfile(repoInsights);

  await supabase.from("user_profiles").upsert(
    {
      user_id: args.userId,
      total_commits: profile.totalCommits,
      total_repos: profile.totalRepos,
      job_ids: profile.jobIds,
      axes_json: profile.axes,
      persona_id: profile.persona.id,
      persona_name: profile.persona.name,
      persona_tagline: profile.persona.tagline,
      persona_confidence: profile.persona.confidence,
      persona_score: profile.persona.score,
      repo_personas_json: profile.repoBreakdown,
      cards_json: profile.cards,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabase.from("user_profile_history").insert({
    user_id: args.userId,
    profile_snapshot: profile,
    trigger_job_id: args.triggerJobId,
  });

  return { profileJobIds: profile.jobIds, profile };
}

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
  let userAvatarUrl: string | null = null;

  // Fetch user avatar from users table
  const { data: userData } = await (supabase as unknown as SupabaseQueryLike)
    .from("users")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (userData && typeof userData === "object") {
    const avatarUrl = (userData as { avatar_url?: unknown }).avatar_url;
    userAvatarUrl = typeof avatarUrl === "string" ? avatarUrl : null;
  }

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
    let profileJobIds = Array.isArray(profile?.job_ids)
      ? profile?.job_ids.filter((v): v is string => typeof v === "string")
      : null;

    if (!profileJobIds || !profileJobIds.includes(id)) {
      const rebuilt = await rebuildUserProfileIfNeeded({ userId: user.id, triggerJobId: id });
      if (rebuilt) {
        profileJobIds = rebuilt.profileJobIds;
      }
    }

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

  return NextResponse.json({ job, report, metrics, insights, profileContribution, userAvatarUrl });
}
