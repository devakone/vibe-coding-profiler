"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { VCPCollapsibleProps } from "../types";

/**
 * VCPCollapsible - Expandable content section
 *
 * Used for "How we got this" and other optional detail sections.
 */
export function VCPCollapsible({
  trigger,
  children,
  defaultOpen = false,
  className,
}: VCPCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-left transition-colors hover:text-white/90"
      >
        <span className="text-sm text-white/70">{trigger}</span>
        <svg
          className={cn(
            "h-4 w-4 text-white/50 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
