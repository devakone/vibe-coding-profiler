import { cn } from "@/lib/utils";
import type { VCPMatchedSignalsProps } from "../types";
import { VCPBadge } from "../primitives";
import { AXIS_METADATA } from "../constants";

/**
 * Format a matched rule string into a human-readable label.
 * e.g., "A>=70" -> "Automation ≥ 70"
 */
function formatRule(rule: string): string {
  const axisMap: Record<string, string> = {
    A: AXIS_METADATA.automation_heaviness.name,
    B: AXIS_METADATA.guardrail_strength.name,
    C: AXIS_METADATA.iteration_loop_intensity.name,
    D: AXIS_METADATA.planning_signal.name,
    E: AXIS_METADATA.surface_area_per_change.name,
    F: AXIS_METADATA.shipping_rhythm.name,
  };

  // Parse patterns like "A>=70", "B<40", etc.
  const match = rule.match(/^([A-F])([<>=]+)(\d+)$/);
  if (!match) return rule;

  const [, axis, op, val] = match;
  const axisName = axisMap[axis] ?? axis;
  const opSymbol = op.replace(">=", "≥").replace("<=", "≤");

  return `${axisName} ${opSymbol} ${val}`;
}

/**
 * VCPMatchedSignals - Display of matched persona rules
 *
 * Shows which conditions were satisfied for persona detection.
 */
export function VCPMatchedSignals({
  matchedRules,
  className,
}: VCPMatchedSignalsProps) {
  if (!matchedRules || matchedRules.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {matchedRules.map((rule, idx) => (
        <VCPBadge key={idx} variant="info" size="sm">
          {formatRule(rule)}
        </VCPBadge>
      ))}
    </div>
  );
}
