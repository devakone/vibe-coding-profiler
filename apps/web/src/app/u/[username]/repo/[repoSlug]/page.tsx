import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PublicProfileSettings } from "@/types/public-profile";
import { DEFAULT_PUBLIC_PROFILE_SETTINGS } from "@/types/public-profile";
import { PublicRepoProfileView } from "@/components/public-profile/PublicRepoProfileView";

interface PageProps {
  params: Promise<{ username: string; repoSlug: string }>;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8108";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, repoSlug } = await params;
  const data = await fetchRepoProfile(username, repoSlug);

  if (!data) {
    return { title: "Repo Profile Not Found" };
  }

  const title = `${data.personaName} - ${data.repoName} - @${username}'s VCP`;
  const description = data.personaTagline
    ?? `@${username}'s coding style on ${data.repoName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/u/${username}/repo/${repoSlug}`,
      type: "profile",
      images: [
        {
          url: `${appUrl}/api/og/u/${username}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/api/og/u/${username}`],
    },
  };
}

async function fetchRepoProfile(username: string, repoSlug: string) {
  const service = createSupabaseServiceClient();

  const { data: user } = await service
    .from("users")
    .select("id, username, public_profile_settings")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!user) return null;

  const settings: PublicProfileSettings = {
    ...DEFAULT_PUBLIC_PROFILE_SETTINGS,
    ...(user.public_profile_settings as Partial<PublicProfileSettings> | null),
  };

  if (!settings.profile_enabled || !settings.show_repo_breakdown || !settings.show_repo_names) {
    return null;
  }

  // Find matching repo
  const { data: userRepos } = await service
    .from("user_repos")
    .select("repo_id, repos(id, name, full_name)")
    .eq("user_id", user.id)
    .is("disconnected_at", null);

  if (!userRepos) return null;

  const matched = userRepos.find((ur) => {
    const repo = ur.repos as { name?: string } | null;
    if (!repo?.name) return false;
    return repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-") === repoSlug.toLowerCase();
  });

  if (!matched) return null;

  const repo = matched.repos as { name: string; full_name: string };

  // Latest completed job for this repo
  const { data: job } = await service
    .from("analysis_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("repo_id", matched.repo_id)
    .eq("status", "done")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) return null;

  const { data: vibeInsight } = await service
    .from("vibe_insights")
    .select(
      "persona_id, persona_name, persona_tagline, persona_confidence, persona_score, axes_json, cards_json"
    )
    .eq("job_id", job.id)
    .maybeSingle();

  if (!vibeInsight) return null;

  return {
    username: user.username ?? username,
    repoName: repo.name,
    repoSlug,
    personaName: vibeInsight.persona_name,
    personaId: vibeInsight.persona_id,
    personaTagline: vibeInsight.persona_tagline,
    personaConfidence: vibeInsight.persona_confidence,
    personaScore: vibeInsight.persona_score,
    axes: vibeInsight.axes_json as Record<string, unknown> | null,
    cards: settings.show_insight_cards ? (vibeInsight.cards_json as unknown[] | null) : null,
  };
}

export default async function PublicRepoProfilePage({ params }: PageProps) {
  const { username, repoSlug } = await params;
  const data = await fetchRepoProfile(username, repoSlug);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PublicRepoProfileView data={data} />
    </div>
  );
}
