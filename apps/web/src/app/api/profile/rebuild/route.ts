import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  aggregateUserProfile,
  computeVibeFromCommits,
  detectVibePersona,
  getModelCandidates,
  type LLMKeySource,
  type RepoInsightSummary,
  type VibeAxes,
  type VibeCommitEvent,
  type VibePersona,
} from "@vibe-coding-profiler/core";
import type { Insertable, Json } from "@vibe-coding-profiler/db";
import { resolveProfileLLMConfig, recordLLMUsage } from "@/lib/llm-config";
import {
  generateProfileNarrativeWithLLM,
  toProfileNarrativeFallback,
  type ProfileNarrative,
} from "@/lib/profile-narrative";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type AnalysisJobRow = {
  id: string;
  repo_id: string | null;
  commit_count: number | null;
  completed_at: string | null;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const requestOrigin = requestUrl.origin;
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  if (originHeader && originHeader !== requestOrigin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!originHeader && refererHeader) {
    const refererOrigin = new URL(refererHeader).origin;
    if (refererOrigin !== requestOrigin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const redirectUrl = new URL("/profile", requestUrl);

  // Rate limiting (bypassed for localhost and admins)
  const rateLimit = await checkRateLimit({
    userId: user.id,
    action: "profile_rebuild",
    windowSeconds: 300,
    maxCount: 2,
  });

  if (!rateLimit.allowed) {
    if (rateLimit.reason === "rate_limited") {
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.json({ error: "rate_limit_failed" }, { status: 500 });
  }

  const service = createSupabaseServiceClient();
  const { data: connectedUserRepos, error: connectedReposError } = await service
    .from("user_repos")
    .select("repo_id")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  if (connectedReposError) {
    return NextResponse.json({ error: "failed_to_load_repos" }, { status: 500 });
  }

  const connectedRepoIds = (connectedUserRepos ?? [])
    .map((r) => r.repo_id)
    .filter((id): id is string => Boolean(id));

  if (connectedRepoIds.length === 0) {
    return NextResponse.redirect(redirectUrl);
  }

  const { data: completedJobsData, error: jobsError } = await service
    .from("analysis_jobs")
    .select("id, repo_id, commit_count, completed_at")
    .eq("user_id", user.id)
    .eq("status", "done")
    .in("repo_id", connectedRepoIds);

  if (jobsError) {
    return NextResponse.json({ error: "failed_to_load_jobs" }, { status: 500 });
  }

  const completedJobs = (completedJobsData ?? []) as AnalysisJobRow[];
  if (completedJobs.length === 0) {
    return NextResponse.redirect(redirectUrl);
  }

  const jobsMissingCommitCount = completedJobs
    .filter((j) => j.commit_count == null)
    .map((j) => j.id);

  const { data: metricsData, error: metricsError } =
    jobsMissingCommitCount.length > 0
      ? await service
          .from("analysis_metrics")
          .select("job_id, metrics_json")
          .in("job_id", jobsMissingCommitCount)
      : { data: [] as Array<{ job_id: string; metrics_json: unknown }>, error: null };

  if (metricsError) {
    return NextResponse.json({ error: "failed_to_load_metrics" }, { status: 500 });
  }

  const commitCountByJobId = new Map<string, number>();
  for (const row of metricsData ?? []) {
    const metricsJson = (row as { metrics_json: unknown }).metrics_json;
    if (typeof metricsJson !== "object" || metricsJson === null) continue;

    const totalCommits = (metricsJson as { total_commits?: unknown }).total_commits;
    if (typeof totalCommits === "number") {
      commitCountByJobId.set(row.job_id, totalCommits);
    }
  }

  const repoIds = completedJobs
    .map((j) => j.repo_id)
    .filter((id): id is string => Boolean(id));
  const { data: reposData, error: reposError } = await service
    .from("repos")
    .select("id, full_name")
    .in("id", repoIds);

  if (reposError) {
    return NextResponse.json({ error: "failed_to_load_repo_names" }, { status: 500 });
  }

  const repoNameById = new Map<string, string>();
  for (const r of reposData ?? []) {
    repoNameById.set(r.id, r.full_name);
  }

  const jobIds = completedJobs.map((j) => j.id);

  const { data: vibeInsightsData, error: vibeInsightsError } = await service
    .from("vibe_insights")
    .select(
      "job_id, axes_json, persona_id, persona_name, persona_tagline, persona_confidence, persona_score"
    )
    .in("job_id", jobIds);

  if (vibeInsightsError) {
    return NextResponse.json({ error: "failed_to_load_vibe_insights" }, { status: 500 });
  }

  type VibeInsightsRow = {
    job_id: string;
    axes_json: unknown;
    persona_id: string;
    persona_name: string;
    persona_tagline: string | null;
    persona_confidence: string;
    persona_score: number | null;
  };

  const vibeInsights = (vibeInsightsData ?? []) as unknown as VibeInsightsRow[];

  const vibeInsightByJobId = new Map<string, VibeInsightsRow>();
  for (const insight of vibeInsights) {
    vibeInsightByJobId.set(insight.job_id, insight);
  }

  const missingJobIds = jobIds.filter((id) => !vibeInsightByJobId.has(id));

  const { data: legacyInsightsData, error: legacyInsightsError } =
    missingJobIds.length > 0
      ? await service
          .from("analysis_insights")
          .select("job_id, persona_id, persona_label, persona_confidence")
          .in("job_id", missingJobIds)
      : { data: [] as Array<unknown>, error: null };

  if (legacyInsightsError) {
    return NextResponse.json({ error: "failed_to_load_legacy_insights" }, { status: 500 });
  }

  type LegacyInsightsRow = {
    job_id: string;
    persona_id: string | null;
    persona_label: string | null;
    persona_confidence: string | null;
  };

  const legacyInsights = (legacyInsightsData ?? []) as LegacyInsightsRow[];
  const legacyInsightByJobId = new Map<string, LegacyInsightsRow>();
  for (const insight of legacyInsights) {
    legacyInsightByJobId.set(insight.job_id, insight);
  }

  const { data: missingMetricsData, error: missingMetricsError } =
    missingJobIds.length > 0
      ? await service
          .from("analysis_metrics")
          .select("job_id, events_json")
          .in("job_id", missingJobIds)
      : { data: [] as Array<{ job_id: string; events_json: unknown }>, error: null };

  if (missingMetricsError) {
    return NextResponse.json({ error: "failed_to_load_metrics" }, { status: 500 });
  }

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

      const parsedFilesChanged =
        typeof files_changed === "number"
          ? files_changed
          : typeof files_changed === "string"
            ? Number(files_changed)
            : NaN;

      const parsedAdditions =
        typeof additions === "number" ? additions : typeof additions === "string" ? Number(additions) : NaN;

      const parsedDeletions =
        typeof deletions === "number" ? deletions : typeof deletions === "string" ? Number(deletions) : NaN;

      if (
        typeof sha !== "string" ||
        typeof message !== "string" ||
        typeof author_date !== "string" ||
        typeof committer_date !== "string" ||
        !(author_email == null || typeof author_email === "string") ||
        !Number.isFinite(parsedFilesChanged) ||
        !Number.isFinite(parsedAdditions) ||
        !Number.isFinite(parsedDeletions)
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
        author_email: author_email ?? "",
        files_changed: parsedFilesChanged,
        additions: parsedAdditions,
        deletions: parsedDeletions,
        parents,
        ...(file_paths ? { file_paths } : {}),
      });
    }

    return commits;
  }

  const eventsByJobId = new Map<string, VibeCommitEvent[]>();
  for (const row of missingMetricsData ?? []) {
    const commits = toCommitEvents((row as { events_json: unknown }).events_json);
    if (!commits) continue;
    eventsByJobId.set(row.job_id, commits);
  }

  const computedByJobId = new Map<
    string,
    { axes: VibeAxes; persona: VibePersona; cards: unknown; evidence: unknown; generatedAt: string; version: string }
  >();

  for (const jobId of missingJobIds) {
    const commits = eventsByJobId.get(jobId);
    if (!commits) continue;
    const vibe = computeVibeFromCommits({ commits, episodeGapHours: 4 });
    computedByJobId.set(jobId, {
      axes: vibe.axes,
      persona: vibe.persona,
      cards: vibe.cards,
      evidence: vibe.evidence_index,
      generatedAt: vibe.generated_at,
      version: vibe.version,
    });
  }

  const backfillRows = Array.from(computedByJobId.entries()).map(([jobId, v]) => ({
    job_id: jobId,
    version: v.version,
    axes_json: v.axes as unknown as Json,
    persona_id: v.persona.id,
    persona_name: v.persona.name,
    persona_tagline: v.persona.tagline,
    persona_confidence: v.persona.confidence,
    persona_score: v.persona.score,
    cards_json: v.cards as unknown as Json,
    evidence_json: v.evidence as unknown as Json,
    generated_at: v.generatedAt,
    updated_at: new Date().toISOString(),
  }));

  if (backfillRows.length > 0) {
    const { error: backfillError } = await service
      .from("vibe_insights")
      .upsert(backfillRows, { onConflict: "job_id" });

    if (backfillError) {
      return NextResponse.json({ error: "failed_to_backfill_vibe_insights" }, { status: 500 });
    }
  }

  const repoInsights: RepoInsightSummary[] = [];
  const legacyRepoInsights: RepoInsightSummary[] = [];

  for (const job of completedJobs) {
    if (!job.repo_id) continue;

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
      continue;
    }

    const legacyInsight = legacyInsightByJobId.get(job.id);
    if (legacyInsight) {
      const defaultAxis = {
        score: 50,
        level: "medium" as const,
        why: ["Legacy insight - no detailed axis data available"],
      };
      legacyRepoInsights.push({
        jobId: job.id,
        repoName,
        commitCount,
        axes: {
          automation_heaviness: defaultAxis,
          guardrail_strength: defaultAxis,
          iteration_loop_intensity: defaultAxis,
          planning_signal: defaultAxis,
          surface_area_per_change: defaultAxis,
          shipping_rhythm: defaultAxis,
        },
        persona: {
          id: legacyInsight.persona_id ?? "balanced_builder",
          name: legacyInsight.persona_label ?? "Reflective Balancer",
          tagline: "",
          confidence: (legacyInsight.persona_confidence as "high" | "medium" | "low") ?? "low",
          score: 50,
          matched_rules: [],
          why: [],
          caveats: [],
        } as VibePersona,
        analyzedAt: job.completed_at ?? new Date().toISOString(),
      });
    }
  }

  const effectiveRepoInsights = repoInsights.length > 0 ? repoInsights : legacyRepoInsights;

  if (effectiveRepoInsights.length === 0) {
    return NextResponse.redirect(redirectUrl);
  }

  const profile = aggregateUserProfile(effectiveRepoInsights);

  const triggerJobId =
    completedJobs
      .slice()
      .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""))
      .at(-1)?.id ?? null;

  // Resolve LLM config for profile narrative generation
  const llmResolution = await resolveProfileLLMConfig(user.id);
  let llmNarrative: ProfileNarrative | null = null;
  let llmModelUsed: string | null = null;
  const llmKeySource: LLMKeySource = llmResolution.source;

  // Generate LLM narrative if available
  if (llmResolution.config) {
    const llmConfig = llmResolution.config;
    const modelCandidates = getModelCandidates(llmConfig.provider);

    for (const candidate of modelCandidates) {
      try {
        const result = await generateProfileNarrativeWithLLM({
          provider: llmConfig.provider,
          apiKey: llmConfig.apiKey,
          model: candidate,
          profile,
        });

        if (result) {
          llmNarrative = result.narrative;
          llmModelUsed = candidate;

          // Record successful usage
          await recordLLMUsage({
            userId: user.id,
            provider: llmConfig.provider,
            model: candidate,
            keySource: llmKeySource,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            success: true,
          });
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.warn(`Profile LLM model ${candidate} failed:`, errorMessage);

        await recordLLMUsage({
          userId: user.id,
          provider: llmConfig.provider,
          model: candidate,
          keySource: llmKeySource,
          success: false,
          errorMessage,
        });
        continue;
      }
    }
  }

  // Use fallback narrative if LLM didn't generate one
  const finalNarrative = llmNarrative ?? toProfileNarrativeFallback({
    persona: profile.persona,
    axes: profile.axes,
    totalCommits: profile.totalCommits,
    totalRepos: profile.totalRepos,
    repoBreakdown: profile.repoBreakdown,
  });

  // Note: narrative_json, llm_model, llm_key_source columns added in migration 0017
  // Type cast needed until DB types are regenerated
  const profileRow = {
    user_id: user.id,
    total_commits: profile.totalCommits,
    total_repos: profile.totalRepos,
    job_ids: profile.jobIds,
    axes_json: profile.axes as unknown as Json,
    persona_id: profile.persona.id,
    persona_name: profile.persona.name,
    persona_tagline: profile.persona.tagline,
    persona_confidence: profile.persona.confidence,
    persona_score: profile.persona.score,
    repo_personas_json: profile.repoBreakdown as unknown as Json,
    cards_json: profile.cards as unknown as Json,
    narrative_json: finalNarrative as unknown as Json,
    llm_model: llmModelUsed,
    llm_key_source: llmKeySource,
    updated_at: new Date().toISOString(),
  } as Insertable<"user_profiles"> & {
    narrative_json: Json;
    llm_model: string | null;
    llm_key_source: string;
  };

  const { error: profileError } = await service
    .from("user_profiles")
    .upsert(profileRow, { onConflict: "user_id" });

  if (profileError) {
    return NextResponse.json({ error: "failed_to_save_profile" }, { status: 500 });
  }

  // Include narrative in the snapshot for history
  const profileSnapshot = {
    ...profile,
    narrative: finalNarrative,
  };

  const { error: historyError } = await service.from("user_profile_history").insert({
    user_id: user.id,
    profile_snapshot: profileSnapshot as unknown as Json,
    trigger_job_id: triggerJobId,
    llm_model: llmModelUsed,
    llm_key_source: llmKeySource,
  });

  if (historyError && !historyError.message.toLowerCase().includes("does not exist")) {
    return NextResponse.json({ error: "failed_to_save_history" }, { status: 500 });
  }

  return NextResponse.redirect(redirectUrl);
}
