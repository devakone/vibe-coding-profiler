import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";

type AnalysisJobsInsertQuery = {
  insert: (values: unknown) => AnalysisJobsInsertQuery;
  select: (columns: string) => AnalysisJobsInsertQuery;
  single: () => Promise<{ data: unknown | null; error: unknown | null }>;
};

type SupabaseInsertLike = {
  from: (table: string) => AnalysisJobsInsertQuery;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { repo_id: string };
  if (!body?.repo_id) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { data, error } = await (supabase as unknown as SupabaseInsertLike)
    .from("analysis_jobs")
    .insert([
      {
        user_id: user.id,
        repo_id: body.repo_id,
        analyzer_version: "0.2.0-inngest",
        status: "queued",
      },
    ])
    .select("id")
    .single();

  const row = data as { id: string } | null;

  if (error || !row) {
    return NextResponse.json({ error: "job_create_failed" }, { status: 500 });
  }

  // Trigger Inngest function to process the job
  // This runs async - the job will be picked up by Inngest
  try {
    await inngest.send({
      name: "repo/analyze.requested",
      data: {
        jobId: row.id,
        userId: user.id,
        repoId: body.repo_id,
      },
    });
  } catch (inngestError) {
    console.error("Failed to trigger Inngest:", inngestError);
    // Don't fail the request - job is created, worker can pick it up as fallback
  }

  return NextResponse.json({ job_id: row.id });
}
