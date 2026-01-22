"use client";

import { cn } from "@/lib/utils";

interface StreakInfo {
  longest_days: number;
  start_day?: string | null;
  end_day?: string | null;
}

interface TimingInfo {
  peak_weekday: number | null;
  peak_window?: string | null;
}

interface CommitsInfo {
  top_category: string | null;
  category_counts: Record<string, number>;
  features_per_fix: number | null;
  fixes_per_feature: number | null;
}

interface ChunkinessInfo {
  avg_files_changed: number | null;
  label: string | null;
}

interface TotalsInfo {
  commits: number;
}

interface RepoMetricsGridProps {
  /** Streak information */
  streak: StreakInfo;
  /** Timing information */
  timing: TimingInfo;
  /** Commits information */
  commits: CommitsInfo;
  /** Chunkiness information */
  chunkiness: ChunkinessInfo;
  /** Total counts */
  totals: TotalsInfo;
  /** Additional class names */
  className?: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * RepoMetricsGrid - 5-column grid of key repo metrics
 *
 * Shows: Streak, Peak Day, Focus, Build vs Fix, Scope
 */
export function RepoMetricsGrid({
  streak,
  timing,
  commits,
  chunkiness,
  totals,
  className,
}: RepoMetricsGridProps) {
  const weekdayName = (day: number | null): string => {
    if (day === null || day < 0 || day > 6) return "—";
    return WEEKDAYS[day] ?? "—";
  };

  const formatPeakWindow = (window: string | null | undefined): string => {
    if (!window) return "";
    return window
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const scopeLabel = (): string => {
    if (chunkiness.label === "chunker") return "files/commit (wide)";
    if (chunkiness.label === "mixer") return "files/commit (balanced)";
    if (chunkiness.label === "slicer") return "files/commit (focused)";
    return "files/commit";
  };

  return (
    <div
      className={cn(
        "mt-6 grid gap-3 rounded-2xl border border-black/5 bg-white/60 p-4 backdrop-blur sm:grid-cols-2 lg:grid-cols-5",
        className
      )}
    >
      {/* Streak */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Streak
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          {streak.longest_days} day{streak.longest_days === 1 ? "" : "s"}
        </p>
        {streak.start_day && streak.end_day ? (
          <p className="mt-1 text-xs text-zinc-500">
            {streak.start_day} → {streak.end_day}
          </p>
        ) : null}
      </div>

      {/* Peak Day */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Peak Day
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          {weekdayName(timing.peak_weekday)}
        </p>
        {timing.peak_window ? (
          <p className="mt-1 text-xs text-zinc-500">
            {formatPeakWindow(timing.peak_window)} (UTC)
          </p>
        ) : null}
      </div>

      {/* Focus */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Focus
        </p>
        <p className="mt-1 text-2xl font-semibold capitalize text-zinc-900">
          {commits.top_category ?? "—"}
        </p>
        {commits.top_category ? (
          <p className="mt-1 text-xs text-zinc-500">
            {commits.category_counts[commits.top_category] ?? 0} of {totals.commits} commits
          </p>
        ) : null}
      </div>

      {/* Build vs Fix */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Build vs Fix
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          {commits.features_per_fix !== null
            ? `${commits.features_per_fix.toFixed(1)} : 1`
            : commits.fixes_per_feature !== null
              ? `1 : ${commits.fixes_per_feature.toFixed(1)}`
              : "—"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {commits.features_per_fix !== null
            ? "features per fix"
            : commits.fixes_per_feature !== null
              ? "fixes per feature"
              : "balanced"}
        </p>
      </div>

      {/* Scope */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Scope
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          {chunkiness.avg_files_changed !== null
            ? `${chunkiness.avg_files_changed.toFixed(1)}`
            : "—"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{scopeLabel()}</p>
      </div>
    </div>
  );
}
