import type { VibeAxes } from "@vibe-coding-profiler/core";
import Link from "next/link";
import { PublicProfileCTA } from "./PublicProfileCTA";
import { UnifiedAxesSection } from "@/components/vcp/unified/UnifiedAxesSection";

interface PublicRepoProfileViewProps {
  data: {
    username: string;
    repoName: string;
    repoSlug: string;
    personaName: string;
    personaId: string;
    personaTagline: string | null;
    personaConfidence: string;
    personaScore: number;
    axes: Record<string, unknown> | null;
    cards: unknown[] | null;
  };
}

/**
 * Public per-repo VCP view.
 * Displays a single repo's persona and axes.
 */
export function PublicRepoProfileView({ data }: PublicRepoProfileViewProps) {
  const {
    username,
    repoName,
    personaName,
    personaTagline,
    personaConfidence,
    axes,
  } = data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/u/${username}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-600 transition hover:text-zinc-900"
      >
        &larr; Back to @{username}&apos;s profile
      </Link>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_25px_80px_rgba(30,27,75,0.06)]">
        {/* Identity */}
        <div className="relative bg-gradient-to-br from-violet-500/8 via-indigo-500/5 to-violet-500/8 p-8 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_50%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
              {repoName} &middot; @{username}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
              {personaName}
            </h1>
            {personaTagline ? (
              <p className="mt-3 text-lg text-zinc-700">
                &ldquo;{personaTagline}&rdquo;
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-3 text-sm text-zinc-600">
              <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-zinc-800 shadow-sm">
                {personaConfidence} confidence
              </span>
            </div>
          </div>
        </div>

        {/* Axes */}
        {axes ? <UnifiedAxesSection axes={axes as unknown as VibeAxes} /> : null}

        {/* CTA */}
        <div className="border-t border-black/5 p-8 sm:p-10">
          <PublicProfileCTA />
        </div>
      </div>
    </div>
  );
}
