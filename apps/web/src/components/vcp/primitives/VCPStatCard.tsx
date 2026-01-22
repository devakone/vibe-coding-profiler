import { cn } from "@/lib/utils";
import type { VCPStatCardProps } from "../types";

/**
 * VCPStatCard - Individual stat/metric display card
 *
 * Used in grids to show key metrics like axis scores, commit counts, etc.
 */
export function VCPStatCard({
  label,
  value,
  subtitle,
  variant = "default",
  className,
}: VCPStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4",
        variant === "default" && "bg-white/5",
        variant === "highlight" && "bg-white/10 ring-1 ring-white/20",
        variant === "muted" && "bg-white/[0.02]",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-white">
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-white/40">{subtitle}</p>
      )}
    </div>
  );
}
