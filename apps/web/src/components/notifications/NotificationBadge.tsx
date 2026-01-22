"use client";

import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  /** Number of unread notifications */
  count: number;
  /** Maximum count to display before showing "9+" */
  maxCount?: number;
  /** Size variant */
  size?: "sm" | "md";
  /** Optional additional classes */
  className?: string;
}

/**
 * NotificationBadge - Displays unread notification count
 *
 * Shows a gradient pill with the count, or "9+" if over max.
 * Returns null if count is 0.
 */
export function NotificationBadge({
  count,
  maxCount = 9,
  size = "md",
  className,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const sizeClasses = {
    sm: "h-4 min-w-4 px-1 text-[9px]",
    md: "h-5 min-w-5 px-1.5 text-[10px]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 font-bold text-white",
        sizeClasses[size],
        className
      )}
    >
      {displayCount}
    </span>
  );
}
