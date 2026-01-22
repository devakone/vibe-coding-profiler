import { cn } from "@/lib/utils";
import type { VCPStatsGridProps } from "../types";
import { VCPStatCard } from "../primitives";

/**
 * VCPStatsGrid - Grid of stat cards
 *
 * Flexible grid layout for displaying multiple stats.
 */
export function VCPStatsGrid({
  stats,
  columns = 3,
  className,
}: VCPStatsGridProps) {
  const columnClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {stats.map((stat, idx) => (
        <VCPStatCard
          key={`${stat.label}-${idx}`}
          label={stat.label}
          value={stat.value}
          subtitle={stat.subtitle}
        />
      ))}
    </div>
  );
}
