"use client";

import { cn } from "@/lib/utils";
import type { VibeAxes } from "@vibed/core";
import { AXIS_METADATA, AXIS_ORDER } from "../constants";

interface UnifiedAxesSectionProps {
  /** Vibe axes data */
  axes: VibeAxes;
  /** Additional class names */
  className?: string;
}

/**
 * UnifiedAxesSection - Grid display of the 6 vibe axes for the unified VCP
 *
 * Uses the light theme styling (zinc colors for text, subtle backgrounds)
 */
export function UnifiedAxesSection({
  axes,
  className,
}: UnifiedAxesSectionProps) {
  return (
    <div className={cn("border-t border-black/5 p-8 sm:p-10", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
        Your Axes
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        The 6 signals that define your AI-assisted engineering (vibe coding) style
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AXIS_ORDER.map((key) => {
          const axis = axes[key];
          const meta = AXIS_METADATA[key];
          const score = axis?.score ?? 50;

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
                <span className="text-xl font-bold text-zinc-900">{score}</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
