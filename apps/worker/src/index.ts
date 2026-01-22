/**
 * Vibed Coding Worker
 *
 * Self-hosted fallback job processor for git analysis.
 *
 * ARCHITECTURE NOTE:
 * This worker is a FALLBACK for self-hosted deployments without Inngest.
 * The primary processing path is via Inngest (see /apps/web/src/inngest/functions/analyze-repo.ts).
 *
 * Key differences from Inngest:
 * - Uses only platform LLM keys from environment variables
 * - Does NOT support user API keys (BYOK) - use Inngest for BYOK
 * - Does NOT track free tier limits or record LLM usage
 * - Polls database instead of event-driven processing
 *
 * When to use this worker:
 * - Self-hosted deployments without Inngest
 * - Development/testing environments
 * - Backup processing if Inngest is unavailable
 *
 * This worker:
 * 1. Polls the analysis_jobs table for queued jobs
 * 2. Claims a job using FOR UPDATE SKIP LOCKED
 * 3. Fetches commits from GitHub API
 * 4. Computes metrics using @vibed/core
 * 5. Generates narrative via LLM (platform key only)
 * 6. Writes results back to database
 */

import { createServerClient, type Json } from "@vibed/db";
import {
  assignVibeType,
  computeAnalysisInsights,
  computeAnalysisMetrics,
  decryptString,
  filterAutomationCommits,
  classifyCommit,
  createLLMClient,
  getModelCandidates,
  type AnalysisReport,
  type CommitEvent,
  type JobStatus,
  type LLMProvider,
} from "@vibed/core";
import { fetchCommitDetail, fetchCommitList, mapWithConcurrency } from "./github";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";

const POLL_INTERVAL_MS = 5000;
const ANALYZER_VERSION = "0.1.0";

function loadDotEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const workerDir = path.resolve(process.cwd());
loadDotEnvFile(path.join(workerDir, ".env.local"));
loadDotEnvFile(path.join(workerDir, ".env"));

function startHealthServer() {
  const port = Number(process.env.WORKER_PORT ?? "8109");
  const host = process.env.WORKER_HOST ?? "0.0.0.0";

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("Invalid WORKER_PORT");
  }

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(port, host, () => {
    console.log(`Worker health server listening on http://${host}:${port}`);
  });
}

interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  githubTokenEncryptionKey?: string;
  // LLM configuration - supports multiple providers
  llmProvider?: LLMProvider;
  llmApiKey?: string;
}

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

