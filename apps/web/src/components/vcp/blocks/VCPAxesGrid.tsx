import { cn } from "@/lib/utils";
import type { VCPAxesGridProps } from "../types";
import { VCPProgressBar } from "../primitives";
import { AXIS_METADATA, AXIS_ORDER } from "../constants";
import { AxisInfoTooltip } from "../AxisInfoTooltip";

/**
 * VCPAxesGrid - Grid display of all six vibe axes
 *
 * Shows axis name, score bar, and level for each axis.
 */
export function VCPAxesGrid({
  axes,
  showDescriptions = false,
  layout = "grid",
  className,
}: VCPAxesGridProps) {
  const axisEntries = AXIS_ORDER.map((key) => ({
    key,
    ...axes[key],
    meta: AXIS_METADATA[key],
  }));

  if (layout === "list") {
    return (
      <div className={cn("space-y-4", className)}>
        {axisEntries.map(({ key, score, meta }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium text-white/80">{meta.name}</span>
                <AxisInfoTooltip meta={meta} variant="dark" />
              </div>
              <span className="text-white/60">{score}</span>
            </div>
            <VCPProgressBar value={score} size="md" />
            {showDescriptions && (
              <p className="text-xs text-white/40">{meta.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {axisEntries.map(({ key, score, meta }) => (
        <div
          key={key}
          className="rounded-xl bg-white/5 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {meta.name}
              </span>
              <AxisInfoTooltip meta={meta} variant="dark" />
            </div>
            <span className="text-lg font-bold text-white">{score}</span>
          </div>
          <VCPProgressBar value={score} size="sm" className="mt-2" />
          <div className="mt-2 flex items-center justify-between text-xs text-white/40">
            <span>{meta.lowLabel}</span>
            <span>{meta.highLabel}</span>
          </div>
          {showDescriptions && (
            <p className="mt-2 text-xs text-white/40">{meta.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
