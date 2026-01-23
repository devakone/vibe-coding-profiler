"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, RefreshCw } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import { PlatformConnections } from "@/components/settings/PlatformConnections";

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

export default function RepoSettingsClient(props: {
  userId: string;
  initialConnected: ConnectedRepo[];
}) {
  const router = useRouter();
  const { userId, initialConnected } = props;
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // LLM opt-in state
  const [llmOptIn, setLlmOptIn] = useState<boolean | null>(null);
  const [llmOptInUpdating, setLlmOptInUpdating] = useState(false);

  useEffect(() => {
    async function fetchOptIn() {
      try {
        const res = await fetch("/api/settings/llm-opt-in");
        if (res.ok) {
          const data = await res.json();
          setLlmOptIn(data.optedIn === true);
        } else {
          setLlmOptIn(false);
        }
      } catch {
        setLlmOptIn(false);
      }
    }
    fetchOptIn();
  }, []);

  async function handleLlmOptInToggle() {
    if (llmOptIn === null) return;
    const newValue = !llmOptIn;
    setLlmOptInUpdating(true);
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
        toast({
          variant: "destructive",
          title: "Failed to update setting",
          description: data.error || "Please try again.",
        });
      }
    } catch {
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

  const syncReposFromGithub = useCallback(async () => {
    const res = await fetch("/api/github/sync-repos", { method: "POST" });
    const data = (await res.json()) as { repos?: GithubRepo[]; error?: string };
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
        await syncReposFromGithub();
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
      setSelectedFullName(null);
      toast({
        title: "Repo connected",
        description: `${repo.full_name} has been added to your profile.`,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect repo");
    } finally {
      setIsLoading(false);
    }
  }

  async function disconnectRepo(repoId: string, repoName: string) {
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
      toast({
        title: "Repo removed",
        description: `${repoName} has been removed from your profile.`,
      });
      router.refresh();
      fetch("/api/profile/rebuild", { method: "POST" }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove repo");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* LLM Opt-in Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">AI Narratives</h2>
        {llmOptIn !== null && (
          <div className="rounded-2xl border border-black/5 bg-gradient-to-br from-violet-50/80 via-indigo-50/50 to-violet-50/80 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-zinc-900">
                  AI-Generated Narratives
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {llmOptIn
                    ? "Your analyses include LLM-generated narratives about your development process."
                    : "Enable AI narratives to get richer insights about your development process."}
                </p>
                {!llmOptIn && (
                  <p className="mt-2 text-xs text-zinc-500">
                    When enabled, commit messages are processed by an LLM to describe <em>how</em> you
                    build (patterns, rhythm, iteration style) — never <em>what</em> you build.
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
          </div>
        )}
      </section>

      {/* Platform Connections Section */}
      <section className="space-y-4">
        <PlatformConnections />
      </section>

      {/* Connected Repos Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Your Repos ({initialConnected.length})
          </h2>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {lastSyncedAt && (
              <span>Synced {new Date(lastSyncedAt).toLocaleDateString()}</span>
            )}
            <button
              type="button"
              onClick={() => loadRepos({ force: true })}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              Sync
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {initialConnected.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No repos connected yet. Add one below to start building your profile.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/70 backdrop-blur">
            {initialConnected.map((r) => (
              <li key={r.repo_id} className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm font-medium text-zinc-900">{r.full_name}</span>
                <button
                  type="button"
                  onClick={() => disconnectRepo(r.repo_id, r.full_name)}
                  disabled={isLoading}
                  className="rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add Repo Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Connect a Repo</h2>
        {repos === null ? (
          <p className="text-sm text-zinc-600">Loading your repositories...</p>
        ) : repos.length === 0 ? (
          <p className="text-sm text-zinc-600">No repositories found in your GitHub account.</p>
        ) : (
          <div className="space-y-3">
            <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={isPickerOpen}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/70 px-4 py-3 text-left text-sm font-medium text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-60"
                  disabled={isLoading}
                >
                  <span className="truncate">
                    {selectedRepo ? selectedRepo.full_name : "Search and select a repo"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search repos by name..." />
                  <CommandList>
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
                                "mr-2 h-4 w-4",
                                selectedFullName === r.full_name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium">{r.full_name}</span>
                                {connectedRepoId && (
                                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                    Connected
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {r.private ? "Private" : "Public"}
                                {r.language ? ` · ${r.language}` : ""}
                                {lastTouch ? ` · ${lastTouch}` : ""}
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

            <button
              type="button"
              onClick={() => {
                if (!selectedRepo) return;
                if (connectedByFullName.get(selectedRepo.full_name)) {
                  toast({
                    title: "Already connected",
                    description: `${selectedRepo.full_name} is already in your profile.`,
                  });
                  return;
                }
                void connectRepo(selectedRepo);
              }}
              disabled={isLoading || !selectedRepo}
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
            >
              Connect Repo
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
