import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/profile/history/[id]
 * Get a specific profile history version by ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    .select("id, user_id, version_number, trigger_job_id, llm_model, llm_key_source, created_at, profile_snapshot")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Ensure user can only access their own history
  if (data.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Get trigger job details
  let triggerRepoName: string | null = null;
  if (data.trigger_job_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: jobData } = await (service as any)
      .from("analysis_jobs")
      .select("repos(full_name)")
      .eq("id", data.trigger_job_id)
      .single();

    if (jobData?.repos) {
      triggerRepoName = (jobData.repos as { full_name: string }).full_name;
    }
  }

  return NextResponse.json({
    id: data.id,
    version: data.version_number ?? 0,
    createdAt: data.created_at,
    triggerJobId: data.trigger_job_id,
    triggerRepoName,
    llmModel: data.llm_model,
    llmKeySource: data.llm_key_source,
    profile: data.profile_snapshot,
  });
}
