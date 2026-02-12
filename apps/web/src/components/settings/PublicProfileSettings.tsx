"use client";

import { useState, useEffect } from "react";
import type { PublicProfileSettings } from "@/types/public-profile";
import { DEFAULT_PUBLIC_PROFILE_SETTINGS } from "@/types/public-profile";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface ToggleItem {
  key: keyof PublicProfileSettings;
  label: string;
  description: string;
}

const DEFAULT_PUBLIC_TOGGLES: ToggleItem[] = [
  { key: "show_persona", label: "Persona", description: "Your persona name and archetype" },
  { key: "show_tagline", label: "Tagline", description: "Your persona tagline" },
  { key: "show_confidence", label: "Confidence", description: "Confidence level indicator" },
  { key: "show_axes_chart", label: "Axes Chart", description: "Your 6-axis coding style chart" },
  { key: "show_style_descriptor", label: "Style Descriptor", description: "Your coding style summary" },
  { key: "show_total_repos", label: "Repo Count", description: "Total number of repos analyzed" },
  { key: "show_total_commits", label: "Commit Count", description: "Total number of commits analyzed" },
  { key: "show_avatar", label: "Avatar", description: "Your GitHub avatar" },
  { key: "show_ai_tools", label: "AI Tools", description: "AI coding tools detected in your commits" },
];

const OPT_IN_TOGGLES: ToggleItem[] = [
  { key: "show_narrative", label: "Narrative", description: "AI-generated profile narrative" },
  { key: "show_insight_cards", label: "Insight Cards", description: "Detailed insight cards" },
  { key: "show_repo_breakdown", label: "Repo Breakdown", description: "Show per-repo contribution bars" },
  { key: "show_repo_names", label: "Repo Names", description: "Show actual repository names" },
  { key: "show_peak_time", label: "Peak Time", description: "Your peak coding time" },
  { key: "show_shipping_rhythm", label: "Shipping Rhythm", description: "Your commit frequency pattern" },
  { key: "show_near_miss_personas", label: "Near-Miss Personas", description: "Personas you almost matched" },
];

/**
 * Public profile privacy settings component.
 * Master toggle + grouped individual toggles.
 */
export function PublicProfileSettingsPanel() {
  const [settings, setSettings] = useState<PublicProfileSettings>(DEFAULT_PUBLIC_PROFILE_SETTINGS);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/profile/public-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings({ ...DEFAULT_PUBLIC_PROFILE_SETTINGS, ...data.settings });
        }
        if (data.username) {
          setUsername(data.username);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key: keyof PublicProfileSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
    setError(null);
    setSuccess(null);
  };

  const handleMasterToggle = () => {
    if (!settings.profile_enabled && !username) {
      setError("You must set a username before enabling your public profile.");
      return;
    }
    setSettings((prev) => ({ ...prev, profile_enabled: !prev.profile_enabled }));
    setDirty(true);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/profile/public-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSuccess("Settings saved!");
        setDirty(false);
        // Track profile visibility change
        if (settings.profile_enabled) {
          trackEvent(AnalyticsEvents.PUBLIC_PROFILE_ENABLED);
        } else {
          trackEvent(AnalyticsEvents.PUBLIC_PROFILE_DISABLED);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div>
          <p className="font-medium text-zinc-900">Public Profile</p>
          <p className="text-sm text-zinc-600">
            {settings.profile_enabled
              ? "Your profile is visible to anyone with the link"
              : "Your profile is private"}
          </p>
        </div>
        <button
          onClick={handleMasterToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
            settings.profile_enabled ? "bg-violet-600" : "bg-zinc-300"
          }`}
          role="switch"
          aria-checked={settings.profile_enabled}
          disabled={!username && !settings.profile_enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
              settings.profile_enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {!username && !settings.profile_enabled ? (
        <p className="text-sm text-amber-600">
          Set a username above to enable your public profile.
        </p>
      ) : null}

      {settings.profile_enabled ? (
        <>
          {/* Default public section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Default Public
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              These are shown by default on your public profile
            </p>
            <div className="mt-3 space-y-2">
              {DEFAULT_PUBLIC_TOGGLES.map((item) => (
                <ToggleRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={settings[item.key]}
                  onChange={() => handleToggle(item.key)}
                />
              ))}
            </div>
          </div>

          {/* Opt-in section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Opt-in (Private by Default)
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Enable these to share more detail on your public profile
            </p>
            <div className="mt-3 space-y-2">
              {OPT_IN_TOGGLES.map((item) => (
                <ToggleRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={settings[item.key]}
                  onChange={() => handleToggle(item.key)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      </div>

      {/* Preview link */}
      {settings.profile_enabled && username ? (
        <p className="text-sm text-zinc-500">
          Preview:{" "}
          <a
            href={`/u/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-violet-600 hover:underline"
          >
            /u/{username}
          </a>
        </p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 ${
          checked ? "bg-violet-500" : "bg-zinc-200"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
