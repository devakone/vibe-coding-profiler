import { cn } from "@/lib/utils";
import type { VCPCardProps } from "../types";
import { VCP_CARD_RADIUS, VCP_CARD_SHADOW } from "../constants";

/**
 * VCPCard - Base container component for VCP content
 *
 * Provides consistent styling for card-like containers across
 * both Unified VCP and Repo VCP displays.
 */
export function VCPCard({ className, children, variant = "default" }: VCPCardProps) {
  return (
    <div
      className={cn(
        VCP_CARD_RADIUS,
        "border border-white/10 bg-zinc-900/80 backdrop-blur",
        variant === "elevated" && `${VCP_CARD_SHADOW} bg-zinc-900/90`,
        variant === "muted" && "bg-zinc-900/50",
        className
      )}
    >
      {children}
    </div>
  );
}
