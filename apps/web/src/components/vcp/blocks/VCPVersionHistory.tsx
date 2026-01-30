"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { VCPVersionHistoryProps } from "../types";
import { VCPCollapsible } from "../primitives";
import { getPersonaIcon } from "../constants";

/**
 * VCPVersionHistory - Shared version/snapshot selector
 *
 * Used for both Unified VCP and Repo VCP to show historical versions.
 */
export function VCPVersionHistory({
  variant,
  versions,
  currentVersionId,
  onVersionSelect,
  showPreview = true,
  className,
}: VCPVersionHistoryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const currentVersion = versions.find((v) => v.id === currentVersionId);

  const triggerLabel = variant === "unified"
    ? `Profile History (${versions.length} snapshots)`
    : `Version History (${versions.length} versions)`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className={cn("rounded-xl bg-white/5 p-4", className)}>
      <VCPCollapsible
        trigger={
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{triggerLabel}</span>
            {currentVersion && (
              <span className="text-white/40">
                · {currentVersion.label}
              </span>
            )}
          </div>
        }
      >
        <div className="space-y-1">
          {versions.map((version, idx) => {
            const isSelected = version.id === currentVersionId;
            const iconUrl = getPersonaIcon(version.personaId);

            return (
              <button
                key={version.id}
                type="button"
                onClick={() => onVersionSelect(version.id)}
                onMouseEnter={() => showPreview && setHoveredId(version.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white/80"
                )}
              >
                {/* Version indicator */}
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/50"
                  )}
                >
                  {variant === "repo" ? `v${versions.length - idx}` : idx + 1}
                </div>

                {/* Persona icon */}
                <div className="relative h-6 w-6 overflow-hidden rounded-full bg-white/10">
                  <Image
                    src={iconUrl}
                    alt={version.personaName}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-cover"
                  />
                </div>

                {/* Version info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {version.personaName}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatDate(version.createdAt)}
                  </p>
                </div>

                {/* Current indicator */}
                {isSelected && (
                  <span className="shrink-0 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Preview on hover (desktop) - could be enhanced */}
        {showPreview && hoveredId && hoveredId !== currentVersionId && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
            Click to view this version
          </div>
        )}
      </VCPCollapsible>
    </div>
  );
}
