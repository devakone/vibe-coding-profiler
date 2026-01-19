import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import {
  aggregateUserProfile,
  assignVibeType,
  computeAnalysisInsights,
  computeAnalysisMetrics,
  computeVibeFromCommits,
  detectVibePersona,
  decryptString,
  filterAutomationCommits,
  classifyCommit,
  createLLMClient,
  getModelCandidates,
  type AnalysisReport,
  type CommitEvent,
  type JobStatus,
  type LLMConfig,
  type LLMKeySource,
  type LLMProvider,
  type RepoInsightSummary,
  type VibeAxes,
  type VibeCommitEvent,
  type VibePersona,
} from "@vibed/core";
import { resolveLLMConfig, resolveProfileLLMConfig, recordLLMUsage } from "@/lib/llm-config";
import {
  generateProfileNarrativeWithLLM,
  toProfileNarrativeFallback,
  type ProfileNarrative,
} from "@/lib/profile-narrative";

const ANALYZER_VERSION = "0.2.0-inngest";

function safeJsonParse(value: string): unknown {
  try {
    const trimmed = value.trim();
    if (trimmed.startsWith("```")) {
      const firstNewline = trimmed.indexOf("\n");
      const afterFence = firstNewline === -1 ? "" : trimmed.slice(firstNewline + 1);
      const endFence = afterFence.lastIndexOf("```");
      const inside = (endFence === -1 ? afterFence : afterFence.slice(0, endFence)).trim();
      return JSON.parse(inside) as unknown;
    }
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

export function toNarrativeFallback(params: {
  metrics: ReturnType<typeof computeAnalysisMetrics>;
  events: CommitEvent[];
}): AnalysisReport["narrative"] {
  const { metrics, events } = params;
  return {
    summary: `Analyzed ${metrics.total_commits} commits over ${metrics.active_days} active days.`,
    sections: [
      {
        title: "Build rhythm",
        content: `Median gap between commits: ${metrics.hours_between_commits_p50.toFixed(1)}h. Burstiness score: ${metrics.burstiness_score.toFixed(2)}.`,
        evidence: events.slice(0, 5).map((e) => e.sha),
      },
      {
        title: "Iteration",
        content: `Fix ratio: ${(metrics.fix_commit_ratio * 100).toFixed(0)}%. Fix-after-feature sequences: ${metrics.fixup_sequence_count}.`,
        evidence: events.slice(0, 5).map((e) => e.sha),
      },
    ],
    highlights: [
      {
        metric: "commits",
        value: String(metrics.total_commits),
        interpretation: "Total commits included in this analysis.",
      },
      {
        metric: "active_days",
        value: String(metrics.active_days),
        interpretation: "Days with at least one commit.",
      },
    ],
  };
}

function buildCommitLines(events: CommitEvent[], maxLines: number): string[] {
  const byTimeAsc = [...events].sort(
    (a, b) =>
      new Date(a.committer_date).getTime() - new Date(b.committer_date).getTime()
  );

  const trimmed = byTimeAsc.map((e) => {
    const subject = e.message.split("\n")[0]?.trim() ?? "";
    const category = classifyCommit(e.message);
    const size = e.additions + e.deletions;
    const when = new Date(e.committer_date).toISOString().slice(0, 19) + "Z";
    return `${when} ${e.sha.slice(0, 10)} ${category} ${size}ch ${e.files_changed}f ${subject}`;
  });

  if (trimmed.length <= maxLines) return trimmed;

  const headCount = Math.floor(maxLines / 2);
  const tailCount = maxLines - headCount;
  return [...trimmed.slice(0, headCount), ...trimmed.slice(-tailCount)];
}

function computeEpisodeSummary(events: CommitEvent[]): Array<{
  start: string;
  end: string;
  commits: number;
  spanHours: number;
}> {
  const byTimeAsc = [...events].sort(
    (a, b) =>
      new Date(a.committer_date).getTime() - new Date(b.committer_date).getTime()
  );

  const episodes: Array<{
    start: Date;
    end: Date;
    commits: number;
  }> = [];

  const gapHoursThreshold = 8;

  for (const e of byTimeAsc) {
    const t = new Date(e.committer_date);
    const last = episodes[episodes.length - 1];
    if (!last) {
      episodes.push({ start: t, end: t, commits: 1 });
      continue;
    }
    const gapHours = (t.getTime() - last.end.getTime()) / (1000 * 60 * 60);
    if (gapHours > gapHoursThreshold) {
      episodes.push({ start: t, end: t, commits: 1 });
      continue;
    }
    last.end = t;
    last.commits += 1;
  }

  return episodes.slice(0, 12).map((ep) => {
    const spanHours = (ep.end.getTime() - ep.start.getTime()) / (1000 * 60 * 60);
    const start = ep.start.toISOString().slice(0, 19) + "Z";
    const end = ep.end.toISOString().slice(0, 19) + "Z";
    return { start, end, commits: ep.commits, spanHours };
  });
}

/**
 * Result from narrative generation including token usage for tracking
 */
interface NarrativeResult {
  narrative: AnalysisReport["narrative"];
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate a narrative report using any supported LLM provider.
 * Uses the LLM abstraction layer for consistent behavior across providers.
 */
export async function generateNarrativeWithLLM(params: {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  repoFullName: string;
  vibeType: string | null;
  confidence: AnalysisReport["confidence"];
  matchedCriteria: string[];
  metrics: ReturnType<typeof computeAnalysisMetrics>;
  insights: ReturnType<typeof computeAnalysisInsights>;
  events: CommitEvent[];
}): Promise<NarrativeResult | null> {
  const {
    provider,
    apiKey,
    model,
    repoFullName,
    vibeType,
    confidence,
    matchedCriteria,
    metrics,
    insights,
    events,
  } = params;

  const nonBotEvents = filterAutomationCommits(events);
  const commitLines = buildCommitLines(nonBotEvents, 120);
  const episodes = computeEpisodeSummary(nonBotEvents);

  const firstLast = (() => {
    const byTimeAsc = [...nonBotEvents].sort(
      (a, b) =>
        new Date(a.committer_date).getTime() - new Date(b.committer_date).getTime()
    );
    return {
      first: byTimeAsc[0]?.committer_date ?? null,
      last: byTimeAsc[byTimeAsc.length - 1]?.committer_date ?? null,
    };
  })();

  const systemPrompt = [
    "You write a narrative report about how a feature/repo was built using ONLY the data provided.",
    "Never infer intent, skill, or code quality. Avoid speculation and motivational language.",
    "Every claim must cite at least one specific metric name and value (e.g. burstiness_score=0.42) or a specific commit subject line provided.",
    "Each section must include evidence: 2-6 commit SHAs that support the section.",
    "Output must be STRICT JSON with this schema:",
    '{"summary":"...","sections":[{"title":"...","content":"...","evidence":["sha", "..."]}],"highlights":[{"metric":"...","value":"...","interpretation":"..."}]}',
  ].join("\n");

  const userPrompt = [
    `Repo: ${repoFullName}`,
    `Vibe type: ${vibeType ?? "null"} (confidence=${confidence})`,
    matchedCriteria.length > 0 ? `Matched criteria: ${matchedCriteria.join(", ")}` : "Matched criteria: (none)",
    `Window: first_commit=${firstLast.first ?? "null"}, last_commit=${firstLast.last ?? "null"}`,
    "",
    "Metrics (JSON):",
    JSON.stringify(
      {
        total_commits: metrics.total_commits,
        active_days: metrics.active_days,
        span_days: metrics.span_days,
        commits_per_active_day_mean: metrics.commits_per_active_day_mean,
        commits_per_active_day_max: metrics.commits_per_active_day_max,
        commit_size_p50: metrics.commit_size_p50,
        commit_size_p90: metrics.commit_size_p90,
        hours_between_commits_p50: metrics.hours_between_commits_p50,
        hours_between_commits_p90: metrics.hours_between_commits_p90,
        burstiness_score: metrics.burstiness_score,
        merge_commit_ratio: metrics.merge_commit_ratio,
        conventional_commit_ratio: metrics.conventional_commit_ratio,
        fix_commit_ratio: metrics.fix_commit_ratio,
        fixup_sequence_count: metrics.fixup_sequence_count,
        category_first_occurrence: metrics.category_first_occurrence,
        category_distribution: metrics.category_distribution,
        data_quality_score: metrics.data_quality_score,
      },
      null,
      2
    ),
    "",
    "Insights (JSON):",
    JSON.stringify(
      {
        persona: insights.persona,
        timing: insights.timing,
        streak: insights.streak,
        commits: insights.commits,
        chunkiness: insights.chunkiness,
        patterns: insights.patterns,
        tech: insights.tech,
        disclaimers: insights.disclaimers,
      },
      null,
      2
    ),
    "",
    "Episode summary (JSON):",
    JSON.stringify(episodes, null, 2),
    "",
    "Commit lines (oldest→newest, compact):",
    ...commitLines,
    "",
    "Produce a concise narrative of how work progressed (what landed first, iteration loops, stabilization phases). Prefer 4-6 sections.",
  ].join("\n");

  // Use the LLM abstraction layer
  const client = createLLMClient({
    provider,
    apiKey,
    model,
    maxTokens: 1300,
    temperature: 0.3,
  });

  const response = await client.chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const parsed = safeJsonParse(response.content);
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as {
    summary?: unknown;
    sections?: unknown;
    highlights?: unknown;
  };

  if (typeof obj.summary !== "string") return null;
  if (!Array.isArray(obj.sections)) return null;
  if (!Array.isArray(obj.highlights)) return null;

  const sections: AnalysisReport["narrative"]["sections"] = [];
  for (const s of obj.sections) {
    if (!s || typeof s !== "object") return null;
    const sec = s as { title?: unknown; content?: unknown; evidence?: unknown };
    if (typeof sec.title !== "string") return null;
    if (typeof sec.content !== "string") return null;
    if (!Array.isArray(sec.evidence) || !sec.evidence.every((e) => typeof e === "string")) return null;
    sections.push({ title: sec.title, content: sec.content, evidence: sec.evidence });
  }

  const highlights: AnalysisReport["narrative"]["highlights"] = [];
  for (const h of obj.highlights) {
    if (!h || typeof h !== "object") return null;
    const hi = h as { metric?: unknown; value?: unknown; interpretation?: unknown };
    if (typeof hi.metric !== "string") return null;
    if (typeof hi.value !== "string") return null;
    if (typeof hi.interpretation !== "string") return null;
    highlights.push({ metric: hi.metric, value: hi.value, interpretation: hi.interpretation });
  }

  return {
    narrative: { summary: obj.summary, sections, highlights },
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}

/**
 * GitHub API types
 */
interface GithubCommitListItem {
  sha: string;
  parents: Array<{ sha: string }>;
  commit: {
    message: string;
    author: { email: string | null; date: string };
    committer: { email: string | null; date: string };
  };
}

interface GithubCommitDetail extends GithubCommitListItem {
  files?: Array<{ filename: string; status: string; additions: number; deletions: number }>;
  stats?: { additions: number; deletions: number; total: number };
}

interface GithubCompareResponse {
  commits: GithubCommitDetail[];
  files?: Array<{ filename: string }>;
}

/**
 * Fetch helper with rate limit handling
 */
async function githubFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 403) {
    const resetHeader = res.headers.get("X-RateLimit-Reset");
    const resetTime = resetHeader ? parseInt(resetHeader, 10) * 1000 : Date.now() + 60000;
    const waitMs = Math.max(0, resetTime - Date.now());
    throw new Error(`RATE_LIMITED:${waitMs}`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

/**
 * Fetch commit list (paginated)
 */
async function fetchCommitList(params: {
  owner: string;
  repo: string;
  token: string;
  maxCommits: number;
}): Promise<GithubCommitListItem[]> {
  const items: GithubCommitListItem[] = [];
  let page = 1;

  while (items.length < params.maxCommits) {
    const url = new URL(
      `https://api.github.com/repos/${params.owner}/${params.repo}/commits`
    );
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const batch = await githubFetch<GithubCommitListItem[]>(url.toString(), params.token);
    items.push(...batch);

    if (batch.length < 100) break;
    page += 1;
    if (page > 10) break; // Safety limit
  }

  return items.slice(0, params.maxCommits);
}

/**
 * Fetch commits with files using compare endpoint (more efficient)
 * Returns up to 250 commits with file lists in ONE API call
 */
async function fetchCommitsWithCompare(params: {
  owner: string;
  repo: string;
  token: string;
  baseSha: string;
  headSha: string;
}): Promise<GithubCommitDetail[]> {
  const url = `https://api.github.com/repos/${params.owner}/${params.repo}/compare/${params.baseSha}...${params.headSha}`;
  const response = await githubFetch<GithubCompareResponse>(url, params.token);
  return response.commits;
}

/**
 * Fetch individual commit detail (fallback for when compare doesn't work)
 */
async function fetchCommitDetail(params: {
  owner: string;
  repo: string;
  sha: string;
  token: string;
}): Promise<GithubCommitDetail> {
  const url = `https://api.github.com/repos/${params.owner}/${params.repo}/commits/${params.sha}`;
  return githubFetch<GithubCommitDetail>(url, params.token);
}

/**
 * Main analysis function
 *
 * Uses Inngest steps for:
 * - Automatic retries on failure
 * - Rate limit backoff
 * - Progress tracking
 * - Long-running execution (up to 2 hours)
 */
export const analyzeRepo = inngest.createFunction(
  {
    id: "analyze-repo",
    retries: 5,
    onFailure: async ({ error, event }) => {
      // Mark job as failed in database
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // event.data contains the original event data
      const eventData = event.data as { event: { data: { jobId: string } } };
      const jobId = eventData?.event?.data?.jobId;

      if (jobId) {
        await supabase
          .from("analysis_jobs")
          .update({
            status: "error" as JobStatus,
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    },
  },
  { event: "repo/analyze.requested" },
  async ({ event, step }) => {
    const { jobId, userId, repoId } = event.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Load job and repo details
    const { repo, githubToken } = await step.run("load-job-context", async () => {
      const { data: job, error: jobError } = await supabase
        .from("analysis_jobs")
        .select("id, user_id, repo_id")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const { data: repo, error: repoError } = await supabase
        .from("repos")
        .select("id, owner, name, full_name")
        .eq("id", repoId)
        .single();

      if (repoError || !repo) {
        throw new Error("Repo not found");
      }

      const encryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error("Missing GITHUB_TOKEN_ENCRYPTION_KEY");
      }

      const { data: ghAccount, error: ghError } = await supabase
        .from("github_accounts")
        .select("encrypted_token")
        .eq("user_id", userId)
        .single();

      if (ghError || !ghAccount) {
        throw new Error("GitHub account not connected");
      }

      const githubToken = decryptString(ghAccount.encrypted_token, encryptionKey);

      // Mark job as running
      await supabase
        .from("analysis_jobs")
        .update({ status: "running" as JobStatus })
        .eq("id", jobId);

      return { job, repo, githubToken };
    });

    // Step 2: Fetch commit list
    const commitList = await step.run("fetch-commit-list", async () => {
      return fetchCommitList({
        owner: repo.owner,
        repo: repo.name,
        token: githubToken,
        maxCommits: 300,
      });
    });

    if (commitList.length === 0) {
      throw new Error("No commits found in repository");
    }

    // Step 3: Fetch commit details with file paths
    // Try compare endpoint first (efficient), fall back to individual fetches
    const events = await step.run("fetch-commit-details", async () => {
      const firstSha = commitList[commitList.length - 1].sha;
      const lastSha = commitList[0].sha;

      let detailedCommits: GithubCommitDetail[] = [];

      try {
        // Try compare endpoint (gets up to 250 commits with files in one call)
        detailedCommits = await fetchCommitsWithCompare({
          owner: repo.owner,
          repo: repo.name,
          token: githubToken,
          baseSha: `${firstSha}^`, // Parent of first commit
          headSha: lastSha,
        });
      } catch {
        // Fall back to individual fetches (slower but more reliable)
        console.log("Compare endpoint failed, falling back to individual fetches");

        // Fetch in batches with concurrency limit
        const batchSize = 10;
        for (let i = 0; i < commitList.length; i += batchSize) {
          const batch = commitList.slice(i, i + batchSize);
          const details = await Promise.all(
            batch.map((item) =>
              fetchCommitDetail({
                owner: repo.owner,
                repo: repo.name,
                sha: item.sha,
                token: githubToken,
              })
            )
          );
          detailedCommits.push(...details);
        }
      }

      // Map to CommitEvent with file_paths
      const events: VibeCommitEvent[] = detailedCommits.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author_date: c.commit.author.date,
        committer_date: c.commit.committer.date,
        author_email: c.commit.author.email ?? "",
        files_changed: Array.isArray(c.files) ? c.files.length : 0,
        additions: c.stats?.additions ?? 0,
        deletions: c.stats?.deletions ?? 0,
        parents: c.parents?.map((p) => p.sha) ?? [],
        // NEW: Extract file paths for subsystem detection
        file_paths: Array.isArray(c.files) ? c.files.map((f) => f.filename) : [],
      }));

      return events;
    });

    // Step 4: Compute metrics and insights
    const { metrics, assignment, insights, vibeInsights } = await step.run(
      "compute-analysis",
      async () => {
        // Legacy metrics (for backwards compatibility)
        const legacyEvents: CommitEvent[] = events.map((e) => ({
          sha: e.sha,
          message: e.message,
          author_date: e.author_date,
          committer_date: e.committer_date,
          author_email: e.author_email,
          files_changed: e.files_changed,
          additions: e.additions,
          deletions: e.deletions,
          parents: e.parents,
        }));

        const metrics = computeAnalysisMetrics(legacyEvents);
        const assignment = assignVibeType(metrics);
        const insights = computeAnalysisInsights(legacyEvents);

        // NEW: Vibe v2 insights with episodes and subsystems
        const vibeInsights = computeVibeFromCommits({
          commits: events,
          episodeGapHours: 4,
        });

        return { metrics, assignment, insights, vibeInsights };
      }
    );

    // Step 5: Save results
    await step.run("save-results", async () => {
      const reportEvents: CommitEvent[] = events.map((e) => ({
        sha: e.sha,
        message: e.message,
        author_date: e.author_date,
        committer_date: e.committer_date,
        author_email: e.author_email,
        files_changed: e.files_changed,
        additions: e.additions,
        deletions: e.deletions,
        parents: e.parents,
      }));

      const fallbackNarrative = toNarrativeFallback({ metrics, events: reportEvents });

      // Resolve LLM config (user key, platform key, or none)
      const llmResolution = await resolveLLMConfig(userId, repoId);
      let llmNarrative: AnalysisReport["narrative"] | null = null;
      let llmModelUsed: string | null = null;
      const llmKeySource: LLMKeySource = llmResolution.source;
      const llmConfig: LLMConfig | null = llmResolution.config;

      if (llmConfig) {
        // Try models in order of preference (primary, then fallbacks)
        const modelCandidates = getModelCandidates(llmConfig.provider);

        for (const candidate of modelCandidates) {
          try {
            // Use unified generateNarrativeWithLLM for all providers
            const result = await generateNarrativeWithLLM({
              provider: llmConfig.provider,
              apiKey: llmConfig.apiKey,
              model: candidate,
              repoFullName: repo.full_name,
              vibeType: assignment.vibe_type,
              confidence: assignment.confidence,
              matchedCriteria: assignment.matched_criteria,
              metrics,
              insights,
              events: reportEvents,
            });

            if (result) {
              llmNarrative = result.narrative;
              llmModelUsed = candidate;

              // Record successful usage with token counts
              await recordLLMUsage({
                userId,
                jobId,
                repoId,
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
            // Record failed attempt for observability
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.warn(`LLM model ${candidate} failed:`, errorMessage);

            await recordLLMUsage({
              userId,
              jobId,
              repoId,
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

      const report: AnalysisReport = {
        vibe_type: assignment.vibe_type,
        confidence: assignment.confidence,
        matched_criteria: assignment.matched_criteria,
        narrative: llmNarrative ?? fallbackNarrative,
      };

      // Save metrics
      const { error: metricsError } = await supabase.from("analysis_metrics").upsert(
        {
          job_id: jobId,
          metrics_json: metrics,
          events_json: events,
        },
        { onConflict: "job_id" }
      );
      if (metricsError) throw new Error(`Failed to upsert metrics: ${metricsError.message}`);

      // Save report with LLM tracking
      const { error: reportError } = await supabase.from("analysis_reports").upsert(
        {
          job_id: jobId,
          vibe_type: report.vibe_type,
          narrative_json: report.narrative,
          evidence_json: report.matched_criteria,
          llm_model: llmModelUsed ?? "none",
          llm_key_source: llmKeySource,
        },
        { onConflict: "job_id" }
      );
      if (reportError) throw new Error(`Failed to upsert report: ${reportError.message}`);

      // Save legacy insights
      const { error: insightsError } = await supabase.from("analysis_insights").upsert(
        {
          job_id: jobId,
          insights_json: insights,
          generator_version: ANALYZER_VERSION,
          persona_id: insights.persona.id,
          persona_label: insights.persona.label,
          persona_confidence: insights.persona.confidence,
          tech_signals: insights.tech_signals,
          share_template: insights.share_template,
          persona_delta: insights.persona_delta,
          sources: insights.sources,
        },
        { onConflict: "job_id" }
      );
      if (insightsError) throw new Error(`Failed to upsert insights: ${insightsError.message}`);

      // Save vibe v2 insights
      const { error: vibeError } = await supabase.from("vibe_insights").upsert(
        {
          job_id: jobId,
          version: vibeInsights.version,
          axes_json: vibeInsights.axes,
          persona_id: vibeInsights.persona.id,
          persona_name: vibeInsights.persona.name,
          persona_tagline: vibeInsights.persona.tagline,
          persona_confidence: vibeInsights.persona.confidence,
          persona_score: vibeInsights.persona.score,
          cards_json: vibeInsights.cards,
          evidence_json: vibeInsights.evidence_index,
        },
        { onConflict: "job_id" }
      );
      // Don't fail if vibe_insights table doesn't exist yet
      if (vibeError && !vibeError.message.includes("does not exist")) {
        console.warn("Failed to save vibe insights:", vibeError.message);
      }

      // Mark job complete
      const { error: finalizeError } = await supabase
        .from("analysis_jobs")
        .update({
          status: "done" as JobStatus,
          commit_count: events.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (finalizeError) throw new Error(`Failed to finalize job: ${finalizeError.message}`);
    });

    // Step 6: Update user's aggregated profile
    await step.run("update-user-profile", async () => {
      const { data: userRepos, error: userReposError } = await supabase
        .from("user_repos")
        .select("repo_id, disconnected_at")
        .eq("user_id", userId);

      if (userReposError) {
        throw new Error(`Failed to load user repos: ${userReposError.message}`);
      }

      const disconnectedRepoIds = new Set(
        (userRepos ?? [])
          .filter((r) => r.disconnected_at != null)
          .map((r) => r.repo_id)
          .filter((id): id is string => Boolean(id))
      );

      // Fetch all completed jobs for this user
      const { data: completedJobs, error: jobsError } = await supabase
        .from("analysis_jobs")
        .select("id, repo_id, commit_count, completed_at")
        .eq("user_id", userId)
        .eq("status", "done");

      if (jobsError || !completedJobs || completedJobs.length === 0) {
        console.log("No completed jobs to aggregate");
        return;
      }

      const includedJobs = completedJobs.filter((job) => {
        const repoId = job.repo_id;
        if (typeof repoId !== "string") return false;
        if (disconnectedRepoIds.has(repoId)) return false;
        return true;
      });

      if (includedJobs.length === 0) {
        console.log("No eligible jobs to aggregate");
        return;
      }

      const jobsMissingCommitCount = includedJobs.filter((j) => j.commit_count == null).map((j) => j.id);
      const { data: metricsData } =
        jobsMissingCommitCount.length > 0
          ? await supabase
              .from("analysis_metrics")
              .select("job_id, metrics_json")
              .in("job_id", jobsMissingCommitCount)
          : { data: [] as Array<{ job_id: string; metrics_json: unknown }> };

      const commitCountByJobId = new Map<string, number>();
      for (const row of metricsData ?? []) {
        const jobId = (row as { job_id: string }).job_id;
        const metricsJson = (row as { metrics_json: unknown }).metrics_json;
        if (typeof metricsJson !== "object" || metricsJson === null) continue;

        const totalCommits = (metricsJson as { total_commits?: unknown }).total_commits;
        if (typeof totalCommits === "number") {
          commitCountByJobId.set(jobId, totalCommits);
        }
      }

      // Fetch repo names
      const repoIds = includedJobs.map((j) => j.repo_id).filter(Boolean);
      const { data: repos } = await supabase
        .from("repos")
        .select("id, full_name")
        .in("id", repoIds);

      const repoNameById = new Map<string, string>();
      for (const r of repos ?? []) {
        repoNameById.set(r.id, r.full_name);
      }

      // Fetch vibe insights for each job (prefer vibe_insights, fall back to analysis_insights)
      const jobIds = includedJobs.map((j) => j.id);

      // Try vibe_insights first
      const { data: vibeInsightsData } = await supabase
        .from("vibe_insights")
        .select("job_id, axes_json, persona_id, persona_name, persona_tagline, persona_confidence, persona_score")
        .in("job_id", jobIds);

      type VibeInsightsRow = {
        job_id: string;
        axes_json: unknown;
        persona_id: string;
        persona_name: string;
        persona_tagline: string | null;
        persona_confidence: string;
        persona_score: number | null;
      };

      const vibeInsights = (vibeInsightsData ?? []) as VibeInsightsRow[];

      // Fall back to analysis_insights for jobs without vibe_insights
      const vibeJobIds = new Set(vibeInsights.map((v) => v.job_id));
      const missingJobIds = jobIds.filter((id) => !vibeJobIds.has(id));

      const { data: missingMetricsData } = missingJobIds.length > 0
        ? await supabase
            .from("analysis_metrics")
            .select("job_id, events_json")
            .in("job_id", missingJobIds)
        : { data: [] };

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

      const computedByJobId = new Map<string, ReturnType<typeof computeVibeFromCommits>>();
      for (const row of missingMetricsData ?? []) {
        const jobId = (row as { job_id: string }).job_id;
        const commits = toCommitEvents((row as { events_json: unknown }).events_json);
        if (!commits) continue;
        computedByJobId.set(jobId, computeVibeFromCommits({ commits, episodeGapHours: 4 }));
      }

      const backfillRows = Array.from(computedByJobId.entries()).map(([jobId, v]) => ({
        job_id: jobId,
        version: v.version,
        axes_json: v.axes,
        persona_id: v.persona.id,
        persona_name: v.persona.name,
        persona_tagline: v.persona.tagline,
        persona_confidence: v.persona.confidence,
        persona_score: v.persona.score,
        cards_json: v.cards,
        evidence_json: v.evidence_index,
        generated_at: v.generated_at,
      }));

      if (backfillRows.length > 0) {
        await supabase.from("vibe_insights").upsert(backfillRows, { onConflict: "job_id" });
      }

      const { data: legacyInsightsData } = missingJobIds.length > 0
        ? await supabase
            .from("analysis_insights")
            .select("job_id, persona_id, persona_label, persona_confidence")
            .in("job_id", missingJobIds)
        : { data: [] };

      type LegacyInsightsRow = {
        job_id: string;
        persona_id: string | null;
        persona_label: string | null;
        persona_confidence: string | null;
      };

      const legacyInsights = (legacyInsightsData ?? []) as LegacyInsightsRow[];

      const vibeInsightByJobId = new Map<string, VibeInsightsRow>();
      for (const insight of vibeInsights) {
        vibeInsightByJobId.set(insight.job_id, insight);
      }

      const legacyInsightByJobId = new Map<string, LegacyInsightsRow>();
      for (const insight of legacyInsights) {
        legacyInsightByJobId.set(insight.job_id, insight);
      }

      // Build RepoInsightSummary array
      const repoInsights: RepoInsightSummary[] = [];
      const legacyRepoInsights: RepoInsightSummary[] = [];

      for (const job of includedJobs) {
        const repoName = repoNameById.get(job.repo_id) ?? "Unknown";
        const commitCount = job.commit_count ?? commitCountByJobId.get(job.id) ?? 0;

        // Check vibe_insights first
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

        // Fall back to legacy insights (create default axes)
        const legacyInsight = legacyInsightByJobId.get(job.id);
        if (legacyInsight) {
          // Create default axes for legacy insights (AxisValue type: score, level, why)
          const defaultAxis = { score: 50, level: "medium" as const, why: ["Legacy insight - no detailed axis data available"] };
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
        console.log("No insights to aggregate");
        return;
      }

      // Aggregate profile
      const profile = aggregateUserProfile(effectiveRepoInsights);

      // Resolve LLM config for profile narrative generation
      const profileLlmResolution = await resolveProfileLLMConfig(userId);
      let profileNarrative: ProfileNarrative | null = null;
      let profileLlmModelUsed: string | null = null;
      const profileLlmKeySource: LLMKeySource = profileLlmResolution.source;

      // Generate LLM narrative if available
      if (profileLlmResolution.config) {
        const llmConfig = profileLlmResolution.config;
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
              profileNarrative = result.narrative;
              profileLlmModelUsed = candidate;

              // Record successful usage
              await recordLLMUsage({
                userId,
                provider: llmConfig.provider,
                model: candidate,
                keySource: profileLlmKeySource,
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
              userId,
              provider: llmConfig.provider,
              model: candidate,
              keySource: profileLlmKeySource,
              success: false,
              errorMessage,
            });
            continue;
          }
        }
      }

      // Use fallback narrative if LLM didn't generate one
      const finalNarrative = profileNarrative ?? toProfileNarrativeFallback({
        persona: profile.persona,
        axes: profile.axes,
        totalCommits: profile.totalCommits,
        totalRepos: profile.totalRepos,
        repoBreakdown: profile.repoBreakdown,
      });

      // Upsert user_profiles with LLM narrative
      const { error: profileError } = await supabase.from("user_profiles").upsert(
        {
          user_id: userId,
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
          narrative_json: finalNarrative,
          llm_model: profileLlmModelUsed,
          llm_key_source: profileLlmKeySource,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      // Don't fail if user_profiles table doesn't exist yet
      if (profileError && !profileError.message.includes("does not exist")) {
        console.warn("Failed to save user profile:", profileError.message);
      }

      // Include narrative in the snapshot for history
      const profileSnapshot = {
        ...profile,
        narrative: finalNarrative,
      };

      // Save profile history snapshot with LLM metadata
      const { error: historyError } = await supabase.from("user_profile_history").insert({
        user_id: userId,
        profile_snapshot: profileSnapshot,
        trigger_job_id: jobId,
        llm_model: profileLlmModelUsed,
        llm_key_source: profileLlmKeySource,
      });

      if (historyError && !historyError.message.includes("does not exist")) {
        console.warn("Failed to save profile history:", historyError.message);
      }

      console.log(`Updated profile for user ${userId}: ${profile.persona.name} (${profile.totalRepos} repos, ${profile.totalCommits} commits), LLM: ${profileLlmModelUsed ?? "none"}`);
    });

    return {
      jobId,
      commitCount: events.length,
      persona: vibeInsights.persona.name,
      confidence: vibeInsights.persona.confidence,
    };
  }
);
