"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { wrappedTheme } from "@/lib/theme";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useJobs } from "@/contexts/JobsContext";

type VibeVersion = {
  jobId: string;
  personaLabel: string | null;
  personaConfidence: string | null;
  commitCount: number | null;
  generatedAt: string | null;
};

type RepoVibe = {
  repoId: string;
  repoName: string;
  latestVibe: VibeVersion | null;
  versions: VibeVersion[];
  isAnalyzed: boolean;
};

interface VibesClientProps {
  repos: RepoVibe[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VibesClient({ repos }: VibesClientProps) {
  const router = useRouter();
  const { jobs, refreshJobs } = useJobs();
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);

  const activeJobRepoIds = new Set(
    jobs
      .filter((j) => j.status === "pending" || j.status === "running" || j.status === "queued")
      .map((j) => j.repoId)
      .filter((id): id is string => id !== null)
  );

  const toggleExpanded = (repoId: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  const startAnalysis = async (repoId: string, repoName: string) => {
    setLoadingRepoId(repoId);
    try {
      const res = await fetch("/api/analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });
      const data = (await res.json()) as { job_id?: string; error?: string };
      if (!res.ok || !data.job_id) {
        throw new Error(data.error || "Failed to start analysis");
      }
      toast({
        title: "Vibe check started",
        description: repoName,
        action: (
          <ToastAction
            altText="Open job"
            onClick={() => router.push(`/analysis/${data.job_id}`)}
          >
            Open
          </ToastAction>
        ),
      });
      await refreshJobs();
      router.refresh();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to start analysis",
        description: e instanceof Error ? e.message : "Please try again",
      });
    } finally {
      setLoadingRepoId(null);
    }
  };

  if (repos.length === 0) {
    return (
      <div className={`${wrappedTheme.card} p-8 text-center`}>
        <p className="text-zinc-600">No repos connected yet.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Connect a GitHub repository to discover your Vibe Coding Profile.
        </p>
        <Link
          href="/settings/repos"
          className={`${wrappedTheme.primaryButtonSm} mt-4 inline-block`}
        >
          Connect a Repo
        </Link>
      </div>
    );
  }

  return (
    <div className={`${wrappedTheme.card} overflow-hidden`}>
      <div className="divide-y divide-black/5">
        {repos.map((repo) => {
          const isExpanded = expandedRepos.has(repo.repoId);
          const isLoading = loadingRepoId === repo.repoId;
          const hasActiveJob = activeJobRepoIds.has(repo.repoId);
          const isBusy = isLoading || hasActiveJob;

          return (
            <div key={repo.repoId}>
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                {/* Expand button */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(repo.repoId)}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  disabled={repo.versions.length === 0}
                >
                  {repo.versions.length > 0 ? (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </button>

                {/* Repo info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {repo.repoName}
                  </p>
                  {repo.latestVibe ? (
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {repo.latestVibe.personaLabel ?? "Analyzing..."} ·{" "}
                      {repo.versions.length} version
                      {repo.versions.length !== 1 ? "s" : ""}
                      {repo.latestVibe.commitCount
                        ? ` · ${repo.latestVibe.commitCount} commits`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-zinc-500">Not analyzed yet</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {repo.latestVibe ? (
                    <>
                      <Link
                        href={`/analysis/${repo.latestVibe.jobId}`}
                        className={wrappedTheme.primaryButtonSm}
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => startAnalysis(repo.repoId, repo.repoName)}
                        disabled={isBusy}
                        className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
                      >
                        {hasActiveJob ? "Analyzing…" : isLoading ? "Starting..." : "Re-run"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startAnalysis(repo.repoId, repo.repoName)}
                      disabled={isBusy}
                      className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                    >
                      {hasActiveJob ? "Analyzing…" : isLoading ? "Starting..." : "Get Vibe"}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded version history */}
              {isExpanded && repo.versions.length > 0 && (
                <div className="border-t border-black/5 bg-zinc-50/50 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        <th className="pb-2 pl-10">Version</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Persona</th>
                        <th className="pb-2">Confidence</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {repo.versions.map((version, idx) => (
                        <tr key={version.jobId} className="text-zinc-700">
                          <td className="py-2 pl-10">v{repo.versions.length - idx}</td>
                          <td className="py-2">{formatDate(version.generatedAt)}</td>
                          <td className="py-2 font-medium text-zinc-900">
                            {version.personaLabel ?? "—"}
                          </td>
                          <td className="py-2">{version.personaConfidence ?? "—"}</td>
                          <td className="py-2 text-right">
                            <Link
                              href={`/analysis/${version.jobId}`}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
