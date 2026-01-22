"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { wrappedTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/components/ui/use-toast";

type GithubRepo = {
  id: number;
  owner: { login: string };
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  pushed_at?: string | null;
  updated_at?: string;
  language?: string | null;
  archived?: boolean;
  fork?: boolean;
};

type ConnectedRepo = {
  repo_id: string;
  full_name: string;
};

const GITHUB_REPO_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

type PendingJob = {
  jobId: string;
  repoName: string | null;
};

export default function ReposClient(props: {
  userId: string;
  initialConnected: ConnectedRepo[];
  latestJobByRepoId: Record<string, string>;
}) {
  const router = useRouter();
  const { userId, initialConnected, latestJobByRepoId } = props;
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // LLM opt-in state
  const [llmOptIn, setLlmOptIn] = useState<boolean | null>(null);
  const [llmOptInUpdating, setLlmOptInUpdating] = useState(false);
  const [llmOptInError, setLlmOptInError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOptIn() {
      try {
        const res = await fetch("/api/settings/llm-opt-in");
        if (res.ok) {
          const data = await res.json();
          setLlmOptIn(data.optedIn === true);
        } else {
          // Default to false if API fails
          setLlmOptIn(false);
        }
      } catch {
        // Default to false on error
        setLlmOptIn(false);
      }
    }
    fetchOptIn();
  }, []);

  async function handleLlmOptInToggle() {
    if (llmOptIn === null) return;
    const newValue = !llmOptIn;
    setLlmOptInUpdating(true);
    setLlmOptInError(null);
    try {
      const res = await fetch("/api/settings/llm-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: newValue }),
      });
      if (res.ok) {
        setLlmOptIn(newValue);
        toast({
          title: newValue ? "AI narratives enabled" : "AI narratives disabled",
          description: newValue
            ? "Your analyses will now include LLM-generated insights."
            : "Your analyses will use metrics-only narratives.",
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setLlmOptInError(data.error || "Failed to update setting");
        toast({
          variant: "destructive",
          title: "Failed to update setting",
          description: data.error || "Please try again.",
        });
      }
    } catch (e) {
      setLlmOptInError("Network error");
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Could not update setting. Please try again.",
      });
    } finally {
      setLlmOptInUpdating(false);
    }
  }

  function formatWhen(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  const connectedByFullName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of initialConnected) m.set(r.full_name, r.repo_id);
    return m;
  }, [initialConnected]);

  const selectedRepo = useMemo(() => {
    if (!repos || !selectedFullName) return null;
    return repos.find((r) => r.full_name === selectedFullName) ?? null;
  }, [repos, selectedFullName]);

  const cacheKey = useMemo(() => `vibed.githubRepos.v1.${userId}`, [userId]);

  const readCachedRepos = useCallback((): { repos: GithubRepo[]; syncedAt: number } | null => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const record = parsed as Record<string, unknown>;
      if (typeof record.syncedAt !== "number") return null;
      if (!Array.isArray(record.repos)) return null;
      return { repos: record.repos as GithubRepo[], syncedAt: record.syncedAt };
    } catch {
      return null;
    }
  }, [cacheKey]);

  const writeCachedRepos = useCallback((nextRepos: GithubRepo[]) => {
    try {
      const payload = JSON.stringify({ syncedAt: Date.now(), repos: nextRepos });
      localStorage.setItem(cacheKey, payload);
    } catch {}
  }, [cacheKey]);

  const syncReposFromGithub = useCallback(async (opts?: { debug?: boolean }) => {
    const url = opts?.debug ? "/api/github/sync-repos?debug=1" : "/api/github/sync-repos";
    const res = await fetch(url, { method: "POST" });
    const data = (await res.json()) as {
      repos?: GithubRepo[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "Failed to load repos");
    const nextRepos = data.repos ?? [];
    setRepos(nextRepos);
    setLastSyncedAt(Date.now());
    writeCachedRepos(nextRepos);
    setIsPickerOpen(false);
    setSelectedFullName((prev) => prev ?? nextRepos[0]?.full_name ?? null);
  }, [writeCachedRepos]);

  const loadRepos = useCallback(
    async (opts?: { force?: boolean }) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!opts?.force) {
          const cached = readCachedRepos();
          if (cached && Date.now() - cached.syncedAt < GITHUB_REPO_CACHE_TTL_MS) {
            setRepos(cached.repos);
            setLastSyncedAt(cached.syncedAt);
            setSelectedFullName((prev) => prev ?? cached.repos[0]?.full_name ?? null);
            syncReposFromGithub().catch(() => {});
            return;
          }
        }

        await syncReposFromGithub({ debug: Boolean(opts?.force) });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load repos");
      } finally {
        setIsLoading(false);
      }
    },
    [readCachedRepos, syncReposFromGithub]
  );

  useEffect(() => {
    void loadRepos();
  }, [loadRepos]);

  async function ensureRepoConnected(repo: GithubRepo): Promise<string> {
    const res = await fetch("/api/repos/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        github_id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        is_private: repo.private,
        default_branch: repo.default_branch,
      }),
    });
    const data = (await res.json()) as { repo_id?: string; error?: string };
    if (!res.ok || !data.repo_id) throw new Error(data.error || "Failed to connect repo");
    return data.repo_id;
  }

  async function startAnalysisJob(repoId: string, repoName?: string) {
    const res = await fetch("/api/analysis/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId }),
    });
    const data = (await res.json()) as { job_id?: string; error?: string };
    if (!res.ok || !data.job_id) throw new Error(data.error || "Failed to start analysis");
    const nextJobId = data.job_id;

    setPendingJobs((prev) => [
      { jobId: nextJobId, repoName: repoName ?? null },
      ...prev.filter((p) => p.jobId !== nextJobId),
    ]);
    toast({
      title: "Vibe check started",
      description: repoName ? repoName : undefined,
      action: (
        <ToastAction altText="Open job" onClick={() => router.push(`/analysis/${nextJobId}`)}>
          Open
        </ToastAction>
      ),
    });
  }

  useEffect(() => {
    if (pendingJobs.length === 0) return;

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      if (cancelled) return;

      Promise.all(
        pendingJobs.map(async (pending) => {
          const res = await fetch(`/api/analysis/${pending.jobId}`, { cache: "no-store" });
          const json = (await res.json()) as unknown;
          if (!res.ok) return { jobId: pending.jobId, status: "error" as const, error: "not_found" };

          const job = (json as { job?: unknown } | null)?.job;
          if (!job || typeof job !== "object") {
            return { jobId: pending.jobId, status: "error" as const, error: "invalid_response" };
          }

          const status = (job as { status?: unknown }).status;
          const errorMessage = (job as { error_message?: unknown }).error_message;

          return {
            jobId: pending.jobId,
            status: typeof status === "string" ? status : "error",
            error:
              typeof errorMessage === "string"
                ? errorMessage
                : typeof status === "string" && status === "error"
                  ? "Analysis failed"
                  : null,
          };
        })
      )
        .then((results) => {
          if (cancelled) return;

          const repoNameByJobId = new Map(pendingJobs.map((p) => [p.jobId, p.repoName]));
          const completedJobIds = new Set(
            results
              .filter((r) => r.status === "done" || r.status === "error")
              .map((r) => r.jobId)
          );

          if (completedJobIds.size === 0) return;

          setPendingJobs((prev) => prev.filter((p) => !completedJobIds.has(p.jobId)));

          const doneJobs = results.filter((r) => r.status === "done");
          const errorJobs = results.filter((r) => r.status === "error");

          if (doneJobs.length > 0) {
            for (const done of doneJobs) {
              const repoName = repoNameByJobId.get(done.jobId) ?? null;
              toast({
                title: "Vibe report is ready",
                description: repoName ? repoName : undefined,
                action: (
                  <ToastAction altText="Open report" onClick={() => router.push(`/analysis/${done.jobId}`)}>
                    Open
                  </ToastAction>
                ),
              });
            }
            router.refresh();
          }

          if (errorJobs.length > 0) {
            for (const err of errorJobs) {
              const repoName = repoNameByJobId.get(err.jobId) ?? null;
              toast({
                variant: "destructive",
                title: "Vibe check failed",
                description: [repoName, err.error ?? "Analysis failed."].filter(Boolean).join(" · "),
              });
            }
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pendingJobs, router]);

  async function connectRepo(repo: GithubRepo) {
    setIsLoading(true);
    setError(null);

    try {
      await ensureRepoConnected(repo);
      setSelectedFullName(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect repo");
    } finally {
      setIsLoading(false);
    }
  }

  async function disconnectRepo(repoId: string) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/repos/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to remove repo");

      router.refresh();
      fetch("/api/profile/rebuild", { method: "POST" }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove repo");
    } finally {
      setIsLoading(false);
    }
  }

  async function startAnalysis(repoId: string, repoName?: string) {
    setIsLoading(true);
    setError(null);
    try {
      await startAnalysisJob(repoId, repoName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* LLM Opt-in Card */}
      {llmOptIn !== null && (
        <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-violet-50/80 via-indigo-50/50 to-violet-50/80 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-900">
                AI-Generated Narratives
              </h3>
              <p className="mt-1 text-sm text-zinc-600">
                {llmOptIn
                  ? "Your analyses will include LLM-generated narratives about your development process — commit rhythm, iteration style, and how you approach building software."
                  : "Enable AI narratives to get richer insights about your development process."}
              </p>
              {!llmOptIn && (
                <p className="mt-2 text-xs text-zinc-500">
                  When enabled, commit messages are processed by an LLM to describe <em>how</em> you build
                  (patterns, rhythm, iteration style) — never <em>what</em> you build (product details).
                </p>
              )}
            </div>
            <button
              onClick={handleLlmOptInToggle}
              disabled={llmOptInUpdating}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                llmOptIn ? "bg-indigo-600" : "bg-zinc-300"
              }`}
              role="switch"
              aria-checked={llmOptIn}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  llmOptIn ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                llmOptIn
                  ? "bg-green-100 text-green-800"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {llmOptIn ? "Enabled" : "Disabled"}
            </span>
            <a
              href="/settings/llm-keys"
              className="text-xs text-indigo-600 hover:underline"
            >
              Manage in Settings →
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
          onClick={() => loadRepos({ force: true })}
          disabled={isLoading}
        >
          Force refresh from GitHub
        </button>
        <p className="text-sm text-zinc-700">
          Only connect repos you&apos;re comfortable analyzing.
          {lastSyncedAt ? ` · Synced ${new Date(lastSyncedAt).toLocaleDateString()}` : ""}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Your repos</h2>
        {initialConnected.length === 0 ? (
          <p className="text-sm text-zinc-700">
            No repos connected yet. Add one to start building your profile.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/70 backdrop-blur">
            {initialConnected.map((r) => (
              <li key={r.repo_id} className="flex items-center justify-between gap-4 p-3">
                <span className="text-sm text-zinc-900">{r.full_name}</span>
                <div className="flex items-center gap-2">
                  {latestJobByRepoId[r.repo_id] ? (
                    <>
                      <button
                        type="button"
                        className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                        onClick={() => router.push(`/analysis/${latestJobByRepoId[r.repo_id]}`)}
                        disabled={isLoading}
                      >
                        View vibe
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur disabled:opacity-60"
                      onClick={() => startAnalysis(r.repo_id, r.full_name)}
                        disabled={isLoading}
                      >
                        Re-run
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
                        onClick={() => disconnectRepo(r.repo_id)}
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur disabled:opacity-60"
                      onClick={() => startAnalysis(r.repo_id, r.full_name)}
                        disabled={isLoading}
                      >
                        Get vibe
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
                        onClick={() => disconnectRepo(r.repo_id)}
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Add a repo</h2>
        {repos === null ? (
          <p className="text-sm text-zinc-700">
            Loading your repositories…
          </p>
        ) : repos.length === 0 ? (
          <p className="text-sm text-zinc-700">No repositories found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={isPickerOpen}
                  aria-controls="repo-picker-list"
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
                  disabled={isLoading}
                >
                  <span className="truncate">
                    {selectedRepo ? selectedRepo.full_name : "Search and select a repo"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0"
              >
                <Command>
                  <CommandInput placeholder="Search repos by name…" />
                  <CommandList id="repo-picker-list">
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup>
                      {repos.map((r) => {
                        const connectedRepoId = connectedByFullName.get(r.full_name);
                        const lastTouch = formatWhen(r.pushed_at ?? r.updated_at);
                        return (
                          <CommandItem
                            key={r.id}
                            value={r.full_name}
                            onSelect={() => {
                              setSelectedFullName(r.full_name);
                              setIsPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                selectedFullName === r.full_name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm font-semibold text-zinc-950">
                                  {r.full_name}
                                </span>
                                {connectedRepoId ? (
                                  <span className="shrink-0 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                                    In profile
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-zinc-600">
                                {r.private ? "Private" : "Public"}
                                {r.language ? ` · ${r.language}` : ""}
                                {lastTouch ? ` · Updated ${lastTouch}` : ""}
                              </p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                onClick={() => {
                  if (!selectedRepo) return;
                  const connectedRepoId = connectedByFullName.get(selectedRepo.full_name);
                  if (connectedRepoId) {
                    void startAnalysis(connectedRepoId, selectedRepo.full_name);
                    return;
                  }

                  setIsLoading(true);
                  setError(null);
                  ensureRepoConnected(selectedRepo)
                    .then((repoId) => {
                      setSelectedFullName(null);
                      router.refresh();
                      return startAnalysisJob(repoId, selectedRepo.full_name);
                    })
                    .catch((e) => {
                      setError(e instanceof Error ? e.message : "Failed to start analysis");
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }}
                disabled={isLoading || !selectedRepo}
              >
                Add and get vibe
              </button>
              <button
                type="button"
                className={cn(wrappedTheme.secondaryButton, "px-4 py-1.5", "disabled:opacity-60")}
                onClick={() => {
                  if (!selectedRepo) return;
                  const connectedRepoId = connectedByFullName.get(selectedRepo.full_name);
                  if (connectedRepoId) return;
                  void connectRepo(selectedRepo);
                }}
                disabled={
                  isLoading || !selectedRepo || Boolean(selectedRepo && connectedByFullName.get(selectedRepo.full_name))
                }
              >
                Add to profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
