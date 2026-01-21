import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@vibed/db";
import { wrappedTheme } from "@/lib/theme";
import { formatMatchedRule, AXIS_LEGEND } from "@/lib/format-labels";
import { createClient } from "@supabase/supabase-js";
import {
  aggregateUserProfile,
  computeVibeFromCommits,
  detectVibePersona,
  type RepoInsightSummary,
  type VibeAxes,
  type VibeCommitEvent,
} from "@vibed/core";

const heroFeatures = [
  "A Vibed profile built from vibe-coding signals in your commit history",
  "Persona snapshots that evolve as you add more repos",
  "Share-ready cards with playful language and honest confidence",
  "Deep dive metrics and evidence when you want receipts",
];

const timeline = [
  { title: "Connect GitHub", description: "Sign in, then pick the repos that feel like you." },
  { title: "Run a vibe check", description: "We read commit metadata and patterns (not your code)." },
  { title: "Get your Vibed read", description: "Highlights, categories, and insights into how you build." },
  { title: "See your persona", description: "A playful archetype that changes as your work evolves." },
];

type AuthStats = {
  connectedRepos: number;
  completedJobs: number;
  queuedJobs: number;
  analyzedRepos: number;
  analyzedCommits: number;
  personaHistory: {
    label: string | null;
    generatedAt: string | null;
  }[];
  latestJob?: {
    status: string;
    repoName: string | null;
    updatedAt: string | null;
  };
  latestPersona?: {
    label: string | null;
    confidence: string | null;
    repoName: string | null;
    generatedAt: string | null;
  };
  userProfile?: {
    personaName: string;
    personaTagline: string | null;
    personaConfidence: string;
    totalRepos: number;
    totalCommits: number;
    axes: Record<string, { score: number; level: string; why: string[] }>;
    repoPersonas: Array<{
      repoName: string;
      personaId: string;
      personaName: string;
      commitCount: number;
    }>;
    updatedAt: string | null;
  };
};

type LatestJobRow = Pick<
  Database["public"]["Tables"]["analysis_jobs"]["Row"],
  "status" | "repo_id" | "created_at" | "started_at" | "completed_at"
>;

type RepoNameRow = Pick<
  Database["public"]["Tables"]["repos"]["Row"],
  "full_name"
>;

type LatestInsightRow = {
  job_id: string;
  persona_label: string | null;
  persona_confidence: string | null;
  generated_at: string | null;
  analysis_jobs:
    | {
        created_at: string;
        repo_id: string | null;
      }
    | null;
};

type DoneJobRow = {
  id: string;
  repo_id: string;
  commit_count: number | null;
  created_at: string;
  completed_at: string | null;
};

type RepoFullNameRow = { id: string; full_name: string };

