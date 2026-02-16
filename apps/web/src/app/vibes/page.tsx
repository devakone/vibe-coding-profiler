import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import VibesClient from "./VibesClient";

export const runtime = "nodejs";

export const metadata = {
  title: "Repo VCPs · Vibe Coding Profiler",
  description: "View your Vibe Coding Profiles organized by repository",
};

type JobRow = {
  id: string;
  repo_id: string;
  status: string;
  created_at: string;
};

type VibeInsightRow = {
  job_id: string;
  persona_name: string | null;
  persona_confidence: string | null;
  generated_at: string | null;
};

type LegacyInsightRow = {
  job_id: string;
  persona_label: string | null;
  persona_confidence: string | null;
  generated_at: string | null;
};

type MetricsRow = {
  job_id: string;
  commit_count: number | null;
};

export default async function VibesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch connected repos
  const { data: userReposData } = await supabase
    .from("user_repos")
    .select("repo_id, repos(id, full_name)")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  const userRepos = (userReposData ?? []) as unknown as Array<{
    repo_id: string;
    repos: { id: string; full_name: string } | null;
  }>;

  const connectedRepos = userRepos
    .filter((r) => r.repos?.full_name)
    .map((r) => ({
      repoId: r.repo_id,
      repoName: r.repos!.full_name,
    }));

  const repoIds = connectedRepos.map((r) => r.repoId);

  // Fetch all completed jobs for these repos
  const { data: jobsData } =
    repoIds.length > 0
      ? await supabase
          .from("analysis_jobs")
          .select("id, repo_id, status, created_at")
          .eq("user_id", user.id)
          .eq("status", "done")
          .in("repo_id", repoIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const jobs = (jobsData ?? []) as JobRow[];
  const jobIds = jobs.map((j) => j.id);

  // Fetch vibe insights (v2) for completed jobs
  const { data: vibeInsightsData } =
    jobIds.length > 0
      ? await supabase
          .from("vibe_insights")
          .select("job_id, persona_name, persona_confidence, generated_at")
          .in("job_id", jobIds)
      : { data: [] };

  const vibeInsightByJobId = new Map<string, VibeInsightRow>();
  for (const row of (vibeInsightsData ?? []) as VibeInsightRow[]) {
    vibeInsightByJobId.set(row.job_id, row);
  }

  // Find jobs missing from vibe_insights and fetch from legacy analysis_insights
  const missingJobIds = jobIds.filter((id) => !vibeInsightByJobId.has(id));
  const { data: legacyInsightsData } =
    missingJobIds.length > 0
      ? await supabase
          .from("analysis_insights")
          .select("job_id, persona_label, persona_confidence, generated_at")
          .in("job_id", missingJobIds)
      : { data: [] };

  const legacyInsightByJobId = new Map<string, LegacyInsightRow>();
  for (const row of (legacyInsightsData ?? []) as LegacyInsightRow[]) {
    legacyInsightByJobId.set(row.job_id, row);
  }

  // Fetch metrics for commit counts
  const { data: metricsData } =
    jobIds.length > 0
      ? await supabase
          .from("analysis_metrics")
          .select("job_id, commit_count")
          .in("job_id", jobIds)
      : { data: [] };

  const metricsByJobId = new Map<string, MetricsRow>();
  for (const row of (metricsData ?? []) as MetricsRow[]) {
    metricsByJobId.set(row.job_id, row);
  }

  // Group jobs by repo
  const jobsByRepoId = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const existing = jobsByRepoId.get(job.repo_id) ?? [];
    existing.push(job);
    jobsByRepoId.set(job.repo_id, existing);
  }

  // Build the repos data structure
  const repos = connectedRepos.map((repo) => {
    const repoJobs = jobsByRepoId.get(repo.repoId) ?? [];
    const versions = repoJobs.map((job) => {
      const vibeInsight = vibeInsightByJobId.get(job.id);
      const legacyInsight = legacyInsightByJobId.get(job.id);
      const metrics = metricsByJobId.get(job.id);

      // Use vibe_insights (v2) if available, fall back to analysis_insights (legacy)
      const personaLabel = vibeInsight?.persona_name ?? legacyInsight?.persona_label ?? null;
      const personaConfidence = vibeInsight?.persona_confidence ?? legacyInsight?.persona_confidence ?? null;
      const generatedAt = vibeInsight?.generated_at ?? legacyInsight?.generated_at ?? job.created_at;

      return {
        jobId: job.id,
        personaLabel,
        personaConfidence,
        commitCount: metrics?.commit_count ?? null,
        generatedAt,
      };
    });

    return {
      repoId: repo.repoId,
      repoName: repo.repoName,
      latestVibe: versions[0] ?? null,
      versions,
      isAnalyzed: versions.length > 0,
    };
  });

  // Sort: analyzed repos first, then by latest analysis date
  repos.sort((a, b) => {
    if (a.isAnalyzed && !b.isAnalyzed) return -1;
    if (!a.isAnalyzed && b.isAnalyzed) return 1;
    if (a.latestVibe && b.latestVibe) {
      return (
        new Date(b.latestVibe.generatedAt ?? 0).getTime() -
        new Date(a.latestVibe.generatedAt ?? 0).getTime()
      );
    }
    return a.repoName.localeCompare(b.repoName);
  });

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
              Repo VCPs
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Vibe Coding Profiles by Repo
            </h1>
            <p className="text-sm text-zinc-700 sm:text-base">
              Your VCPs organized by repository. Expand to see version history.
            </p>
          </div>
          <Link
            href="/settings/repos"
            className={wrappedTheme.primaryButtonSm}
          >
            + Add Repo
          </Link>
        </header>

        <VibesClient repos={repos} />
      </div>
    </div>
  );
}
