import { cn } from "@/lib/utils";
import type { VCPFooterProps } from "../types";

/**
 * VCPFooter - Card footer with left/right content
 *
 * Used for branding and context (repos/commits).
 */
export function VCPFooter({ left, right, className }: VCPFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-white/10 px-6 py-4",
        className
      )}
    >
      <div className="text-xs text-white/40">{left}</div>
      <div className="text-xs text-white/40">{right}</div>
    </div>
  );
}