function toNarrativeFallback(params: {
  metrics: ReturnType<typeof computeAnalysisMetrics>;
  events: CommitEvent[];
}): AnalysisReport["narrative"] {
  const { metrics, events } = params;
  return {
    summary: `Analyzed ${metrics.total_commits} commits over ${metrics.active_days} active days across ${metrics.span_days} days.`,
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
      {
        metric: "commit_size_p50",
        value: String(metrics.commit_size_p50.toFixed(0)),
        interpretation: "Median commit size (additions + deletions).",
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
 * Result from narrative generation including token usage and model used
 */
interface NarrativeResult {
  narrative: AnalysisReport["narrative"];
  model: string;
  tagline: string | null;
}

/**
 * Generate a narrative report using any supported LLM provider.
 * Uses the LLM abstraction layer for consistent behavior across providers.
 */
async function generateNarrativeWithLLM(params: {
  provider: LLMProvider;
  apiKey: string;
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
    "Provide a concise tagline (<=60 characters) that describes the developer's vibe. This tagline will be displayed on share cards and should remain observational.",
    "Output must be STRICT JSON with this schema:",
    '{"summary":"...","tagline":"...","sections":[{"title":"...","content":"...","evidence":["sha", "..."]}],"highlights":[{"metric":"...","value":"...","interpretation":"..."}]}',
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
    "Produce a concise story of how work progressed (what landed first, iteration loops, stabilization phases). Prefer 4-6 sections.",
  ].join("\n");

  // Use model candidates for automatic fallback
  const modelCandidates = getModelCandidates(provider);

  for (const model of modelCandidates) {
    try {
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
      if (!parsed || typeof parsed !== "object") continue;

      const obj = parsed as {
        summary?: unknown;
        tagline?: unknown;
        sections?: unknown;
        highlights?: unknown;
      };

      if (typeof obj.summary !== "string") continue;
      if (!Array.isArray(obj.sections)) continue;
      if (!Array.isArray(obj.highlights)) continue;

      const sections: AnalysisReport["narrative"]["sections"] = [];
      let sectionsValid = true;
      for (const s of obj.sections) {
        if (!s || typeof s !== "object") { sectionsValid = false; break; }
        const sec = s as { title?: unknown; content?: unknown; evidence?: unknown };
        if (typeof sec.title !== "string") { sectionsValid = false; break; }
        if (typeof sec.content !== "string") { sectionsValid = false; break; }
        if (!Array.isArray(sec.evidence) || !sec.evidence.every((e) => typeof e === "string")) { sectionsValid = false; break; }
        sections.push({ title: sec.title, content: sec.content, evidence: sec.evidence });
      }
      if (!sectionsValid) continue;

      const highlights: AnalysisReport["narrative"]["highlights"] = [];
      let highlightsValid = true;
      for (const h of obj.highlights) {
        if (!h || typeof h !== "object") { highlightsValid = false; break; }
        const hi = h as { metric?: unknown; value?: unknown; interpretation?: unknown };
        if (typeof hi.metric !== "string") { highlightsValid = false; break; }
        if (typeof hi.value !== "string") { highlightsValid = false; break; }
        if (typeof hi.interpretation !== "string") { highlightsValid = false; break; }
        highlights.push({ metric: hi.metric, value: hi.value, interpretation: hi.interpretation });
      }
      if (!highlightsValid) continue;

      // Enforce 60-char limit as specified in the prompt
      const rawTagline = typeof obj.tagline === "string" ? obj.tagline.trim() : null;
      const tagline = rawTagline ? rawTagline.slice(0, 60) : null;

      return {
        narrative: { summary: obj.summary, sections, highlights },
        model,
        tagline,
      };
    } catch (error) {
      console.warn(`LLM model ${model} failed, trying next:`, error);
      continue;
    }
  }

  return null;
}

async function claimJob(config: WorkerConfig): Promise<string | null> {
  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseServiceKey
  );

  // Use a transaction to claim a job atomically
  const { data, error } = await supabase.rpc("claim_analysis_job", {
    p_analyzer_version: ANALYZER_VERSION,
  });

  if (error) {
    console.error("Error claiming job:", error);
    return null;
  }

  return data;
}

async function processJob(jobId: string, config: WorkerConfig): Promise<void> {
  console.log(`Processing job ${jobId}...`);

  const supabase = createServerClient(
    config.supabaseUrl,
    config.supabaseServiceKey
  );

  try {
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
      .eq("id", job.repo_id)
      .single();

    if (repoError || !repo) throw new Error("Job repo not found");

    if (!config.githubTokenEncryptionKey) {
      throw new Error("Missing GITHUB_TOKEN_ENCRYPTION_KEY");
    }

    const { data: ghAccount, error: ghError } = await supabase
      .from("github_accounts")
      .select("encrypted_token")
      .eq("user_id", job.user_id)
      .single();

    if (ghError || !ghAccount) throw new Error("GitHub account not connected");

    const githubToken = decryptString(
      ghAccount.encrypted_token,
      config.githubTokenEncryptionKey
    );

    const maxCommits = 200;
    const list = await fetchCommitList({
      owner: repo.owner,
      repo: repo.name,
      token: githubToken,
      maxCommits,
    });

    const details = await mapWithConcurrency(list, 5, async (item) => {
      const detail = await fetchCommitDetail({
        owner: repo.owner,
        repo: repo.name,
        sha: item.sha,
        token: githubToken,
      });
      return detail;
    });

    const events: CommitEvent[] = details.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author_date: c.commit.author.date,
      committer_date: c.commit.committer.date,
      author_email: c.commit.author.email ?? "",
      files_changed: Array.isArray(c.files) ? c.files.length : 0,
      additions: c.stats?.additions ?? 0,
      deletions: c.stats?.deletions ?? 0,
      parents: c.parents?.map((p) => p.sha) ?? [],
    }));

    const metrics = computeAnalysisMetrics(events);
    const assignment = assignVibeType(metrics);
    const insights = computeAnalysisInsights(events);

    const fallbackNarrative = toNarrativeFallback({ metrics, events });
    let llmResult: NarrativeResult | null = null;

    if (config.llmProvider && config.llmApiKey && config.llmApiKey.trim().length > 0) {
      llmResult = await generateNarrativeWithLLM({
        provider: config.llmProvider,
        apiKey: config.llmApiKey,
        repoFullName: repo.full_name,
        vibeType: assignment.vibe_type,
        confidence: assignment.confidence,
        matchedCriteria: assignment.matched_criteria,
        metrics,
        insights,
        events,
      });
    }

    const report: AnalysisReport = {
      vibe_type: assignment.vibe_type,
      confidence: assignment.confidence,
      matched_criteria: assignment.matched_criteria,
      narrative: llmResult?.narrative ?? fallbackNarrative,
    };

    const { error: metricsError } = await supabase.from("analysis_metrics").upsert(
      [
        {
          job_id: jobId,
          metrics_json: metrics as unknown as Json,
          events_json: events as unknown as Json,
        },
      ],
      { onConflict: "job_id" }
    );
    if (metricsError) throw new Error(`Failed to upsert metrics: ${metricsError.message}`);

    const { error: reportError } = await supabase.from("analysis_reports").upsert(
      [
        {
          job_id: jobId,
          vibe_type: report.vibe_type,
          narrative_json: report.narrative as unknown as Json,
          evidence_json: report.matched_criteria as unknown as Json,
          llm_model: llmResult?.model ?? "none",
        },
      ],
      { onConflict: "job_id" }
    );
    if (reportError) throw new Error(`Failed to upsert report: ${reportError.message}`);

    // Authoritative tagline: LLM-generated if available, else persona description
    const personaTaglineFallback = insights.persona.description ?? "";
    const llmTagline = llmResult?.tagline?.trim();
    const finalTagline = llmTagline?.length ? llmTagline : personaTaglineFallback;
    insights.share_template.tagline = finalTagline;

    const { error: insightsError } = await supabase.from("analysis_insights").upsert(
      {
        job_id: jobId,
        insights_json: insights as unknown as Json,
        generator_version: ANALYZER_VERSION,
        persona_id: insights.persona.id,
        persona_label: insights.persona.label,
        persona_confidence: insights.persona.confidence,
        tech_signals: insights.tech_signals as unknown as Json,
        share_template: insights.share_template as unknown as Json,
        tagline: finalTagline,
        persona_delta: insights.persona_delta as unknown as Json,
        sources: insights.sources,
      },
      { onConflict: "job_id" }
    );
    if (insightsError) throw new Error(`Failed to upsert insights: ${insightsError.message}`);

    const { error: finalizeError } = await supabase
      .from("analysis_jobs")
      .update({
        status: "done" as JobStatus,
        commit_count: events.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (finalizeError) throw new Error(`Failed to finalize job: ${finalizeError.message}`);

    console.log(`Job ${jobId} completed. (${events.length} commits)`);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);

    // Mark job as error
    await supabase
      .from("analysis_jobs")
      .update({
        status: "error" as JobStatus,
        error_message: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

async function runWorker(config: WorkerConfig): Promise<void> {
  console.log("Bolokono Worker starting...");
  console.log(`Polling interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`Analyzer version: ${ANALYZER_VERSION}`);

  startHealthServer();

  while (true) {
    try {
      const jobId = await claimJob(config);

      if (jobId) {
        await processJob(jobId, config);
      }
    } catch (error) {
      console.error("Worker loop error:", error);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Detect LLM provider from environment variables (priority: Anthropic > OpenAI > Gemini)
function detectLLMConfig(): { provider: LLMProvider; apiKey: string } | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY };
  }
  return null;
}

// Entry point
const llmConfig = detectLLMConfig();
const config: WorkerConfig = {
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  githubTokenEncryptionKey: process.env.GITHUB_TOKEN_ENCRYPTION_KEY,
  llmProvider: llmConfig?.provider,
  llmApiKey: llmConfig?.apiKey,
};

if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("  SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

runWorker(config).catch((error) => {
  console.error("Worker crashed:", error);
  process.exit(1);
});
