"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProfileContribution {
  repoName: string | null;
  jobCommitCount: number | null;
  includedInProfile: boolean | null;
  profileTotalCommits: number | null;
  profileTotalRepos: number | null;
  profilePersonaName: string | null;
  profileUpdatedAt: string | null;
}

interface ProfileContributionCardProps {
  /** Profile contribution data */
  contribution: ProfileContribution;
  /** Whether profile is being rebuilt */
  isRebuilding?: boolean;
  /** Rebuild status message */
  rebuildStatus?: "idle" | "success" | "error";
  /** Callback to trigger profile rebuild */
  onRebuild?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * ProfileContributionCard - Shows how this repo contributes to the unified profile
 */
export function ProfileContributionCard({
  contribution,
  isRebuilding = false,
  rebuildStatus = "idle",
  onRebuild,
  className,
}: ProfileContributionCardProps) {
  const {
    repoName,
    jobCommitCount,
    includedInProfile,
    profileTotalCommits,
    profileTotalRepos,
    profilePersonaName,
  } = contribution;

  const contributionPercent =
    jobCommitCount && profileTotalCommits && profileTotalCommits > 0
      ? Math.round((jobCommitCount / profileTotalCommits) * 100)
      : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-gradient-to-r from-violet-50 to-indigo-50 p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Profile Contribution
          </p>
          {includedInProfile ? (
            <p className="mt-2 text-sm text-zinc-700">
              This repo contributes{" "}
              <span className="font-semibold text-violet-700">
                {contributionPercent !== null ? `${contributionPercent}%` : "—"}
              </span>{" "}
              of your{" "}
              <Link href="/" className="font-medium text-violet-700 underline underline-offset-2">
                Unified VCP
              </Link>
              {profilePersonaName ? (
                <span className="text-zinc-600">
                  {" "}
                  (currently: <strong>{profilePersonaName}</strong>)
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-700">
              This analysis is not yet part of your Unified VCP.
            </p>
          )}
          {profileTotalRepos ? (
            <p className="mt-1 text-xs text-zinc-500">
              {profileTotalRepos} repos · {profileTotalCommits?.toLocaleString()} commits total
            </p>
          ) : null}
        </div>

        {onRebuild && !includedInProfile ? (
          <button
            onClick={onRebuild}
            disabled={isRebuilding}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
              isRebuilding
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                : "bg-violet-600 text-white hover:bg-violet-700"
            )}
          >
            {isRebuilding ? "Rebuilding..." : "Add to Profile"}
          </button>
        ) : null}
      </div>

      {rebuildStatus === "success" ? (
        <p className="mt-3 text-xs font-medium text-green-600">
          Profile updated successfully!
        </p>
      ) : rebuildStatus === "error" ? (
        <p className="mt-3 text-xs font-medium text-red-600">
          Failed to update profile. Please try again.
        </p>
      ) : null}
    </div>
  );
}
