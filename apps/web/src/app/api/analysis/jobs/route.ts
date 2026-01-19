import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch all jobs for the user
  const { data: jobs, error: jobsError } = await supabase
    .from("analysis_jobs")
    .select("id, status, created_at, started_at, completed_at, repo_id, error_message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("Failed to fetch jobs:", jobsError);
    return NextResponse.json({ error: "failed_to_fetch" }, { status: 500 });
  }

  type JobRow = {
    id: string;
    status: string;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    repo_id: string | null;
    error_message: string | null;
  };

  const jobList = (jobs ?? []) as unknown as JobRow[];

  // Get repo names for all jobs
  const repoIds = Array.from(
    new Set(jobList.map((j) => j.repo_id).filter((id): id is string => Boolean(id)))
  );

  let repoNameById: Record<string, string> = {};
  if (repoIds.length > 0) {
    const { data: repos } = await supabase
      .from("repos")
      .select("id, full_name")
      .in("id", repoIds);

    type RepoRow = { id: string; full_name: string };
    for (const repo of (repos ?? []) as RepoRow[]) {
      repoNameById[repo.id] = repo.full_name;
    }
  }

  return NextResponse.json({
    jobs: jobList.map((j) => ({
      id: j.id,
      status: j.status,
      createdAt: j.created_at,
      startedAt: j.started_at,
      completedAt: j.completed_at,
      repoId: j.repo_id,
      repoName: j.repo_id ? repoNameById[j.repo_id] ?? null : null,
      errorMessage: j.error_message ?? null,
    })),
  });
}
