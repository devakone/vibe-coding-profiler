"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

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

export default function ReposClient({ initialConnected }: { initialConnected: ConnectedRepo[] }) {
  const router = useRouter();
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function loadRepos() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github/sync-repos", { method: "POST" });
      const data = (await res.json()) as { repos?: GithubRepo[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load repos");
      setRepos(data.repos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load repos");
    } finally {
      setIsLoading(false);
    }
  }

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
          onClick={loadRepos}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Pick a project"}
        </button>
        <p className="text-sm text-zinc-700">
          Choose a safe repo. Avoid work, NDA, or sensitive projects.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Your chapters</h2>
        {initialConnected.length === 0 ? (
          <p className="text-sm text-zinc-700">
            No chapters yet. Add a repo to start building your profile.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/70 backdrop-blur">
            {initialConnected.map((r) => (
              <li key={r.repo_id} className="flex items-center justify-between gap-4 p-3">
                <span className="text-sm text-zinc-900">{r.full_name}</span>
                <button
                  type="button"
                  className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur disabled:opacity-60"
                  onClick={() => startAnalysis(r.repo_id)}
                  disabled={isLoading}
                >
                  Get vibe
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Your GitHub list</h2>
        {repos === null ? (
          <p className="text-sm text-zinc-700">
            Press “Pick a project” to load your repositories.
          </p>
        ) : repos.length === 0 ? (
          <p className="text-sm text-zinc-700">No repositories found.</p>
        ) : (
          <ul className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/70 backdrop-blur">
            {repos.map((r) => {
              const connectedRepoId = connectedByFullName.get(r.full_name);
              const lastTouch = formatWhen(r.pushed_at ?? r.updated_at);
              return (
                <li key={r.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-900">{r.full_name}</p>
                    <p className="text-xs text-zinc-600">
                      {r.private ? "Private" : "Public"}
                      {r.language ? ` · ${r.language}` : ""}
                      {lastTouch ? ` · Updated ${lastTouch}` : ""}
                    </p>
                  </div>
                  {connectedRepoId ? (
                    <button
                      type="button"
                      className="rounded-full border border-zinc-300/80 bg-white/70 px-3 py-1 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur disabled:opacity-60"
                      onClick={() => startAnalysis(connectedRepoId)}
                      disabled={isLoading}
                    >
                      Get vibe
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${wrappedTheme.primaryButtonSm} disabled:opacity-60`}
                      onClick={() => connectRepo(r)}
                      disabled={isLoading}
                    >
                      Add to profile
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
