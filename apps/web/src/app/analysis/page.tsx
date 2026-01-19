import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wrappedTheme } from "@/lib/theme";
import AnalysisListClient from "./AnalysisListClient";

export const runtime = "nodejs";

type JobRow = {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  repo_id: string;
  error_message: string | null;
};

type InsightRow = {
  job_id: string;
  persona_label: string | null;
  persona_confidence: string | null;
  generated_at: string | null;
};

export default async function AnalysisIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all jobs
  const { data: jobsData } = await supabase
    .from("analysis_jobs")
    .select("id, status, created_at, started_at, completed_at, repo_id, error_message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const jobs = (jobsData ?? []) as unknown as JobRow[];

  // Get repo names
  const repoIds = Array.from(
    new Set(jobs.map((j) => j.repo_id).filter((id): id is string => Boolean(id)))
  );

  const repoNames =
    repoIds.length > 0
      ? await supabase.from("repos").select("id, full_name").in("id", repoIds)
      : null;

  const repoNameById = new Map<string, string>();
  for (const row of (repoNames?.data ?? []) as Array<{ id: string; full_name: string }>) {
    repoNameById.set(row.id, row.full_name);
  }

  // Get insights for completed jobs
  const jobIds = jobs.map((j) => j.id);
  const insightsResult =
    jobIds.length > 0
      ? await supabase
          .from("analysis_insights")
          .select("job_id, persona_label, persona_confidence, generated_at")
          .in("job_id", jobIds)
      : null;

  const insightByJobId = new Map<string, InsightRow>();
  for (const row of (insightsResult?.data ?? []) as InsightRow[]) {
    insightByJobId.set(row.job_id, row);
  }

  // Build reports list (completed jobs, with insight data when available)
  const reports = jobs
    .filter((j) => j.status === "done")
    .map((j) => {
      const insight = insightByJobId.get(j.id);
      return {
        jobId: j.id,
        repoId: j.repo_id,
        repoName: repoNameById.get(j.repo_id) ?? null,
        personaLabel: insight?.persona_label ?? null,
        personaConfidence: insight?.persona_confidence ?? null,
        generatedAt: insight?.generated_at ?? j.created_at,
        status: j.status,
      };
    });

  // Build jobs list
  const jobsList = jobs.map((j) => ({
    id: j.id,
    status: j.status,
    createdAt: j.created_at,
    startedAt: j.started_at,
    completedAt: j.completed_at,
    repoId: j.repo_id,
    repoName: repoNameById.get(j.repo_id) ?? null,
    errorMessage: j.error_message,
  }));

  return (
    <div className={`${wrappedTheme.container} py-10`}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-600">
            Vibed Repos
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Your Vibed Repos
          </h1>
          <p className="max-w-2xl text-sm text-zinc-700 sm:text-base">
            Each vibed repo reveals your coding persona, confidence level, and the evidence behind it.
          </p>
        </header>

<AnalysisListClient initialReports={reports} initialJobs={jobsList} />
      </div>
    </div>
  );
}
