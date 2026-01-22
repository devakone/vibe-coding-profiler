"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface UnifiedIdentitySectionProps {
  /** Persona name */
  personaName: string;
  /** Persona tagline */
  personaTagline?: string | null;
  /** Confidence level */
  confidence?: string;
  /** Total repos count */
  totalRepos?: number;
  /** Total commits count */
  totalCommits?: number;
  /** Clarity percentage (0-100) */
  clarity?: number;
  /** Number of completed analyses */
  completedJobs: number;
  /** Fallback persona (from latest job, if no profile) */
  latestPersona?: {
    label: string | null;
    confidence: string | null;
    repoName: string | null;
  } | null;
  /** Additional class names */
  className?: string;
}

/**
 * UnifiedIdentitySection - Main identity header for the Unified VCP
 *
 * Shows persona name, tagline, confidence, and stats. Styled with gradient background.
 */
export function UnifiedIdentitySection({
  personaName,
  personaTagline,
  confidence,
  totalRepos,
  totalCommits,
  clarity,
  completedJobs,
  latestPersona,
  className,
}: UnifiedIdentitySectionProps) {
  const hasProfile = Boolean(confidence && totalRepos);

  return (
    <div
      className={cn(
        "relative bg-gradient-to-br from-violet-500/8 via-indigo-500/5 to-violet-500/8 p-8 sm:p-10",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_50%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
            Your Unified VCP
          </p>
          <div className="flex flex-wrap gap-2">
            {completedJobs > 0 ? (
              <>
                <Link
                  href="/settings/repos"
                  className="rounded-full border border-black/10 bg-white/80 px-4 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-white"
                >
                  Add repo
                </Link>
                <Link
                  href="/vibes"
                  className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                >
                  View Repo VCPs
                </Link>
              </>
            ) : (
              <Link
                href="/settings/repos"
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800"
              >
                Pick a repo
              </Link>
            )}
          </div>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          {personaName}
        </h1>
        {personaTagline ? (
          <p className="mt-3 text-lg text-zinc-700">
            &ldquo;{personaTagline}&rdquo;
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          {hasProfile ? (
            <>
              <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-zinc-800 shadow-sm">
                {confidence} confidence
              </span>
              <span>{totalRepos} repos</span>
              <span>·</span>
              <span>{totalCommits?.toLocaleString()} commits</span>
              <span>·</span>
              <span>{clarity}% clarity</span>
            </>
          ) : latestPersona ? (
            <>
              <span className="rounded-full bg-white/80 px-3 py-1 font-medium text-zinc-800 shadow-sm">
                {latestPersona.confidence}
              </span>
              {latestPersona.repoName ? (
                <span>Based on {latestPersona.repoName}</span>
              ) : null}
            </>
          ) : (
            <span>Run a vibe check to get your first read</span>
          )}
        </div>
      </div>
    </div>
  );
}
