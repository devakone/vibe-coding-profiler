import { cn } from "@/lib/utils";
import type { VCPProgressBarProps } from "../types";

/**
 * VCPProgressBar - Visual progress/score indicator
 *
 * Used for displaying axis scores with gradient fill.
 */
export function VCPProgressBar({
  value,
  label,
  showValue = false,
  size = "md",
  variant = "default",
  className,
}: VCPProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const variantClasses = {
    default: "from-blue-500 to-purple-500",
    success: "from-green-500 to-emerald-400",
    warning: "from-yellow-500 to-orange-400",
    danger: "from-red-500 to-pink-500",
  };

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-white/60">{label}</span>}
          {showValue && <span className="font-medium text-white/80">{clampedValue}</span>}
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-white/10", sizeClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-300",
            variantClasses[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
