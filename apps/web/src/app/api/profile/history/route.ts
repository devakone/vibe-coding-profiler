import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ProfileHistoryRow {
  id: string;
  version_number: number | null;
  trigger_job_id: string | null;
  llm_model: string | null;
  llm_key_source: string | null;
  created_at: string;
  profile_snapshot: {
    persona?: {
      id: string;
      name: string;
      tagline?: string;
    };
    totalCommits?: number;
    totalRepos?: number;
  };
}

/**
 * GET /api/profile/history
 * List all profile history versions for the current user.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from("user_profile_history")
    .select("id, version_number, trigger_job_id, llm_model, llm_key_source, created_at, profile_snapshot")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching profile history:", error);
    return NextResponse.json({ error: "failed_to_fetch_history" }, { status: 500 });
  }

  const history = (data ?? []) as ProfileHistoryRow[];

  // Get trigger job details for context
  const triggerJobIds = history
    .map((h) => h.trigger_job_id)
    .filter((id): id is string => Boolean(id));

  const jobDetails: Map<string, { repo_name: string }> = new Map();
  if (triggerJobIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: jobsData } = await (service as any)
      .from("analysis_jobs")
      .select("id, repos(full_name)")
      .in("id", triggerJobIds);

    if (jobsData) {
      for (const job of jobsData) {
        const repoName = (job.repos as { full_name: string } | null)?.full_name ?? "Unknown";
        jobDetails.set(job.id, { repo_name: repoName });
      }
    }
  }

  // Format response
  const versions = history.map((h) => {
    const snapshot = h.profile_snapshot ?? {};
    return {
      id: h.id,
      version: h.version_number ?? 0,
      createdAt: h.created_at,
      triggerJobId: h.trigger_job_id,
      triggerRepoName: h.trigger_job_id ? jobDetails.get(h.trigger_job_id)?.repo_name : null,
      llmModel: h.llm_model,
      llmKeySource: h.llm_key_source,
      persona: snapshot.persona
        ? {
            id: snapshot.persona.id,
            name: snapshot.persona.name,
            tagline: snapshot.persona.tagline,
          }
        : null,
      totalCommits: snapshot.totalCommits ?? 0,
      totalRepos: snapshot.totalRepos ?? 0,
    };
  });

  return NextResponse.json({ versions });
}
