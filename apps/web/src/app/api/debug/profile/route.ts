import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { detectVibePersona, type VibeAxes } from "@vibed/core";

export const runtime = "nodejs";

type UserProfileRow = {
  total_commits: number | null;
  total_repos: number | null;
  job_ids: unknown;
  repo_personas_json: unknown;
  axes_json: unknown;
  updated_at: string | null;
  persona_id: string | null;
  persona_name: string | null;
  persona_tagline: string | null;
  persona_confidence: string | null;
  persona_score: number | null;
};

type DoneJobRow = {
  id: string;
  repo_id: string;
  commit_count: number | null;
  completed_at: string | null;
  created_at: string;
};

type UserRepoRow = {
  repo_id: string;
  connected_at: string;
  disconnected_at: string | null;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: profileData }, { data: userReposData }, { data: jobsData }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select(
        "total_commits, total_repos, job_ids, repo_personas_json, axes_json, updated_at, persona_id, persona_name, persona_tagline, persona_confidence, persona_score"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_repos")
      .select("repo_id, connected_at, disconnected_at")
      .eq("user_id", user.id),
    supabase
      .from("analysis_jobs")
      .select("id, repo_id, commit_count, completed_at, created_at")
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("created_at", { ascending: false }),
  ]);

  const profile = (profileData ?? null) as unknown as UserProfileRow | null;
  const userRepos = (userReposData ?? []) as unknown as UserRepoRow[];
  const doneJobs = (jobsData ?? []) as unknown as DoneJobRow[];

  const disconnectedRepoIds = new Set(
    userRepos.filter((r) => r.disconnected_at != null).map((r) => r.repo_id)
  );
  const connectedRepoIds = new Set(
    userRepos.filter((r) => r.disconnected_at == null).map((r) => r.repo_id)
  );

  const includedDoneJobs = doneJobs.filter((j) => !disconnectedRepoIds.has(j.repo_id));
  const distinctIncludedRepoIds = new Set(includedDoneJobs.map((j) => j.repo_id));

  const profileJobIds = Array.isArray(profile?.job_ids)
    ? profile?.job_ids.filter((v): v is string => typeof v === "string")
    : null;

  const profileRepoPersonas = Array.isArray(profile?.repo_personas_json)
    ? profile?.repo_personas_json.filter((v): v is unknown => typeof v === "object" && v !== null)
    : null;

  const includedDoneJobIds = new Set(includedDoneJobs.map((j) => j.id));
  const profileJobIdSet = new Set(profileJobIds ?? []);

  const missingFromProfile = includedDoneJobs.map((j) => j.id).filter((id) => !profileJobIdSet.has(id));
  const extraInProfile = (profileJobIds ?? []).filter((id) => !includedDoneJobIds.has(id));

  const commitCountSum = includedDoneJobs.reduce((s, j) => s + (typeof j.commit_count === "number" ? j.commit_count : 0), 0);
  const jobsMissingCommitCount = includedDoneJobs.filter((j) => j.commit_count == null).map((j) => j.id);

  const latestCompletedAt = includedDoneJobs.find((j) => typeof j.completed_at === "string")?.completed_at ?? null;

  const isAxisValue = (v: unknown): v is { score: number; level: string; why: string[] } => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    if (typeof r.score !== "number") return false;
    if (typeof r.level !== "string") return false;
    if (!Array.isArray(r.why)) return false;
    return r.why.every((id) => typeof id === "string");
  };

  const isVibeAxes = (v: unknown): v is VibeAxes => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    return (
      isAxisValue(r.automation_heaviness) &&
      isAxisValue(r.guardrail_strength) &&
      isAxisValue(r.iteration_loop_intensity) &&
      isAxisValue(r.planning_signal) &&
      isAxisValue(r.surface_area_per_change) &&
      isAxisValue(r.shipping_rhythm)
    );
  };

  const computedPersonaFromProfileAxes =
    profile && isVibeAxes(profile.axes_json)
      ? (() => {
          const totalCommits = profile.total_commits ?? 0;
          const totalRepos = profile.total_repos ?? 0;
          const repoFactor = Math.min(1, totalRepos / 5);
          const commitFactor = Math.min(1, totalCommits / 500);
          const dataQualityScore = Math.round(100 * (0.4 * repoFactor + 0.6 * commitFactor));

          return detectVibePersona(profile.axes_json, {
            commitCount: totalCommits,
            prCount: 0,
            dataQualityScore,
          });
        })()
      : null;

  return NextResponse.json({
    user: { id: user.id, email: user.email ?? null },
    userRepos: {
      totalRows: userRepos.length,
      connectedCount: connectedRepoIds.size,
      disconnectedCount: disconnectedRepoIds.size,
    },
    analysisJobs: {
      doneCount: doneJobs.length,
      includedDoneCount: includedDoneJobs.length,
      distinctIncludedRepos: distinctIncludedRepoIds.size,
      commitCountSum,
      jobsMissingCommitCount,
      latestCompletedAt,
    },
    userProfile: profile
      ? {
          personaId: profile.persona_id,
          personaName: profile.persona_name,
          personaTagline: profile.persona_tagline,
          personaConfidence: profile.persona_confidence,
          personaScore: profile.persona_score,
          totalRepos: profile.total_repos,
          totalCommits: profile.total_commits,
          jobIdsCount: profileJobIds?.length ?? null,
          repoPersonasCount: profileRepoPersonas?.length ?? null,
          updatedAt: profile.updated_at,
        }
      : null,
    computedPersonaFromProfileAxes,
    diffs: {
      missingFromProfile,
      extraInProfile,
    },
  });
}
