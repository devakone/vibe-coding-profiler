import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PublicProfileSettings } from "@/types/public-profile";
import { DEFAULT_PUBLIC_PROFILE_SETTINGS } from "@/types/public-profile";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";

interface PageProps {
  params: Promise<{ username: string }>;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8108";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await fetchPublicProfile(username);

  if (!data) {
    return { title: "Profile Not Found" };
  }

  const title = data.personaName
    ? `${data.personaName} - @${username}'s VCP`
    : `@${username}'s Vibe Coding Profile`;

  const description = data.personaTagline
    ?? `Discover @${username}'s AI coding style on Vibe Coding Profiler.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/u/${username}`,
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

async function fetchPublicProfile(username: string) {
  const service = createSupabaseServiceClient();

  const { data: user } = await service
    .from("users")
    .select("id, username, avatar_url, public_profile_settings")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!user) return null;

  const settings: PublicProfileSettings = {
    ...DEFAULT_PUBLIC_PROFILE_SETTINGS,
    ...(user.public_profile_settings as Partial<PublicProfileSettings> | null),
  };

  if (!settings.profile_enabled) return null;

  const { data: profile } = await service
    .from("user_profiles")
    .select(
      "persona_id, persona_name, persona_tagline, persona_confidence, persona_score, total_repos, total_commits, axes_json, cards_json, repo_personas_json, narrative_json"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const narrative = profile.narrative_json as { insight?: string; summary?: string } | null;

  // Build repo breakdown
  let repoBreakdown: Array<{
    repo_name: string;
    repo_slug: string;
    persona_name: string;
    persona_id: string;
    persona_tagline: string | null;
    commit_count: number;
  }> | null = null;

  if (settings.show_repo_breakdown) {
    const raw = profile.repo_personas_json as Array<{
      repo_name?: string;
      persona_name?: string;
      persona_id?: string;
      persona_tagline?: string | null;
      commit_count?: number;
    }> | null;

    if (raw && Array.isArray(raw)) {
      repoBreakdown = raw.map((r) => ({
        repo_name: settings.show_repo_names ? (r.repo_name ?? "Private Repo") : "Private Repo",
        repo_slug: settings.show_repo_names && r.repo_name
          ? r.repo_name.toLowerCase().replace(/[^a-z0-9-]/g, "-")
          : "",
        persona_name: r.persona_name ?? "Unknown",
        persona_id: r.persona_id ?? "unknown",
        persona_tagline: r.persona_tagline ?? null,
        commit_count: r.commit_count ?? 0,
      }));
    }
  }

  return {
    username: user.username ?? username,
    avatarUrl: settings.show_avatar ? user.avatar_url : null,
    personaName: settings.show_persona ? profile.persona_name : null,
    personaId: settings.show_persona ? profile.persona_id : null,
    personaTagline: settings.show_tagline ? profile.persona_tagline : null,
    personaConfidence: settings.show_confidence ? profile.persona_confidence : null,
    personaScore: profile.persona_score,
    totalRepos: settings.show_total_repos ? profile.total_repos : null,
    totalCommits: settings.show_total_commits ? profile.total_commits : null,
    axes: settings.show_axes_chart ? (profile.axes_json as Record<string, unknown> | null) : null,
    narrative: settings.show_narrative ? (narrative?.insight ?? narrative?.summary ?? null) : null,
    insightCards: settings.show_insight_cards ? (profile.cards_json as unknown[] | null) : null,
    repoBreakdown,
    settings,
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await fetchPublicProfile(username);

  if (!data) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PublicProfileView data={data} />
    </div>
  );
}
