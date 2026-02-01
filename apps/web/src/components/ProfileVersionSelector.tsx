"use client";

import { useState, useEffect } from "react";

interface ProfileVersion {
  id: string;
  version: number;
  createdAt: string;
  triggerJobId: string | null;
  triggerRepoName: string | null;
  llmModel: string | null;
  llmKeySource: string | null;
  persona: {
    id: string;
    name: string;
    tagline?: string;
  } | null;
  totalCommits: number;
  totalRepos: number;
}

interface ProfileVersionSelectorProps {
  currentUpdatedAt: string | null;
}

export function ProfileVersionSelector({ currentUpdatedAt }: ProfileVersionSelectorProps) {
  const [versions, setVersions] = useState<ProfileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProfileVersion | null>(null);

  useEffect(() => {
    if (!expanded) return;

    async function fetchVersions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile/history", { cache: "no-store" });
        const data = (await res.json()) as { versions?: ProfileVersion[]; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Failed to load history");
          return;
        }
        setVersions(data.versions ?? []);
      } catch {
        setError("Failed to load history");
      } finally {
        setLoading(false);
      }
    }

    fetchVersions();
  }, [expanded]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-zinc-50 p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Profile History
          </span>
          {currentUpdatedAt ? (
            <span className="ml-2 text-xs text-zinc-400">
              Last updated: {formatDate(currentUpdatedAt)}
            </span>
          ) : null}
        </div>
        <span className="text-sm text-zinc-500">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading history...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-zinc-500">No history available yet.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">View version:</span>
                <select
                  className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  value={selectedVersion?.id ?? ""}
                  onChange={(e) => {
                    const version = versions.find((v) => v.id === e.target.value);
                    setSelectedVersion(version ?? null);
                  }}
                >
                  <option value="">Current profile</option>
                  {versions.map((v, idx) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} — {formatDate(v.createdAt)} — {v.persona?.name ?? "Unknown"}
                      {idx === 0 ? " (latest)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVersion ? (
                <div className="mt-4 rounded-xl border border-black/5 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {selectedVersion.persona?.name ?? "Unknown"}
                      </p>
                      {selectedVersion.persona?.tagline ? (
                        <p className="mt-1 text-sm text-zinc-600">
                          {selectedVersion.persona.tagline}
                        </p>
                      ) : null}
                    </div>
                    {selectedVersion.llmModel ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                        AI: {selectedVersion.llmModel}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        Non-LLM
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                    <span>{selectedVersion.totalRepos} repos</span>
                    <span>{selectedVersion.totalCommits.toLocaleString()} commits</span>
                    {selectedVersion.triggerRepoName ? (
                      <span className="text-zinc-400">
                        Triggered by: {selectedVersion.triggerRepoName}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">
                    Version {selectedVersion.version} — {formatDate(selectedVersion.createdAt)}
                  </p>
                </div>
              ) : null}

              <p className="text-xs text-zinc-400">
                {versions.length} version{versions.length !== 1 ? "s" : ""} saved
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
