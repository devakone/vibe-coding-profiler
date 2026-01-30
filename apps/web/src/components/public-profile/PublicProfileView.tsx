import type { VibeAxes, AIToolMetrics } from "@vibed/core";
import type { PublicProfileSettings } from "@/types/public-profile";
import { PublicIdentityHeader } from "./PublicIdentityHeader";
import { PublicProfileCTA } from "./PublicProfileCTA";
import { UnifiedAxesSection } from "@/components/vcp/unified/UnifiedAxesSection";
import { VCPAIToolsSection } from "@/components/vcp/blocks";
import Link from "next/link";

interface PublicProfileViewProps {
  data: {
    username: string;
    avatarUrl: string | null;
    personaName: string | null;
    personaId: string | null;
    personaTagline: string | null;
    personaConfidence: string | null;
    personaScore: number;
    totalRepos: number | null;
    totalCommits: number | null;
    axes: Record<string, unknown> | null;
    narrative: string | null;
    insightCards: unknown[] | null;
    repoBreakdown: Array<{
      repo_name: string;
      repo_slug: string;
      persona_name: string;
      persona_id: string;
      persona_tagline: string | null;
      commit_count: number;
    }> | null;
    aiTools: AIToolMetrics | null;
    settings: PublicProfileSettings;
  };
}

/**
 * Public profile view component.
 * Composes existing VCP blocks with visibility gating based on settings.
 */
export function PublicProfileView({ data }: PublicProfileViewProps) {
  const {
    username,
    avatarUrl,
    personaName,
    personaTagline,
    personaConfidence,
    totalRepos,
    totalCommits,
    axes,
    narrative,
    repoBreakdown,
    aiTools,
    settings,
  } = data;

  return (
    <div className="space-y-0 overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_25px_80px_rgba(30,27,75,0.06)]">
      {/* Identity header - always visible */}
      <PublicIdentityHeader
        username={username}
        personaName={personaName}
        personaTagline={personaTagline}
        personaConfidence={personaConfidence}
        avatarUrl={avatarUrl}
        totalRepos={totalRepos}
        totalCommits={totalCommits}
      />

      {/* Axes chart */}
      {settings.show_axes_chart && axes ? (
        <UnifiedAxesSection axes={axes as unknown as VibeAxes} />
      ) : null}

      {/* AI coding tools — highlighted section */}
      {settings.show_ai_tools && aiTools?.detected ? (
        <div className="border-t border-black/5 px-8 py-6 sm:px-10">
          <VCPAIToolsSection aiTools={aiTools} />
        </div>
      ) : null}

      {/* Narrative insight */}
      {settings.show_narrative && narrative ? (
        <div className="border-t border-black/5 px-8 py-6 sm:px-10">
          <div className="rounded-xl border-l-4 border-l-violet-500 bg-violet-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600">
              Insight
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed text-slate-800">
              {narrative}
            </p>
          </div>
        </div>
      ) : null}

      {/* Repo breakdown */}
      {settings.show_repo_breakdown && repoBreakdown && repoBreakdown.length > 0 ? (
        <div className="border-t border-black/5 p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
            Repo Breakdown
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            How each repo contributes to the overall profile
          </p>
          <div className="mt-6 space-y-3">
            {repoBreakdown.map((repo, i) => {
              const total = totalCommits ?? 1;
              const percentage = Math.round(
                (repo.commit_count / Math.max(total, 1)) * 100
              );
              const isLinked = settings.show_repo_names && repo.repo_slug;
              return (
                <div key={`${repo.repo_name}-${i}`} className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      {isLinked ? (
                        <Link
                          href={`/u/${username}/repo/${repo.repo_slug}`}
                          className="truncate text-sm font-medium text-violet-700 hover:text-violet-900 hover:underline"
                        >
                          {repo.repo_name}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {repo.repo_name}
                        </p>
                      )}
                      <span className="ml-2 text-xs text-zinc-500">{percentage}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {repo.persona_name} &middot; {repo.commit_count.toLocaleString()} commits
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* CTA */}
      <div className="border-t border-black/5 p-8 sm:p-10">
        <PublicProfileCTA />
      </div>
    </div>
  );
}
