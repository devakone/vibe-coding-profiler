import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PublicProfileSettings } from "@/types/public-profile";
import { DEFAULT_PUBLIC_PROFILE_SETTINGS } from "@/types/public-profile";

export const runtime = "nodejs";

/**
 * GET /api/public/[username]/repo/[repoSlug]
 * Returns per-repo VCP data if the user has repo sharing enabled.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; repoSlug: string }> }
) {
  const { username, repoSlug } = await params;
  const service = createSupabaseServiceClient();

  // Fetch user
  const { data: user } = await service
    .from("users")
    .select("id, username, public_profile_settings")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const settings: PublicProfileSettings = {
    ...DEFAULT_PUBLIC_PROFILE_SETTINGS,
    ...(user.public_profile_settings as Partial<PublicProfileSettings> | null),
  };

  if (!settings.profile_enabled || !settings.show_repo_breakdown || !settings.show_repo_names) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Find the repo by matching the slug against connected repos
  const { data: userRepos } = await service
    .from("user_repos")
    .select("repo_id, repos(id, name, full_name)")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  if (!userRepos || userRepos.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Match repo by slug (lowercased name with non-alphanumeric replaced by hyphens)
  const matchedRepo = userRepos.find((ur) => {
    const repo = ur.repos as { name?: string } | null;
    if (!repo?.name) return false;
    const slug = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    return slug === repoSlug.toLowerCase();
  });

  if (!matchedRepo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const repo = matchedRepo.repos as { id: string; name: string; full_name: string };

  // Find the latest completed analysis job for this repo
  const { data: job } = await service
    .from("analysis_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("repo_id", matchedRepo.repo_id)
    .eq("status", "done")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "no_analysis" }, { status: 404 });
  }

  // Fetch vibe_insights for this job
  const { data: vibeInsight } = await service
    .from("vibe_insights")
    .select(
      "persona_id, persona_name, persona_tagline, persona_confidence, persona_score, axes_json, cards_json, evidence_json"
    )
    .eq("job_id", job.id)
    .maybeSingle();

  if (!vibeInsight) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const response = {
    username: user.username,
    repo_name: repo.name,
    repo_slug: repoSlug,
    persona_name: vibeInsight.persona_name,
    persona_id: vibeInsight.persona_id,
    persona_tagline: vibeInsight.persona_tagline,
    persona_confidence: vibeInsight.persona_confidence,
    persona_score: vibeInsight.persona_score,
    axes: vibeInsight.axes_json,
    cards: settings.show_insight_cards ? vibeInsight.cards_json : null,
    evidence: null, // Don't expose raw evidence publicly
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
