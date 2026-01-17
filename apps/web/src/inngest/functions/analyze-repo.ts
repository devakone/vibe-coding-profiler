import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import {
  assignVibeType,
  computeAnalysisInsights,
  computeAnalysisMetrics,
  computeVibeFromCommits,
  decryptString,
  type AnalysisReport,
  type CommitEvent,
  type JobStatus,
  type VibeCommitEvent,
} from "@vibed/core";

const ANALYZER_VERSION = "0.2.0-inngest";

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
    const { job, repo, githubToken } = await step.run("load-job-context", async () => {
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
      } catch (compareError) {
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
      const report: AnalysisReport = {
        vibe_type: assignment.vibe_type,
        confidence: assignment.confidence,
        matched_criteria: assignment.matched_criteria,
        narrative: {
          summary: `Analyzed ${metrics.total_commits} commits over ${metrics.active_days} active days.`,
          sections: [
            {
              title: "Build rhythm",
              content: `Median gap between commits: ${metrics.hours_between_commits_p50.toFixed(1)}h. Burstiness score: ${metrics.burstiness_score.toFixed(2)}.`,
              evidence: events.slice(0, 3).map((e) => e.sha),
            },
            {
              title: "Iteration",
              content: `Fix ratio: ${(metrics.fix_commit_ratio * 100).toFixed(0)}%. Fix-after-feature sequences: ${metrics.fixup_sequence_count}.`,
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
          ],
        },
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

      // Save report
      const { error: reportError } = await supabase.from("analysis_reports").upsert(
        {
          job_id: jobId,
          vibe_type: report.vibe_type,
          narrative_json: report.narrative,
          evidence_json: report.matched_criteria,
          llm_model: "none",
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

    return {
      jobId,
      commitCount: events.length,
      persona: vibeInsights.persona.name,
      confidence: vibeInsights.persona.confidence,
    };
  }
);
