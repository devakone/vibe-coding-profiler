import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@vibed/db";
import { wrappedTheme } from "@/lib/theme";
import { ProfileShareSection } from "@/components/share";
import { ProfileVersionSelector } from "@/components/ProfileVersionSelector";
import { createClient } from "@supabase/supabase-js";
import {
  aggregateUserProfile,
  computeVibeFromCommits,
  detectVibePersona,
  type AIToolMetrics,
  type RepoInsightSummary,
  type VibeAxes,
  type VibeCommitEvent,
} from "@vibed/core";
import {
  UnifiedIdentitySection,
  UnifiedInsightSection,
  UnifiedAxesSection,
  EvolutionSection,
  RepoBreakdownSection,
  UnifiedMethodologySection,
} from "@/components/vcp/unified";
import { VCPAIToolsSection } from "@/components/vcp/blocks";

const heroFeatures = [
  "A Vibe Coding Profile (VCP) built from AI-assisted engineering signals in your commit history",
  "Persona snapshots that evolve as you add more repos",
  "Share-ready cards that highlight your vibe coding patterns",
  "Deep dive metrics and evidence when you want receipts",
];

const timeline = [
  {
    title: "Fetch commit metadata",
    description:
      "We sample up to 300 commits across your repo's lifetime (timestamps, sizes, file paths). No code content.",
  },
  {
    title: "Filter automation noise",
    description:
      "Bots like Dependabot or release workflows are filtered out so the signal reflects your work.",
  },
  {
    title: "Compute metrics + axes",
    description:
      "25+ metrics roll up into six Vibe Axes (planning, guardrails, rhythm, surface area, and more).",
  },
  {
    title: "Detect persona + insights",
    description:
      "We map your axes to a persona and generate streaks, timing, and workflow highlights.",
  },
  {
    title: "Optional LLM narrative",
    description:
      "If you opt in, we summarize patterns using metadata only—never code or message content.",
  },
  {
    title: "Create Repo VCP",
    description:
      "Each repo gets its own Repo VCP—a snapshot of your vibe coding style for that project.",
  },
  {
    title: "Aggregate into Unified VCP",
    description:
      "Multiple Repo VCPs roll into your Unified VCP, weighted by commit volume across all repos.",
  },
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
    personaId: string;
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
    narrative?: {
      headline?: string;
      paragraphs?: string[];
      highlights?: Array<{ label: string; value: string; interpretation?: string }>;
    } | null;
    llmModel?: string | null;
    llmKeySource?: string | null;
    aiTools?: AIToolMetrics | null;
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
          "persona_id, persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, repo_personas_json, updated_at, job_ids, narrative_json, llm_model, llm_key_source"
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
    persona_id: string;
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
    narrative_json: {
      headline?: string;
      paragraphs?: string[];
      highlights?: Array<{ label: string; value: string; interpretation?: string }>;
    } | null;
    llm_model: string | null;
    llm_key_source: string | null;
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
          "persona_id, persona_name, persona_tagline, persona_confidence, total_repos, total_commits, axes_json, repo_personas_json, updated_at, narrative_json, llm_model, llm_key_source"
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : null;

  const userProfileData = (profileIsStale ? refreshedProfileResult?.data ?? null : maybeProfileData) as {
    persona_id: string;
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
    narrative_json: {
      headline?: string;
      paragraphs?: string[];
      highlights?: Array<{ label: string; value: string; interpretation?: string }>;
    } | null;
    llm_model: string | null;
    llm_key_source: string | null;
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

  // Fetch aggregated AI tool metrics from vibe_insights
  let profileAiTools: AIToolMetrics | null = null;
  if (userProfileData) {
    const effectiveJobIds = profileJobIds ?? [];
    if (effectiveJobIds.length > 0) {
      const { data: vibeRows } = await supabase
        .from("vibe_insights")
        .select("ai_tools_json")
        .in("job_id", effectiveJobIds);

      const vibeToolRows = (vibeRows ?? []) as Array<{ ai_tools_json: unknown }>;
      if (vibeToolRows.length > 0) {
        const toolCounts = new Map<string, { name: string; count: number }>();
        let totalAiCommits = 0;
        for (const row of vibeToolRows) {
          const tools = row.ai_tools_json as AIToolMetrics | null;
          if (!tools || !tools.detected) continue;
          totalAiCommits += tools.ai_assisted_commits;
          for (const tool of tools.tools) {
            const existing = toolCounts.get(tool.tool_id);
            if (existing) existing.count += tool.commit_count;
            else toolCounts.set(tool.tool_id, { name: tool.tool_name, count: tool.commit_count });
          }
        }
        if (toolCounts.size > 0) {
          const total = userProfileData.total_commits ?? 0;
          const tools = Array.from(toolCounts.entries())
            .map(([id, d]) => ({
              tool_id: id, tool_name: d.name, commit_count: d.count,
              percentage: totalAiCommits > 0 ? Math.round((d.count / totalAiCommits) * 100) : 0,
            }))
            .sort((a, b) => b.commit_count - a.commit_count);
          profileAiTools = {
            detected: true, ai_assisted_commits: totalAiCommits,
            ai_collaboration_rate: total > 0 ? totalAiCommits / total : 0,
            primary_tool: { id: tools[0].tool_id, name: tools[0].tool_name },
            tool_diversity: tools.length, tools,
            confidence: totalAiCommits >= 10 ? "high" : totalAiCommits >= 3 ? "medium" : "low",
          };
        }
      }
    }
  }

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
          personaId: userProfileData.persona_id,
          personaName: userProfileData.persona_name,
          personaTagline: userProfileData.persona_tagline,
          personaConfidence: userProfileData.persona_confidence,
          totalRepos: userProfileData.total_repos,
          totalCommits: userProfileData.total_commits,
          axes: userProfileData.axes_json ?? {},
          repoPersonas: userProfileData.repo_personas_json ?? [],
          updatedAt: userProfileData.updated_at ?? null,
          narrative: userProfileData.narrative_json ?? null,
          llmModel: userProfileData.llm_model ?? null,
          llmKeySource: userProfileData.llm_key_source ?? null,
          aiTools: profileAiTools,
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

  // Fetch username and public profile settings for share URL
  const { data: userRow } = await supabase
    .from("users")
    .select()
    .eq("id", user.id)
    .maybeSingle();

  const userRowTyped = userRow as { username?: string | null; public_profile_settings?: Record<string, unknown> | null } | null;
  const publicUsername = userRowTyped?.username ?? null;
  const publicProfileEnabled =
    publicUsername != null &&
    userRowTyped?.public_profile_settings?.profile_enabled === true;

  return (
    <AuthenticatedDashboard
      stats={stats}
      debugInfo={debugInfo}
      userId={user.id}
      username={publicUsername}
      profileEnabled={publicProfileEnabled}
    />
  );
}

function MarketingLanding() {
  const personaCards = [
    {
      title: "Spec-Driven Architect",
      description:
        "Plans thoroughly before shipping changes; constraints show up early and often.",
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
              <span className={wrappedTheme.gradientText}>
                Find your Vibe Coding Profile (VCP)
              </span>{" "}
              and the personality behind your workflow
            </h1>
            <p className="max-w-2xl text-base text-zinc-700 sm:text-lg">
              A <strong>Vibe Coding Profile (VCP)</strong> is your AI-assisted engineering persona—revealed through patterns in your commit history. We surface signals from your git history to shine a light on
              how you build with AI, what feels like you, what feels new, and how your workflow is
              evolving.
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

          <section className="rounded-3xl border border-black/5 bg-gradient-to-br from-violet-100/80 via-indigo-100/70 to-violet-50/80 p-8 shadow-[0_25px_80px_rgba(30,27,75,0.06)]">
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
                AI-assisted engineering (vibe-coding) style. Observations, not labels.
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
                <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" />
                <p className="mt-4 text-sm font-semibold text-zinc-950">{card.title}</p>
                <p className="mt-2 text-sm text-zinc-800">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-black/5 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-zinc-700">Vibe Coding Profiler</p>
          <p className="font-mono text-xs text-zinc-400">v0.1.0</p>
        </footer>
      </div>
    </div>
  );
}

function AuthenticatedDashboard({
  stats,
  debugInfo,
  userId,
  username,
  profileEnabled,
}: {
  stats: AuthStats;
  debugInfo: Record<string, unknown> | null;
  userId: string;
  username: string | null;
  profileEnabled: boolean;
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

  // Compute top axes for share card
  const topAxes = stats.userProfile
    ? Object.entries(stats.userProfile.axes)
        .map(([key, val]) => ({
          name: axisMeta[key as keyof typeof axisMeta]?.name ?? key,
          score: val.score,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    : [];

  // Use LLM narrative if available, otherwise fall back to deterministic insight
  const narrativeFromLLM = stats.userProfile?.narrative;
  const crossRepoInsight = narrativeFromLLM?.headline
    ? narrativeFromLLM.headline
    : generateCrossRepoInsight();

  // Full narrative paragraphs (for expanded display)
  const narrativeParagraphs = narrativeFromLLM?.paragraphs ?? [];
  const narrativeHighlights = narrativeFromLLM?.highlights ?? [];
  const hasLLMNarrative = Boolean(narrativeFromLLM?.headline || narrativeParagraphs.length > 0);

  return (
    <div className={`${wrappedTheme.container} ${wrappedTheme.pageY}`}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* HERO: Share Card - The main action for users with a profile */}
        {stats.userProfile ? (
          <ProfileShareSection
            personaName={stats.userProfile.personaName}
            personaId={stats.userProfile.personaId}
            personaTagline={stats.userProfile.personaTagline ?? null}
            personaConfidence={stats.userProfile.personaConfidence}
            totalRepos={stats.userProfile.totalRepos}
            totalCommits={stats.userProfile.totalCommits}
            clarity={clarity}
            topAxes={topAxes}
            insight={crossRepoInsight}
            axes={stats.userProfile.axes as unknown as VibeAxes}
            userId={userId}
            username={username}
            profileEnabled={profileEnabled}
          />
        ) : null}

        {/* Profile History - Version selector */}
        {stats.userProfile ? (
          <ProfileVersionSelector currentUpdatedAt={stats.userProfile.updatedAt} />
        ) : null}

        {/* Unified Profile Card */}
        <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-[0_30px_120px_rgba(2,6,23,0.08)]">
          {/* Section 1: Identity */}
          <UnifiedIdentitySection
            personaName={stats.userProfile?.personaName ?? stats.latestPersona?.label ?? "Still forming"}
            personaTagline={stats.userProfile?.personaTagline}
            confidence={stats.userProfile?.personaConfidence}
            totalRepos={stats.userProfile?.totalRepos}
            totalCommits={stats.userProfile?.totalCommits}
            clarity={clarity}
            completedJobs={stats.completedJobs}
            analyzedRepos={stats.analyzedRepos}
            analyzedCommits={stats.analyzedCommits}
            latestPersona={stats.latestPersona}
          />

          {/* Section 2: Insight */}
          {stats.userProfile ? (
            <UnifiedInsightSection
              headline={crossRepoInsight}
              paragraphs={narrativeParagraphs}
              highlights={narrativeHighlights}
              isLLMGenerated={hasLLMNarrative}
              llmModel={stats.userProfile.llmModel}
            />
          ) : null}

          {/* Section 3: Your Axes */}
          {stats.userProfile && isVibeAxes(stats.userProfile.axes) ? (
            <UnifiedAxesSection axes={stats.userProfile.axes} />
          ) : null}

          {/* Section 3b: AI Coding Tools */}
          {stats.userProfile?.aiTools?.detected ? (
            <div className="border-t border-black/5 px-8 py-6 sm:px-10">
              <VCPAIToolsSection aiTools={stats.userProfile.aiTools} />
            </div>
          ) : null}

          {/* Section 4: Evolution */}
          <EvolutionSection
            repoVcpCount={stats.completedJobs}
            vibeShifts={shiftValue}
            dominantVibe={dominantPersona ? dominantPersona.split(" ")[0] : null}
            shiftHelper={recentLabels.length >= 2 ? shiftHelper : undefined}
          />

          {/* Section 5: Repo Breakdown */}
          {stats.userProfile ? (
            <RepoBreakdownSection
              repoPersonas={stats.userProfile.repoPersonas}
              totalCommits={stats.userProfile.totalCommits}
            />
          ) : null}

          {/* Section 6: Methodology */}
          {personaExplanation && stats.userProfile && isVibeAxes(stats.userProfile.axes) ? (
            <UnifiedMethodologySection
              matchedRules={personaExplanation.matched_rules}
              caveats={personaExplanation.caveats}
            />
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
                    <Link href="/settings/repos" className={wrappedTheme.primaryButton}>
                      Pick a repo
                    </Link>
                    <Link href="/security" className={wrappedTheme.secondaryButton}>
                      What we store
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/settings/repos" className={wrappedTheme.secondaryButton}>
                      Add repo
                    </Link>
                    <Link href="/vibes" className={wrappedTheme.primaryButton}>
                      View Repo VCPs
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