type VibeInsightsRow = {
  job_id: string;
  axes_json: unknown;
  persona_id: string;
  persona_name: string;
  persona_tagline: string | null;
  persona_confidence: string;
  persona_score: number | null;
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

async function rebuildUserProfileIfNeeded(args: { userId: string }): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const supabase = createClient(url, serviceKey);

  const { data: userReposData, error: userReposError } = await supabase
    .from("user_repos")
    .select("repo_id, disconnected_at")
    .eq("user_id", args.userId);

  if (userReposError) return;

  const disconnectedRepoIds = new Set(
    (userReposData ?? [])
      .filter((r) => r.disconnected_at != null)
      .map((r) => r.repo_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );

  const { data: completedJobsData, error: jobsError } = await supabase
    .from("analysis_jobs")
    .select("id, repo_id, commit_count, created_at, completed_at")
    .eq("user_id", args.userId)
    .eq("status", "done");

  if (jobsError || !completedJobsData || completedJobsData.length === 0) return;

  const includedJobs = (completedJobsData as DoneJobRow[]).filter((job) => {
    if (typeof job.repo_id !== "string") return false;
    if (disconnectedRepoIds.has(job.repo_id)) return false;
    return true;
  });

  if (includedJobs.length === 0) return;

  const latestJobByRepoId = new Map<string, DoneJobRow>();
  for (const job of includedJobs) {
    const existing = latestJobByRepoId.get(job.repo_id);
    if (!existing) {
      latestJobByRepoId.set(job.repo_id, job);
      continue;
    }

    const jobUpdatedAt = job.completed_at ?? job.created_at;
    const existingUpdatedAt = existing.completed_at ?? existing.created_at;
    if (String(jobUpdatedAt) > String(existingUpdatedAt)) {
      latestJobByRepoId.set(job.repo_id, job);
    }
  }

  const dedupedJobs = Array.from(latestJobByRepoId.values());

  const repoIds = Array.from(new Set(dedupedJobs.map((j) => j.repo_id)));
  const { data: reposData } = await supabase.from("repos").select("id, full_name").in("id", repoIds);
  const repoNameById = new Map<string, string>();
  for (const r of (reposData ?? []) as RepoFullNameRow[]) {
    repoNameById.set(r.id, r.full_name);
  }

  const jobIds = dedupedJobs.map((j) => j.id);
  const { data: vibeInsightsData } = await supabase
    .from("vibe_insights")
    .select("job_id, axes_json, persona_id, persona_name, persona_tagline, persona_confidence, persona_score")
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

  // Backfill computed vibes to vibe_insights table
  if (computedByJobId.size > 0) {
    const backfillRows = Array.from(computedByJobId.entries()).map(([jobId, v]) => ({
      job_id: jobId,
      version: v.version,
      axes_json: v.axes,
      persona_id: v.persona.id,
      persona_name: v.persona.name,
      persona_tagline: v.persona.tagline,
      persona_confidence: v.persona.confidence,
      persona_score: v.persona.score,
    }));
    await supabase.from("vibe_insights").upsert(backfillRows, { onConflict: "job_id" });
  }

  const commitCountByJobId = new Map<string, number>();
  for (const row of (metricsData ?? []) as MetricsRow[]) {
    const metricsJson = row.metrics_json;
    if (typeof metricsJson !== "object" || metricsJson === null) continue;
    const totalCommits = (metricsJson as { total_commits?: unknown }).total_commits;
    if (typeof totalCommits === "number") commitCountByJobId.set(row.job_id, totalCommits);
  }

  const repoInsights: RepoInsightSummary[] = [];

  for (const job of dedupedJobs) {
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

  if (repoInsights.length === 0) return;

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

  const triggerJobId =
    dedupedJobs
      .slice()
      .sort((a, b) =>
        String(b.completed_at ?? b.created_at).localeCompare(
          String(a.completed_at ?? a.created_at)
        )
      )[0]?.id ?? null;

  await supabase.from("user_profile_history").insert({
    user_id: args.userId,
    profile_snapshot: profile,
    trigger_job_id: triggerJobId,
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <MarketingLanding />;

  const [
    connectedRepoIdsResult,
    connectedReposResult,
    completedJobsResult,
    queuedJobsResult,
    completedJobsRowsResult,
    latestJobResult,
    latestInsightResult,
    recentDoneJobsResult,
    userProfileResult,
  ] =
    await Promise.all([
      supabase
        .from("user_repos")
        .select("repo_id")
        .eq("user_id", user.id)
        .is("disconnected_at", null),
      supabase
        .from("user_repos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("disconnected_at", null),
      supabase
        .from("analysis_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "done"),
      supabase
        .from("analysis_jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["queued", "running"]),
      supabase
        .from("analysis_jobs")
        .select("repo_id, commit_count, created_at, completed_at")
        .eq("user_id", user.id)
        .eq("status", "done")
        .order("created_at", { ascending: false }),
      supabase
        .from("analysis_jobs")
        .select("status,created_at,started_at,completed_at,repo_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analysis_insights")
        .select(
          "job_id, persona_label, persona_confidence, generated_at, analysis_jobs(created_at, repo_id)"
        )
        .eq("analysis_jobs.user_id", user.id)
        .order("analysis_jobs.created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analysis_jobs")
        .select("id, created_at")
        .eq("user_id", user.id)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("user_profiles")
        .select(
          "persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, repo_personas_json, updated_at, job_ids"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const latestJob = (latestJobResult.data ?? null) as unknown as LatestJobRow | null;
  const latestInsight = (latestInsightResult.data ?? null) as unknown as LatestInsightRow | null;
  const completedJobsCount = typeof completedJobsResult.count === "number" ? completedJobsResult.count : 0;
  const recentDoneJobs = (recentDoneJobsResult.data ?? []) as Array<{
    id: string;
    created_at: string;
  }>;

  const maybeProfileData = userProfileResult.data as {
    persona_name: string;
    persona_tagline: string | null;
    persona_confidence: string;
    total_repos: number;
    total_commits: number;
    axes_json: Record<string, { score: number; level: string; why: string[] }>;
    repo_personas_json: Array<{
      repoName: string;
      personaId: string;
      personaName: string;
      commitCount: number;
    }>;
    updated_at: string | null;
    job_ids: unknown;
  } | null;

  const profileJobIds = Array.isArray(maybeProfileData?.job_ids)
    ? maybeProfileData?.job_ids.filter((v): v is string => typeof v === "string")
    : null;

  const connectedRepoIdRows = (connectedRepoIdsResult.data ?? []) as Array<{
    repo_id: string | null;
  }>;
  const connectedRepoIds = new Set(
    connectedRepoIdRows
      .map((r) => r.repo_id)
      .filter((id): id is string => Boolean(id))
  );

  const completedJobsRows = (completedJobsRowsResult.data ?? []) as Array<{
    repo_id: string | null;
    commit_count: number | null;
    created_at: string;
    completed_at: string | null;
  }>;

  const latestDoneJobByRepoId = new Map<
    string,
    { repo_id: string; commit_count: number | null; created_at: string; completed_at: string | null }
  >();
  for (const row of completedJobsRows) {
    if (!row.repo_id) continue;
    if (!connectedRepoIds.has(row.repo_id)) continue;
    if (!latestDoneJobByRepoId.has(row.repo_id)) {
      latestDoneJobByRepoId.set(row.repo_id, {
        repo_id: row.repo_id,
        commit_count: row.commit_count,
        created_at: row.created_at,
        completed_at: row.completed_at,
      });
    }
  }

  const analyzedJobs = Array.from(latestDoneJobByRepoId.values());
  const analyzedRepos = analyzedJobs.length;
  const analyzedCommits = analyzedJobs.reduce((sum, j) => sum + (j.commit_count ?? 0), 0);

  const latestCompletedAt =
    latestJob?.status === "done" && typeof latestJob.completed_at === "string" ? latestJob.completed_at : null;

  const profileRepoCountMismatch =
    typeof maybeProfileData?.total_repos === "number" && maybeProfileData.total_repos !== analyzedRepos;

  const profileIsStale =
    completedJobsCount > 0 &&
    (!maybeProfileData ||
      profileRepoCountMismatch ||
      (profileJobIds && profileJobIds.length < analyzedRepos) ||
      (latestCompletedAt &&
        (!maybeProfileData.updated_at || String(maybeProfileData.updated_at) < String(latestCompletedAt))));

  if (profileIsStale) {
    await rebuildUserProfileIfNeeded({ userId: user.id });
  }

  const refreshedProfileResult = profileIsStale
    ? await supabase
        .from("user_profiles")
        .select(
          "persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, repo_personas_json, updated_at"
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : null;

  const userProfileData = (profileIsStale ? refreshedProfileResult?.data ?? null : maybeProfileData) as {
    persona_name: string;
    persona_tagline: string | null;
    persona_confidence: string;
    total_repos: number;
    total_commits: number;
    axes_json: Record<string, { score: number; level: string; why: string[] }>;
    repo_personas_json: Array<{
      repoName: string;
      personaId: string;
      personaName: string;
      commitCount: number;
    }>;
    updated_at: string | null;
  } | null;

  const recentDoneJobIds = recentDoneJobs.map((job) => job.id);
  const recentInsightsResult =
    recentDoneJobIds.length > 0
      ? await supabase
          .from("analysis_insights")
          .select("job_id, persona_label, generated_at")
          .in("job_id", recentDoneJobIds)
      : null;

  const insightByJobId = new Map<
    string,
    { persona_label: string | null; generated_at: string | null }
  >();
  for (const row of (recentInsightsResult?.data ?? []) as Array<{
    job_id: string;
    persona_label: string | null;
    generated_at: string | null;
  }>) {
    if (!insightByJobId.has(row.job_id)) {
      insightByJobId.set(row.job_id, {
        persona_label: row.persona_label,
        generated_at: row.generated_at,
      });
    }
  }

  const personaHistory: AuthStats["personaHistory"] = [];
  for (const job of recentDoneJobs) {
    const insight = insightByJobId.get(job.id);
    if (!insight) continue;
    personaHistory.push({
      label: insight.persona_label,
      generatedAt: insight.generated_at,
    });
    if (personaHistory.length >= 5) break;
  }

  const repoNameResult = latestJob?.repo_id
    ? await supabase
        .from("repos")
        .select("full_name")
        .eq("id", latestJob.repo_id)
        .maybeSingle()
    : null;

  const repoName = (repoNameResult?.data ?? null) as unknown as RepoNameRow | null;

  const latestInsightRepoNameResult = latestInsight?.analysis_jobs?.repo_id
    ? await supabase
        .from("repos")
        .select("full_name")
        .eq("id", latestInsight.analysis_jobs.repo_id)
        .maybeSingle()
    : null;

  const latestInsightRepoName = (latestInsightRepoNameResult?.data ??
    null) as unknown as RepoNameRow | null;

  const debugParam = resolvedSearchParams.debug;
  const debugEnabled =
    debugParam === "1" || (Array.isArray(debugParam) && debugParam.includes("1"));

  const stats: AuthStats = {
    connectedRepos: connectedReposResult.count ?? 0,
    completedJobs: completedJobsResult.count ?? 0,
    queuedJobs: queuedJobsResult.count ?? 0,
    analyzedRepos: userProfileData?.total_repos ?? analyzedRepos,
    analyzedCommits: userProfileData?.total_commits ?? analyzedCommits,
    personaHistory,
    latestJob: latestJob
      ? {
          status: latestJob.status,
          repoName: repoName?.full_name ?? null,
          updatedAt:
            latestJob.completed_at ??
            latestJob.started_at ??
            latestJob.created_at ??
            null,
        }
      : undefined,
    latestPersona: latestInsight
      ? {
          label: latestInsight.persona_label,
          confidence: latestInsight.persona_confidence,
          repoName: latestInsightRepoName?.full_name ?? null,
          generatedAt: latestInsight.generated_at,
        }
      : undefined,
    userProfile: userProfileData
      ? {
          personaName: userProfileData.persona_name,
          personaTagline: userProfileData.persona_tagline,
          personaConfidence: userProfileData.persona_confidence,
          totalRepos: userProfileData.total_repos,
          totalCommits: userProfileData.total_commits,
          axes: userProfileData.axes_json ?? {},
          repoPersonas: userProfileData.repo_personas_json ?? [],
          updatedAt: userProfileData.updated_at ?? null,
        }
      : undefined,
  };

  const isAxisValue = (v: unknown): v is { score: number; level: string; why: string[] } => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    if (typeof r.score !== "number") return false;
    if (typeof r.level !== "string") return false;
    if (!Array.isArray(r.why)) return false;
    return r.why.every((id) => typeof id === "string");
  };

  const isVibeAxes = (v: unknown): v is VibeAxes => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    return (
      isAxisValue(r.automation_heaviness) &&
      isAxisValue(r.guardrail_strength) &&
      isAxisValue(r.iteration_loop_intensity) &&
      isAxisValue(r.planning_signal) &&
      isAxisValue(r.surface_area_per_change) &&
      isAxisValue(r.shipping_rhythm)
    );
  };

  const computedPersonaFromProfileAxes =
    userProfileData && isVibeAxes(userProfileData.axes_json)
      ? (() => {
          const totalCommits = userProfileData.total_commits ?? 0;
          const totalRepos = userProfileData.total_repos ?? 0;
          const repoFactor = Math.min(1, totalRepos / 5);
          const commitFactor = Math.min(1, totalCommits / 500);
          const dataQualityScore = Math.round(100 * (0.4 * repoFactor + 0.6 * commitFactor));
          return detectVibePersona(userProfileData.axes_json, {
            commitCount: totalCommits,
            prCount: 0,
            dataQualityScore,
          });
        })()
      : null;

  const debugInfo = debugEnabled
    ? {
        userId: user.id,
        email: user.email ?? null,
        profileIsStale,
        completedJobsCount,
        connectedReposCount: connectedReposResult.count ?? 0,
        connectedRepoIdsCount: connectedRepoIds.size,
        analyzedReposFallback: analyzedRepos,
        analyzedCommitsFallback: analyzedCommits,
        latestCompletedAt,
        profileBefore: maybeProfileData
          ? {
              totalRepos: maybeProfileData.total_repos,
              totalCommits: maybeProfileData.total_commits,
              personaName: maybeProfileData.persona_name,
              personaConfidence: maybeProfileData.persona_confidence,
              updatedAt: maybeProfileData.updated_at,
              jobIdsCount: profileJobIds?.length ?? null,
            }
          : null,
        profileAfter: userProfileData
          ? {
              totalRepos: userProfileData.total_repos,
              totalCommits: userProfileData.total_commits,
              personaName: userProfileData.persona_name,
              personaConfidence: userProfileData.persona_confidence,
              updatedAt: userProfileData.updated_at,
            }
          : null,
        statsRendered: {
          primaryVibe: stats.userProfile?.personaName ?? stats.latestPersona?.label ?? null,
          profileRepos: stats.userProfile?.totalRepos ?? null,
          profileCommits: stats.userProfile?.totalCommits ?? null,
          completedJobs: stats.completedJobs,
          queuedJobs: stats.queuedJobs,
        },
        computedPersonaFromProfileAxes,
        completedJobsRowsSample: completedJobsRows.slice(0, 12),
      }
    : null;

  return <AuthenticatedDashboard stats={stats} debugInfo={debugInfo} />;
}

function MarketingLanding() {
  const personaCards = [
    {
      title: "Spec-Driven Architect",
      description:
        "Plans thoroughly before touching code; constraints show up early and often.",
    },
    {
      title: "Test-First Validator",
      description:
        "Leans on tests as a contract; prefers safety nets before big changes.",
    },
    {
      title: "Vibe Prototyper",
      description:
        "Moves fast by experimenting; iterates in bursts and learns by doing.",
    },
    {
      title: "Agent Orchestrator",
      description:
        "Coordinates tools and assistants; breaks work into structured moves.",
    },
  ];

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-6xl">
        <header className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
              For vibe coders
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              <span className={wrappedTheme.gradientText}>Find your Vibed coding profile</span>{" "}
              and the personality behind your workflow
            </h1>
            <p className="max-w-2xl text-base text-zinc-700 sm:text-lg">
              Vibed is a playful experiment by vibe coders who want to understand themselves
              better. We surface signals from your commit history to shine a light on how you build
              with AI. What feels like you, what feels new, and how your workflow is evolving.
            </p>
            <p className="max-w-2xl text-sm text-zinc-600">
              The term “vibe coding” can be polarizing, but it captures the cultural moment around
              AI-shaped development. We personally prefer “AI Assisted Engineering” because it’s
              more explicit about the role of AI. This is a playful side project, so we keep it
              light and approachable for non-technical folks.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className={wrappedTheme.primaryButton}
            >
              Generate mine
            </Link>
          </div>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className={`${wrappedTheme.card} p-8`}>
            <h2 className="text-2xl font-semibold text-zinc-950">
              What you get
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-zinc-800">
              {heroFeatures.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className={`mt-1 shrink-0 ${wrappedTheme.dot}`} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-zinc-700">
              Personas are an interpretation layer based on observable commit signals. They can
              shift as your repos and your AI habits evolve.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-zinc-950 px-6 py-2 text-sm font-semibold text-white transition hover:bg-black"
              >
                Start with GitHub
              </Link>
              <Link
                href="/security"
                className={wrappedTheme.secondaryButton}
              >
                Read security notes
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-gradient-to-br from-fuchsia-200/70 via-indigo-200/60 to-cyan-200/70 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.06)]">
            <h2 className="text-2xl font-semibold text-zinc-950">How it works</h2>
            <div className="mt-6 grid gap-4">
              {timeline.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-black/5 bg-white/70 p-5 backdrop-blur"
                >
                  <p className="text-sm font-semibold text-zinc-950">{step.title}</p>
                  <p className="mt-1 text-sm text-zinc-700">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={`mt-6 ${wrappedTheme.card} p-8`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-950">Persona previews</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-800">
                You may see one of these (or another persona). These are lenses on your
                vibe-coding style. Observations, not labels.
              </p>
            </div>
            <Link
              href="/login"
              className="text-sm font-semibold text-zinc-950 transition hover:text-zinc-700"
            >
              Generate mine →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {personaCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600" />
                <p className="mt-4 text-sm font-semibold text-zinc-950">{card.title}</p>
                <p className="mt-2 text-sm text-zinc-800">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-black/5 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-zinc-700">Vibed Coding</p>
          <p className="font-mono text-xs text-zinc-400">v0.1.0</p>
        </footer>
      </div>
    </div>
  );
}

function AuthenticatedDashboard({
  stats,
  debugInfo,
}: {
  stats: AuthStats;
  debugInfo: Record<string, unknown> | null;
}) {
  const isAxisValue = (v: unknown): v is { score: number; level: string; why: string[] } => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    if (typeof r.score !== "number") return false;
    if (typeof r.level !== "string") return false;
    if (!Array.isArray(r.why)) return false;
    return r.why.every((id) => typeof id === "string");
  };

  const isVibeAxes = (v: unknown): v is VibeAxes => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    return (
      isAxisValue(r.automation_heaviness) &&
      isAxisValue(r.guardrail_strength) &&
      isAxisValue(r.iteration_loop_intensity) &&
      isAxisValue(r.planning_signal) &&
      isAxisValue(r.surface_area_per_change) &&
      isAxisValue(r.shipping_rhythm)
    );
  };

  function clarityScore(): number {
    if (stats.completedJobs === 0) return 0;
    if (stats.connectedRepos <= 1) return 35;
    if (stats.connectedRepos === 2) return 55;
    if (stats.connectedRepos === 3) return 70;
    if (stats.connectedRepos <= 5) return 85;
    return 95;
  }

  const clarity = clarityScore();

  const personaExplanation = (() => {
    const profile = stats.userProfile;
    if (!profile) return null;
    if (!isVibeAxes(profile.axes)) return null;

    const repoFactor = Math.min(1, profile.totalRepos / 5);
    const commitFactor = Math.min(1, profile.totalCommits / 500);
    const dataQualityScore = Math.round(100 * (0.4 * repoFactor + 0.6 * commitFactor));

    return detectVibePersona(profile.axes, {
      commitCount: profile.totalCommits,
      prCount: 0,
      dataQualityScore,
    });
  })();


  const recentLabels = stats.personaHistory
    .map((entry) => entry.label)
    .filter((label): label is string => Boolean(label));

  let shiftCount = 0;
  for (let i = 1; i < recentLabels.length; i += 1) {
    if (recentLabels[i] !== recentLabels[i - 1]) shiftCount += 1;
  }

  const personaCounts = new Map<string, number>();
  for (const label of recentLabels) {
    personaCounts.set(label, (personaCounts.get(label) ?? 0) + 1);
  }
  const dominantPersona =
    [...personaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const shiftValue =
    recentLabels.length < 2
      ? "New"
      : shiftCount === 0
        ? "Steady"
        : `${shiftCount}`;

  const shiftHelper =
    recentLabels.length < 2
      ? "Run a few vibe checks to see movement."
      : `Across your last ${recentLabels.length} reads.`;

  const axisMeta = {
    automation_heaviness: {
      name: "Automation",
      description: "How much AI-generated code you accept",
    },
    guardrail_strength: {
      name: "Guardrails",
      description: "Testing, linting, and safety measures",
    },
    iteration_loop_intensity: {
      name: "Iteration",
      description: "Rapid cycles of prompting and fixing",
    },
    planning_signal: {
      name: "Planning",
      description: "Thoughtful setup before execution",
    },
    surface_area_per_change: {
      name: "Surface Area",
      description: "Size and scope of each change",
    },
    shipping_rhythm: {
      name: "Rhythm",
      description: "How frequently you ship changes",
    },
  } as const;

  const axisKeys = Object.keys(axisMeta) as Array<keyof typeof axisMeta>;

  const cards = [
    {
      label: "Reads captured",
      value: stats.completedJobs,
      helper: "Every run adds a chapter.",
    },
    {
      label: "Vibe shifts",
      value: shiftValue,
      helper: shiftHelper,
    },
    {
      label: "Most frequent vibe",
      value: dominantPersona ?? "Still forming",
      helper:
        recentLabels.length === 0
          ? "Complete a vibe check to see your read."
          : `Based on your last ${recentLabels.length} reads.`,
    },
  ];

  function generateCrossRepoInsight(): string {
    if (!stats.userProfile) return "Add more repos to unlock cross-repo insights.";
    const repos = stats.userProfile.repoPersonas ?? [];
    if (repos.length === 0) {
      return "Add more repos to unlock cross-repo insights.";
    }

    if (repos.length === 1) {
      return `Based on ${repos[0].repoName}, you show strong ${stats.userProfile.personaName.toLowerCase()} tendencies. Add more repos to see how your style varies across projects.`;
    }

    const personaCounts = repos.reduce(
      (acc, repo) => {
        acc[repo.personaName] = (acc[repo.personaName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const uniquePersonas = Object.keys(personaCounts);

    if (uniquePersonas.length === 1) {
      return `Across ${repos.length} repos, you consistently show ${stats.userProfile.personaName.toLowerCase()} patterns. Your style is remarkably consistent.`;
    }

    const dominant = repos[0];
    const secondary = repos.find((r) => r.personaName !== dominant.personaName);

    if (secondary) {
      return `On ${dominant.repoName} you lean ${dominant.personaName.toLowerCase()}, while on ${secondary.repoName} you show more ${secondary.personaName.toLowerCase()} tendencies. Your aggregated profile balances these styles.`;
    }

    return `Your ${stats.userProfile.personaName.toLowerCase()} profile emerges from ${repos.length} repos and ${stats.userProfile.totalCommits.toLocaleString()} commits.`;
  }

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-4xl">
        {/* Unified Profile Card */}
        <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-[0_30px_120px_rgba(2,6,23,0.08)]">
          {/* Section 1: Identity */}
          <div className="relative bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/5 to-cyan-500/10 p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.08),transparent_50%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
                  Your Vibed Profile
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.completedJobs > 0 ? (
                    <>
                      <Link
                        href="/repos"
                        className="rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-white"
                      >
                        Add repo
                      </Link>
                      <Link
                        href="/analysis"
                        className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                      >
                        View vibed repos
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/repos"
                      className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                    >
                      Pick a repo
                    </Link>
                  )}
                </div>
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
                {stats.userProfile?.personaName ?? stats.latestPersona?.label ?? "Still forming"}
              </h1>
              {stats.userProfile?.personaTagline ? (
                <p className="mt-3 text-lg text-zinc-700">
                  “{stats.userProfile.personaTagline}”
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
                {stats.userProfile ? (
                  <>
                    <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-zinc-800 shadow-sm">
                      {stats.userProfile.personaConfidence} confidence
                    </span>
                    <span>{stats.userProfile.totalRepos} repos</span>
                    <span>·</span>
                    <span>{stats.userProfile.totalCommits.toLocaleString()} commits</span>
                    <span>·</span>
                    <span>{clarity}% clarity</span>
                  </>
                ) : stats.analyzedRepos > 0 ? (
                  <>
                    <span>{stats.analyzedRepos} repos</span>
                    <span>·</span>
                    <span>{stats.analyzedCommits.toLocaleString()} commits</span>
                    <span>·</span>
                    <span>Profile forming</span>
                  </>
                ) : stats.latestPersona ? (
                  <>
                    <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-zinc-800 shadow-sm">
                      {stats.latestPersona.confidence}
                    </span>
                    {stats.latestPersona.repoName ? (
                      <span>Based on {stats.latestPersona.repoName}</span>
                    ) : null}
                  </>
                ) : (
                  <span>Run a vibe check to get your first read</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Insight (the juicy synthesis) */}
          {stats.userProfile ? (
            <div className="border-t border-black/5 bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-8 py-6 sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                Insight
              </p>
              <p className="mt-2 text-base font-medium leading-relaxed text-white sm:text-lg">
                {generateCrossRepoInsight()}
              </p>
            </div>
          ) : null}

          {/* Section 3: Your Axes (the 6 signals) */}
          {stats.userProfile ? (
            <div className="border-t border-black/5 p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
                Your Axes
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                The 6 signals that define your vibe coding style
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {axisKeys.map((key) => {
                  const axis = stats.userProfile?.axes[key];
                  const meta = axisMeta[key];
                  const score = axis?.score ?? 50;

                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{meta.name}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">{meta.description}</p>
                        </div>
                        <span className="text-xl font-bold text-zinc-900">{score}</span>
                      </div>
                      <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-200">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Section 4: Evolution (shifts, trends) */}
          <div className="border-t border-black/5 p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
              Evolution
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              How your vibe has developed over time
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-zinc-900">{stats.completedJobs}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Vibed repos
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-zinc-900">{shiftValue}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Vibe shifts
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4 text-center">
                <p className="text-3xl font-bold text-zinc-900">
                  {dominantPersona ? dominantPersona.split(" ")[0] : "—"}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Dominant vibe
                </p>
              </div>
            </div>

            {recentLabels.length >= 2 ? (
              <p className="mt-4 text-xs text-zinc-500">
                {shiftHelper}
              </p>
            ) : null}
          </div>

          {/* Section 5: Your Repos (breakdown) */}
          {stats.userProfile && stats.userProfile.repoPersonas.length > 0 ? (
            <div className="border-t border-black/5 p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
                Repo Breakdown
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Each repo contributes to your profile, weighted by commits
              </p>

              <div className="mt-6 space-y-3">
                {stats.userProfile.repoPersonas.map((repo, i) => {
                  const percentage = Math.round(
                    (repo.commitCount / (stats.userProfile?.totalCommits ?? 1)) * 100
                  );
                  return (
                    <div
                      key={`${repo.repoName}-${i}`}
                      className="flex items-center gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {repo.repoName}
                          </p>
                          <span className="ml-2 text-xs text-zinc-500">{percentage}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-fuchsia-400 via-indigo-400 to-cyan-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {repo.personaName} · {repo.commitCount.toLocaleString()} commits
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Section 6: How we got this (collapsible details) */}
          {personaExplanation && stats.userProfile ? (
            <div className="border-t border-black/5 p-8 sm:p-10">
              <details>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500 hover:text-zinc-700">
                  How we got this
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Matched signals
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {personaExplanation.matched_rules.length > 0 ? (
                        personaExplanation.matched_rules.map((rule) => (
                          <span
                            key={rule}
                            className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                          >
                            {formatMatchedRule(rule)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-600">
                          Selected by nearest-fit across all signals
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {Object.entries(AXIS_LEGEND).map(([k, v]) => (
                      <span key={k}>
                        {k} = {v}
                      </span>
                    ))}
                  </div>

                  {personaExplanation.caveats.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                        Caveats
                      </p>
                      <ul className="mt-2 space-y-1">
                        {personaExplanation.caveats.map((caveat) => (
                          <li key={caveat} className="text-sm text-zinc-600">
                            • {caveat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <Link
                    href="/methodology"
                    className="inline-block text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
                  >
                    View full methodology
                  </Link>
                </div>
              </details>
            </div>
          ) : null}

          {/* Actions footer */}
          <div className="border-t border-black/5 bg-zinc-50/50 px-8 py-6 sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-zinc-600">
                {stats.userProfile?.updatedAt ? (
                  <>Last updated {new Date(stats.userProfile.updatedAt).toLocaleDateString()}</>
                ) : stats.queuedJobs > 0 ? (
                  <>Processing {stats.queuedJobs} repo{stats.queuedJobs > 1 ? "s" : ""}...</>
                ) : (
                  <>Add repos to build your profile</>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {stats.completedJobs === 0 ? (
                  <>
                    <Link href="/repos" className={wrappedTheme.primaryButton}>
                      Pick a repo
                    </Link>
                    <Link href="/security" className={wrappedTheme.secondaryButton}>
                      What we store
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/repos" className={wrappedTheme.secondaryButton}>
                      Add repo
                    </Link>
                    <Link href="/analysis" className={wrappedTheme.primaryButton}>
                      View vibed repos
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Debug info (outside main card) */}
        {debugInfo ? (
          <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6">
            <details>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
                Debug
              </summary>
              <pre className="mt-4 overflow-x-auto whitespace-pre rounded-xl bg-zinc-950 p-4 text-xs text-zinc-50">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  );
}
