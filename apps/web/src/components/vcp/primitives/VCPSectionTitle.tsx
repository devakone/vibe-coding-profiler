import { cn } from "@/lib/utils";
import type { VCPSectionTitleProps } from "../types";
import { VCP_TITLE_TRACKING } from "../constants";

/**
 * VCPSectionTitle - Consistent section header styling
 *
 * Small, uppercase, with letter-spacing for visual hierarchy.
 */
export function VCPSectionTitle({
  children,
  badge,
  action,
  className,
}: VCPSectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        <h3
          className={cn(
            "text-xs font-semibold uppercase text-white/60",
            VCP_TITLE_TRACKING
          )}
        >
          {children}
        </h3>
        {badge && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
            {badge}
          </span>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
