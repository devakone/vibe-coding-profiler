"use client";

import { cn } from "@/lib/utils";
import type { VibeAxes } from "@vibed/core";
import { AXIS_METADATA, AXIS_ORDER } from "../constants";

interface MatchedRule {
  axisKey: string;
  threshold: number | [number, number];
  direction: "above" | "below" | "between";
}

interface PersonaExplanation {
  name: string;
  matchedRules: MatchedRule[];
  confidence: string;
}

interface UnifiedMethodologySectionProps {
  /** Persona explanation data */
  explanation: PersonaExplanation;
  /** User's vibe axes */
  axes: VibeAxes;
  /** Additional class names */
  className?: string;
}

/**
 * UnifiedMethodologySection - Collapsible details about how the persona was determined
 */
export function UnifiedMethodologySection({
  explanation,
  axes,
  className,
}: UnifiedMethodologySectionProps) {
  const formatRule = (rule: MatchedRule): string => {
    const meta = AXIS_METADATA[rule.axisKey as keyof typeof AXIS_METADATA];
    const axisName = meta?.name ?? rule.axisKey;
    const userScore = axes[rule.axisKey as keyof typeof axes]?.score ?? 0;

    if (rule.direction === "between" && Array.isArray(rule.threshold)) {
      return `${axisName} ${rule.threshold[0]}–${rule.threshold[1]} (yours: ${userScore})`;
    }
    const op = rule.direction === "above" ? "≥" : "≤";
    return `${axisName} ${op} ${rule.threshold} (yours: ${userScore})`;
  };

  return (
    <div className={cn("border-t border-black/5 p-8 sm:p-10", className)}>
      <details>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500 hover:text-zinc-700">
          How we got this
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-zinc-700">
              You matched <strong>{explanation.name}</strong> with{" "}
              {explanation.confidence} confidence.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Matched Rules
            </p>
            <ul className="space-y-1">
              {explanation.matchedRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600">
                  <span className="mt-1 text-violet-400">✓</span>
                  <span>{formatRule(rule)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Your Axis Scores
            </p>
            <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              {AXIS_ORDER.map((key) => {
                const axis = axes[key];
                const meta = AXIS_METADATA[key];
                return (
                  <div key={key} className="flex justify-between">
                    <span>{meta.name}</span>
                    <span className="font-mono">{axis?.score ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
