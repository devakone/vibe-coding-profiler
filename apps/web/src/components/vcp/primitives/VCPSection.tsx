import { cn } from "@/lib/utils";
import type { VCPSectionProps } from "../types";
import { VCPSectionTitle } from "./VCPSectionTitle";

/**
 * VCPSection - Content section within a VCP card
 *
 * Provides consistent spacing, optional title, and border styling.
 */
export function VCPSection({
  title,
  badge,
  action,
  children,
  noBorder = false,
  className,
}: VCPSectionProps) {
  return (
    <div
      className={cn(
        "px-6 py-5",
        !noBorder && "border-t border-white/10",
        className
      )}
    >
      {title && (
        <VCPSectionTitle badge={badge} action={action} className="mb-4">
          {title}
        </VCPSectionTitle>
      )}
      {children}
    </div>
  );
}
