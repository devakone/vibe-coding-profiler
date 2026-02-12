"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { wrappedTheme } from "@/lib/theme";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/components/ui/use-toast";
import { PlatformIcon } from "@/components/icons/platform";
import type { PlatformRepo, PlatformType } from "@vibe-coding-profiler/core";

type ConnectedRepo = {
  repo_id: string;
  full_name: string;
  platform: PlatformType;
};

type ReposClientProps = {
  userId: string;
  initialConnected: ConnectedRepo[];
  latestJobByRepoId: Record<string, string>;
  /** Which platforms the user has connected (for disabling tabs) */
  connectedPlatforms?: PlatformType[];
  /** "settings" hides vibe actions; "vibes" shows them */
  mode?: "settings" | "vibes";
};

const PLATFORMS: PlatformType[] = ["github", "gitlab", "bitbucket"];
const PLATFORM_LABELS: Record<PlatformType, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
};

export default function ReposClient({ 
  initialConnected, 
  latestJobByRepoId,
  connectedPlatforms = ["github", "gitlab", "bitbucket"],
  mode = "vibes",
}: ReposClientProps) {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("github");
  const [repos, setRepos] = useState<PlatformRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<PlatformRepo | null>(null);
  const [lastSynced, setLastSynced] = useState<Record<PlatformType, number>>(
    Object.fromEntries(PLATFORMS.map((platform) => [platform, 0])) as Record<PlatformType, number>
  );

  const cacheKey = (platform: PlatformType) => `vibed.repos.${platform}.cache`;

  const readCache = useCallback((platform: PlatformType) => {
    try {
      const raw = localStorage.getItem(cacheKey(platform));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.repos) || typeof parsed?.syncedAt !== "number") return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback((platform: PlatformType, payload: { repos: PlatformRepo[]; syncedAt: number }) => {
    try {
      localStorage.setItem(cacheKey(platform), JSON.stringify(payload));
    } catch {}
  }, []);

  const loadRepos = useCallback(
    async (platform: PlatformType, force = false) => {
      if (!force) {
        const cached = readCache(platform);
        if (cached && Date.now() - cached.syncedAt < 1000 * 60 * 60 * 24) {
          setRepos(cached.repos);
          setLastSynced((prev) => ({ ...prev, [platform]: cached.syncedAt }));
          setSelectedRepo((prev) => prev ?? cached.repos[0] ?? null);
          return;
        }
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/repos/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });

        const body = await response.json();
        if (!response.ok) {
          if (body.error === "platform_not_connected") {
            setRepos([]);
            toast({
              variant: "destructive",
              title: `${PLATFORM_LABELS[platform]} not connected`,
              description: "Connect the platform first from your settings page.",
            });
            return;
          }
          throw new Error(body.error || "Failed to sync repos");
        }

        const platformRepos = (body.repos ?? []) as PlatformRepo[];
        setRepos(platformRepos);
        setLastSynced((prev) => ({ ...prev, [platform]: Date.now() }));
        writeCache(platform, { repos: platformRepos, syncedAt: Date.now() });
        setSelectedRepo((prev) => prev ?? platformRepos[0] ?? null);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Repo sync failed",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [readCache, writeCache]
  );

  useEffect(() => {
    setSelectedRepo(null);
    void loadRepos(selectedPlatform);
  }, [selectedPlatform, loadRepos]);

  const isConnected = useMemo(
    () =>
      (repo: PlatformRepo) =>
        initialConnected.some((connected) => connected.full_name === repo.fullName && connected.platform === repo.platform),
    [initialConnected]
  );

  async function connectRepo(repo: PlatformRepo, options?: { startVibe?: boolean }) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/repos/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: repo.platform,
          platform_repo_id: repo.id,
          owner: repo.owner,
          name: repo.name,
          full_name: repo.fullName,
          is_private: repo.isPrivate,
          default_branch: repo.defaultBranch,
          platform_owner: repo.owner,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Could not connect repo");
      }

      toast({ title: "Repo added", description: `${repo.fullName} is now connected.` });
      trackEvent(AnalyticsEvents.REPO_CONNECT, { platform: repo.platform });
      if (options?.startVibe && body.repo_id) {
        await startAnalysis(body.repo_id, repo.fullName);
      }
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function startAnalysis(repoId: string, repoName?: string) {
    try {
      const response = await fetch("/api/analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });

    const body = await response.json();
    if (!response.ok || !body.job_id) {
      throw new Error(body.error || "Could not start analysis");
    }

    toast({
      title: "Vibe check started",
      description: repoName,
      action: (
        <ToastAction altText="Open analysis" onClick={() => router.push(`/analysis/${body.job_id}`)}>
          View
        </ToastAction>
      ),
    });
    trackEvent(AnalyticsEvents.REPO_ANALYZE);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  }

  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function disconnectRepo(repoId: string, repoName: string) {
    if (!confirm(`Disconnect "${repoName}"? This will remove it from your profile but won't delete any analysis data.`)) {
      return;
    }

    setDisconnecting(repoId);
    try {
      const response = await fetch("/api/repos/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Could not disconnect repo");
      }

      toast({ title: "Repo disconnected", description: `${repoName} has been removed.` });
      trackEvent(AnalyticsEvents.REPO_DISCONNECT);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Disconnect failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setDisconnecting(null);
    }
  }

  const connectedRepos = initialConnected.map((repo) => ({
    ...repo,
    latestJobId: latestJobByRepoId[repo.repo_id] ?? null,
  }));

  // Filter connected repos by selected platform
  const filteredConnectedRepos = connectedRepos.filter(
    (repo) => repo.platform === selectedPlatform
  );

  // Available repos: exclude already-connected ones
  const availableRepos = useMemo(
    () => repos.filter((repo) => !isConnected(repo)),
    [repos, isConnected]
  );

  // Reset selection if it points to a now-connected repo
  useEffect(() => {
    if (selectedRepo && isConnected(selectedRepo)) {
      setSelectedRepo(availableRepos[0] ?? null);
    }
  }, [availableRepos, selectedRepo, isConnected]);

  const isPlatformConnected = (platform: PlatformType) => connectedPlatforms.includes(platform);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {PLATFORMS.map((platform) => {
          const isConnected = isPlatformConnected(platform);
          const isDisabled = !isConnected || (isLoading && selectedPlatform === platform);
          
          return (
            <div key={platform} className="relative group">
              <button
                type="button"
                className={cn(
                  "rounded-full border px-4 py-1 text-sm font-semibold transition",
                  selectedPlatform === platform && isConnected
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-700"
                    : isConnected
                      ? "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      : "border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60"
                )}
                onClick={() => isConnected && setSelectedPlatform(platform)}
                disabled={isDisabled}
              >
                <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                  <PlatformIcon platform={platform} className="h-3 w-3" />
                </span>
                {PLATFORM_LABELS[platform]}
              </button>
              {/* Tooltip for disabled platforms */}
              {!isConnected && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-zinc-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  Connect {PLATFORM_LABELS[platform]} from Settings → Platforms
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-900" />
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="ml-auto flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 disabled:opacity-60"
          onClick={() => void loadRepos(selectedPlatform, true)}
          disabled={isLoading || !isPlatformConnected(selectedPlatform)}
        >
          <RefreshCw className="h-4 w-4" />
          Force refresh
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950">Connected repos</h2>
          <p className="text-xs text-zinc-500">
            {filteredConnectedRepos.length} {PLATFORM_LABELS[selectedPlatform]} repo(s)
          </p>
        </div>
        {filteredConnectedRepos.length === 0 ? (
          <p className="text-sm text-zinc-600">
            {isPlatformConnected(selectedPlatform) 
              ? `No ${PLATFORM_LABELS[selectedPlatform]} repos connected yet.`
              : `Connect ${PLATFORM_LABELS[selectedPlatform]} from Settings → Platforms to see repositories.`
            }
          </p>
        ) : (
          <div className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/80">
            {filteredConnectedRepos.map((repo) => (
              <div key={repo.repo_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={repo.platform} className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-900">{repo.full_name}</span>
                  {repo.latestJobId && <span className="text-[11px] text-zinc-500">Analyzed</span>}
                </div>
                {/* Action buttons differ by mode */}
                <div className="flex items-center gap-2">
                  {mode === "vibes" && (
                    <>
                      {repo.latestJobId ? (
                        <button
                          type="button"
                          className={cn(wrappedTheme.secondaryButton, "px-3 py-1 text-sm font-semibold")}
                          onClick={() => router.push(`/analysis/${repo.latestJobId}`)}
                        >
                          View vibe
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm hover:bg-white"
                        onClick={() => startAnalysis(repo.repo_id, repo.full_name)}
                      >
                        {repo.latestJobId ? "Re-run" : "Start vibe"}
                      </button>
                    </>
                  )}
                  {mode === "settings" && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                      onClick={() => disconnectRepo(repo.repo_id, repo.full_name)}
                      disabled={disconnecting === repo.repo_id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {disconnecting === repo.repo_id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-950">Add a repo</h2>
          <p className="text-xs text-zinc-500">
            Synced {lastSynced[selectedPlatform] ? new Date(lastSynced[selectedPlatform]).toLocaleDateString() : "—"}
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-zinc-600">Loading repositories…</p>
        ) : availableRepos.length === 0 ? (
          <p className="text-sm text-zinc-600">
            {repos.length === 0
              ? `No repositories found for ${PLATFORM_LABELS[selectedPlatform]}.`
              : `All ${PLATFORM_LABELS[selectedPlatform]} repositories are already connected.`}
          </p>
        ) : (
          <div className="space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={Boolean(selectedRepo)}
                  aria-controls="repo-picker-list"
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur hover:bg-white focus-visible:outline-none"
                >
                  <span className="truncate">{selectedRepo ? selectedRepo.fullName : "Select a repository"}</span>
                  <ChevronsUpDown className="h-4 w-4 text-zinc-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search repositories…" />
                  <CommandList id="repo-picker-list">
                    <CommandEmpty>No matches.</CommandEmpty>
                    <CommandGroup>
                      {availableRepos.map((repo) => (
                        <CommandItem
                          key={`${repo.platform}-${repo.id}`}
                          value={repo.fullName}
                          onSelect={() => setSelectedRepo(repo)}
                        >
                          <PlatformIcon platform={repo.platform} className="mr-2 h-4 w-4" />
                          <span className="flex-1 truncate text-sm font-semibold text-zinc-900">
                            {repo.fullName}
                          </span>
                        </CommandItem>
                      ))}
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
                  void connectRepo(selectedRepo, { startVibe: true });
                }}
                disabled={!selectedRepo}
              >
                Add and get vibe
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
