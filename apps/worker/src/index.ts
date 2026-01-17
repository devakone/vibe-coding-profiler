/**
 * Bolokono Worker
 *
 * Background job processor for git analysis.
 *
 * This worker:
 * 1. Polls the analysis_jobs table for queued jobs
 * 2. Claims a job using FOR UPDATE SKIP LOCKED
 * 3. Fetches commits from GitHub API (or clones for deep analysis)
 * 4. Computes metrics using @bolokono/core
 * 5. Optionally generates narrative via LLM
 * 6. Writes results back to database
 */

import { createServerClient, type Json } from "@bolokono/db";
import {
  assignBolokonoType,
  computeAnalysisInsights,
  computeAnalysisMetrics,
  decryptString,
  type AnalysisReport,
  type CommitEvent,
  type JobStatus,
} from "@bolokono/core";
import { fetchCommitDetail, fetchCommitList, mapWithConcurrency } from "./github";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  anthropicApiKey?: string;
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
    const assignment = assignBolokonoType(metrics);
    const insights = computeAnalysisInsights(events);

    const report: AnalysisReport = {
      bolokono_type: assignment.bolokono_type,
      confidence: assignment.confidence,
      matched_criteria: assignment.matched_criteria,
      narrative: {
        summary: `Analyzed ${metrics.total_commits} commits over ${metrics.active_days} active days across ${metrics.span_days} days.`,
        sections: [
          {
            title: "Build rhythm",
            content: `Median gap between commits: ${metrics.hours_between_commits_p50.toFixed(
              1
            )}h. Burstiness score: ${metrics.burstiness_score.toFixed(2)}.`,
            evidence: events.slice(0, 3).map((e) => e.sha),
          },
          {
            title: "Iteration",
            content: `Fix ratio: ${(metrics.fix_commit_ratio * 100).toFixed(
              0
            )}%. Fix-after-feature sequences: ${metrics.fixup_sequence_count}.`,
            evidence: events.slice(0, 3).map((e) => e.sha),
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
      },
    };

    await supabase.from("analysis_metrics").upsert(
      [
        {
          job_id: jobId,
          metrics_json: metrics as unknown as Json,
          events_json: events as unknown as Json,
        },
      ],
      { onConflict: "job_id" }
    );

    await supabase.from("analysis_reports").upsert(
      [
        {
          job_id: jobId,
          bolokono_type: report.bolokono_type,
          narrative_json: report.narrative as unknown as Json,
          evidence_json: report.matched_criteria as unknown as Json,
          llm_model: "none",
        },
      ],
      { onConflict: "job_id" }
    );

    await supabase.from("analysis_insights").upsert(
      [
        {
          job_id: jobId,
          insights_json: insights as unknown as Json,
          generator_version: ANALYZER_VERSION,
          persona_id: insights.persona.id,
          persona_label: insights.persona.label,
          persona_confidence: insights.persona.confidence,
          tech_signals: insights.tech_signals,
          share_template: insights.share_template,
          persona_delta: insights.persona_delta,
          sources: insights.sources,
        },
      ],
      { onConflict: "job_id" }
    );

    await supabase
      .from("analysis_jobs")
      .update({
        status: "done" as JobStatus,
        commit_count: events.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

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

// Entry point
const config: WorkerConfig = {
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  githubTokenEncryptionKey: process.env.GITHUB_TOKEN_ENCRYPTION_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
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
