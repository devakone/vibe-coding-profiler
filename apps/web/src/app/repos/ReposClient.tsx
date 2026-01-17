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

const GITHUB_REPO_CACHE_KEY = "vibed.githubRepos.v1";
const GITHUB_REPO_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export default function ReposClient(props: {
  initialConnected: ConnectedRepo[];
  latestJobByRepoId: Record<string, string>;
}) {
  const router = useRouter();
  const { initialConnected, latestJobByRepoId } = props;
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

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

  const readCachedRepos = useCallback((): { repos: GithubRepo[]; syncedAt: number } | null => {
    try {
      const raw = localStorage.getItem(GITHUB_REPO_CACHE_KEY);
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
  }, []);

  const writeCachedRepos = useCallback((nextRepos: GithubRepo[]) => {
    try {
      const payload = JSON.stringify({ syncedAt: Date.now(), repos: nextRepos });
      localStorage.setItem(GITHUB_REPO_CACHE_KEY, payload);
    } catch {}
  }, []);

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
            return;
          }
        }

        const res = await fetch("/api/github/sync-repos", { method: "POST" });
        const data = (await res.json()) as { repos?: GithubRepo[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load repos");
        const nextRepos = data.repos ?? [];
        setRepos(nextRepos);
        setLastSyncedAt(Date.now());
        writeCachedRepos(nextRepos);
        setIsPickerOpen(false);
        setSelectedFullName((prev) => prev ?? nextRepos[0]?.full_name ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load repos");
      } finally {
        setIsLoading(false);
      }
    },
    [readCachedRepos, writeCachedRepos]
  );

  useEffect(() => {
    const cached = readCachedRepos();
    if (cached && Date.now() - cached.syncedAt < GITHUB_REPO_CACHE_TTL_MS) {
      setRepos(cached.repos);
      setLastSyncedAt(cached.syncedAt);
      setSelectedFullName((prev) => prev ?? cached.repos[0]?.full_name ?? null);
      return;
    }

    void loadRepos();
  }, [loadRepos, readCachedRepos]);

  async function connectRepo(repo: GithubRepo) {
    setIsLoading(true);
    setError(null);

    try {
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
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect repo");
    } finally {
      setIsLoading(false);
    }
  }

  async function startAnalysis(repoId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });
      const data = (await res.json()) as { job_id?: string; error?: string };
      if (!res.ok || !data.job_id) throw new Error(data.error || "Failed to start analysis");
      router.push(`/analysis/${data.job_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          onClick={() => loadRepos()}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
        <button
          type="button"
          className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
          onClick={() => loadRepos({ force: true })}
          disabled={isLoading}
        >
          Force refresh from GitHub
        </button>
        <p className="text-sm text-zinc-700">
          Choose a safe repo. Avoid work, NDA, or sensitive repos.
          {" "}Repos are cached for 24 hours.
          {lastSyncedAt ? ` · Last synced ${new Date(lastSyncedAt).toLocaleDateString()}` : ""}
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
                        onClick={() => startAnalysis(r.repo_id)}
                        disabled={isLoading}
                      >
                        Re-run
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur disabled:opacity-60"
                      onClick={() => startAnalysis(r.repo_id)}
                      disabled={isLoading}
                    >
                      Get vibe
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Find a GitHub repo</h2>
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

            {selectedRepo ? (
              <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {selectedRepo.full_name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {selectedRepo.private ? "Private" : "Public"}
                      {selectedRepo.language ? ` · ${selectedRepo.language}` : ""}
                      {formatWhen(selectedRepo.pushed_at ?? selectedRepo.updated_at)
                        ? ` · Updated ${formatWhen(selectedRepo.pushed_at ?? selectedRepo.updated_at)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const connectedRepoId = connectedByFullName.get(selectedRepo.full_name);
                      if (!connectedRepoId) {
                        return (
                          <button
                            type="button"
                            className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                            onClick={() => connectRepo(selectedRepo)}
                            disabled={isLoading}
                          >
                            Add to profile
                          </button>
                        );
                      }

                      const jobId = latestJobByRepoId[connectedRepoId];
                      if (jobId) {
                        return (
                          <>
                            <button
                              type="button"
                              className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                              onClick={() => router.push(`/analysis/${jobId}`)}
                              disabled={isLoading}
                            >
                              View vibe
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur disabled:opacity-60"
                              onClick={() => startAnalysis(connectedRepoId)}
                              disabled={isLoading}
                            >
                              Re-run
                            </button>
                          </>
                        );
                      }

                      return (
                        <button
                          type="button"
                          className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                          onClick={() => startAnalysis(connectedRepoId)}
                          disabled={isLoading}
                        >
                          Get vibe
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
