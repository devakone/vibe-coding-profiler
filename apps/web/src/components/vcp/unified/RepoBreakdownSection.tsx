"use client";

import { cn } from "@/lib/utils";

interface RepoPersona {
  repoName: string;
  personaId: string;
  personaName: string;
  commitCount: number;
}

interface RepoBreakdownSectionProps {
  /** List of repo personas */
  repoPersonas: RepoPersona[];
  /** Total commits across all repos (for percentage calculation) */
  totalCommits: number;
  /** Additional class names */
  className?: string;
}

/**
 * RepoBreakdownSection - Shows how each repo contributes to the unified profile
 *
 * Displays repo names, personas, commit counts, and contribution percentages
 */
export function RepoBreakdownSection({
  repoPersonas,
  totalCommits,
  className,
}: RepoBreakdownSectionProps) {
  if (repoPersonas.length === 0) {
    return null;
  }

  return (
    <div className={cn("border-t border-black/5 p-8 sm:p-10", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        Repo Breakdown
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Each repo contributes to your profile, weighted by commits
      </p>

      <div className="mt-6 space-y-3">
        {repoPersonas.map((repo, i) => {
          const percentage = Math.round(
            (repo.commitCount / Math.max(totalCommits, 1)) * 100
          );
          return (
            <div key={`${repo.repoName}-${i}`} className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {repo.repoName}
                  </p>
                  <span className="ml-2 text-xs text-zinc-500">{percentage}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {repo.personaName} · {repo.commitCount.toLocaleString()} commits
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
