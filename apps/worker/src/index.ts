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

import { createServerClient } from "@bolokono/db";
import type { JobStatus } from "@bolokono/core";

const POLL_INTERVAL_MS = 5000;
const ANALYZER_VERSION = "0.1.0";

interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  githubToken?: string;
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
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("analysis_jobs")
      .select("*, repos(*)")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // TODO: Implement actual analysis logic
    // 1. Fetch commits from GitHub API
    // 2. Classify commits using @bolokono/core
    // 3. Compute metrics
    // 4. Generate narrative (optional)
    // 5. Write results

    console.log(`Job ${jobId} would analyze repo: ${job.repos?.full_name}`);

    // Mark job as done (placeholder)
    await supabase
      .from("analysis_jobs")
      .update({
        status: "done" as JobStatus,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`Job ${jobId} completed.`);
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
  githubToken: process.env.GITHUB_TOKEN,
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
