import { cn } from "@/lib/utils";
import type { VCPBadgeProps } from "../types";

/**
 * VCPBadge - Small label/tag component
 *
 * Used for confidence indicators, status labels, etc.
 */
export function VCPBadge({
  children,
  variant = "default",
  size = "md",
  className,
}: VCPBadgeProps) {
  const variantClasses = {
    default: "bg-white/10 text-white/70",
    success: "bg-green-500/20 text-green-400",
    warning: "bg-yellow-500/20 text-yellow-400",
    info: "bg-blue-500/20 text-blue-400",
    muted: "bg-white/5 text-white/50",
  };

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
