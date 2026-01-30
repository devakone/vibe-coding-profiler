"use client";

import { useState, useEffect } from "react";
import { validateUsername, normalizeUsername } from "@/lib/username";

/**
 * Username editor component for settings.
 * Allows users to claim or change their username.
 */
export function UsernameEditor() {
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "";

  useEffect(() => {
    fetch("/api/profile/username")
      .then((res) => res.json())
      .then((data) => {
        if (data.username) {
          setCurrentUsername(data.username);
          setUsername(data.username);
        }
        if (data.github_username) {
          setGithubUsername(data.github_username);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const normalized = normalizeUsername(username);
    const validation = validateUsername(normalized);

    if (!validation.valid) {
      setError(validation.error ?? "Invalid username");
      return;
    }

    if (normalized === currentUsername) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/profile/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUsername(data.username);
        setUsername(data.username);
        setSuccess("Username saved!");
        setAvailable(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save username");
      }
    } catch {
      setError("Failed to save username");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setUsername(normalized);
    setError(null);
    setSuccess(null);
    setAvailable(null);
  };

  const isDirty = username !== (currentUsername ?? "");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="flex rounded-lg border border-zinc-200 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
            <span className="flex items-center pl-3 text-sm text-zinc-400">
              {appUrl ? `${new URL(appUrl).host}/u/` : "vibed.dev/u/"}
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={githubUsername?.toLowerCase() ?? "your-username"}
              className="flex-1 bg-transparent px-1 py-2 text-sm text-zinc-900 outline-none"
              maxLength={39}
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !isDirty || !username}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : success ? (
        <p className="text-sm text-emerald-600">{success}</p>
      ) : available === true ? (
        <p className="text-sm text-emerald-600">Username is available!</p>
      ) : null}

      {currentUsername ? (
        <p className="text-xs text-zinc-500">
          Your profile URL:{" "}
          <span className="font-mono text-violet-600">
            {appUrl ? `${new URL(appUrl).host}` : "vibed.dev"}/u/{currentUsername}
          </span>
        </p>
      ) : null}
    </div>
  );
}
