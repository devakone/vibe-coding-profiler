"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMatchedRule, AXIS_LEGEND } from "@/lib/format-labels";

interface UnifiedMethodologySectionProps {
  /** Matched rules from detectVibePersona (string array like ["A>=70", "C>=65"]) */
  matchedRules: string[];
  /** Caveats from detectVibePersona */
  caveats: string[];
  /** Additional class names */
  className?: string;
}

/**
 * UnifiedMethodologySection - Collapsible details about how the persona was determined
 *
 * Accepts data directly from detectVibePersona output
 */
export function UnifiedMethodologySection({
  matchedRules,
  caveats,
  className,
}: UnifiedMethodologySectionProps) {
  return (
    <div className={cn("border-t border-black/5 p-8 sm:p-10", className)}>
      <details>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500 hover:text-zinc-700">
          How we got this
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Matched signals
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {matchedRules.length > 0 ? (
                matchedRules.map((rule) => (
                  <span
                    key={rule}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                  >
                    {formatMatchedRule(rule)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-600">
                  Selected by nearest-fit across all signals
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {Object.entries(AXIS_LEGEND).map(([k, v]) => (
              <span key={k}>
                {k} = {v}
              </span>
            ))}
          </div>

          {caveats.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Caveats
              </p>
              <ul className="mt-2 space-y-1">
                {caveats.map((caveat) => (
                  <li key={caveat} className="text-sm text-zinc-600">
                    • {caveat}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link
            href="/methodology"
            className="inline-block text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            View full methodology
          </Link>
        </div>
      </details>
    </div>
  );
}
