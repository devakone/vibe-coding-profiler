"use client";

import { cn } from "@/lib/utils";
import type { VibeAxes } from "@vibed/core";
import { AXIS_METADATA, AXIS_ORDER } from "../constants";

interface RepoAxesSectionProps {
  /** Vibe axes data */
  axes: VibeAxes;
  /** Additional class names */
  className?: string;
}

/**
 * RepoAxesSection - Grid display of the 6 vibe axes for a Repo VCP
 *
 * Similar to UnifiedAxesSection but with repo-specific styling
 */
export function RepoAxesSection({ axes, className }: RepoAxesSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
        Your Axes
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AXIS_ORDER.map((key) => {
          const axis = axes[key];
          const meta = AXIS_METADATA[key];
          const score = axis?.score ?? 50;
          const level = axis?.level ?? "medium";

          return (
            <div
              key={key}
              className="rounded-2xl border border-black/5 bg-zinc-50/50 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{meta.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{meta.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-zinc-900">{score}</span>
                  <p className="text-xs capitalize text-zinc-400">{level}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                <span>{meta.lowLabel}</span>
                <span>{meta.highLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
