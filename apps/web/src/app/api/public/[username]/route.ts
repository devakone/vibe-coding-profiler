import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PublicProfileSettings } from "@/types/public-profile";
import { DEFAULT_PUBLIC_PROFILE_SETTINGS } from "@/types/public-profile";
import type { AIToolMetrics } from "@vibed/core";

export const runtime = "nodejs";

/**
 * GET /api/public/[username]
 * Returns filtered public profile data for a username.
 * Unauthenticated — uses service role to query across RLS.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const service = createSupabaseServiceClient();

  // Fetch user with public profile enabled
  const { data: user, error: userError } = await service
    .from("users")
    .select("id, username, avatar_url, github_username, public_profile_settings")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const settings: PublicProfileSettings = {
    ...DEFAULT_PUBLIC_PROFILE_SETTINGS,
    ...(user.public_profile_settings as Partial<PublicProfileSettings> | null),
  };

  if (!settings.profile_enabled) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Fetch user profile
  const { data: profile } = await service
    .from("user_profiles")
    .select(
      "persona_id, persona_name, persona_tagline, persona_confidence, persona_score, total_repos, total_commits, axes_json, cards_json, repo_personas_json, narrative_json, job_ids"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "profile_not_available" }, { status: 404 });
  }

  // Filter response based on settings
  const axes = profile.axes_json as Record<string, unknown> | null;
  let clarity: number | null = null;
  if (axes) {
    const scores = Object.values(axes)
      .filter((v): v is { score: number } => typeof v === "object" && v !== null && "score" in v)
      .map((v) => v.score);
    if (scores.length > 0) {
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      clarity = Math.round(max - min);
    }
  }

  // Build repo breakdown with slugs
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

  const narrative = profile.narrative_json as { insight?: string; summary?: string } | null;

  // Aggregate AI tool metrics from vibe_insights
  let aiTools: AIToolMetrics | null = null;
  if (settings.show_ai_tools) {
    const jobIds = Array.isArray(profile.job_ids)
      ? (profile.job_ids as string[]).filter((id): id is string => typeof id === "string")
      : [];

    if (jobIds.length > 0) {
      const { data: vibeRows } = await service
        .from("vibe_insights")
        .select("ai_tools_json")
        .in("job_id", jobIds);

      if (vibeRows && vibeRows.length > 0) {
        const toolCounts = new Map<string, { name: string; count: number }>();
        let totalAiCommits = 0;

        for (const row of vibeRows) {
          const tools = row.ai_tools_json as AIToolMetrics | null;
          if (!tools || !tools.detected) continue;
          totalAiCommits += tools.ai_assisted_commits;
          for (const tool of tools.tools) {
            const existing = toolCounts.get(tool.tool_id);
            if (existing) {
              existing.count += tool.commit_count;
            } else {
              toolCounts.set(tool.tool_id, { name: tool.tool_name, count: tool.commit_count });
            }
          }
        }

        if (toolCounts.size > 0) {
          const totalCommits = profile.total_commits ?? 0;
          const tools = Array.from(toolCounts.entries())
            .map(([id, data]) => ({
              tool_id: id,
              tool_name: data.name,
              commit_count: data.count,
              percentage: totalAiCommits > 0 ? Math.round((data.count / totalAiCommits) * 100) : 0,
            }))
            .sort((a, b) => b.commit_count - a.commit_count);

          aiTools = {
            detected: true,
            ai_assisted_commits: totalAiCommits,
            ai_collaboration_rate: totalCommits > 0 ? totalAiCommits / totalCommits : 0,
            primary_tool: { id: tools[0].tool_id, name: tools[0].tool_name },
            tool_diversity: tools.length,
            tools,
            confidence: totalAiCommits >= 10 ? "high" : totalAiCommits >= 3 ? "medium" : "low",
          };
        }
      }
    }
  }

  const response = {
    username: user.username,
    avatar_url: settings.show_avatar ? user.avatar_url : null,
    persona_name: settings.show_persona ? profile.persona_name : null,
    persona_id: settings.show_persona ? profile.persona_id : null,
    persona_tagline: settings.show_tagline ? profile.persona_tagline : null,
    persona_confidence: settings.show_confidence ? profile.persona_confidence : null,
    persona_score: profile.persona_score,
    total_repos: settings.show_total_repos ? profile.total_repos : null,
    total_commits: settings.show_total_commits ? profile.total_commits : null,
    axes: settings.show_axes_chart ? axes : null,
    clarity: settings.show_axes_chart ? clarity : null,
    narrative: settings.show_narrative ? (narrative?.insight ?? narrative?.summary ?? null) : null,
    insight_cards: settings.show_insight_cards ? (profile.cards_json as unknown[] | null) : null,
    repo_breakdown: repoBreakdown,
    ai_tools: aiTools,
    settings,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
