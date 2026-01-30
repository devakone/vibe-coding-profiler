/**
 * VCP Metric Utilities
 *
 * Functions for computing ShareCard metrics from vibe data.
 * Used by both Unified VCP and Repo VCP share sections.
 */

import type { VibeAxes } from "@vibe-coding-profiler/core";
import { AXIS_METADATA, AXIS_ORDER } from "@/components/vcp/constants";
import type { AxisKey } from "@/components/vcp/types";

// =============================================================================
// Metric 1: Strongest Axis
// =============================================================================

export interface StrongestAxis {
  key: AxisKey;
  name: string;
  score: number;
}

/**
 * Compute the strongest (highest scoring) axis from vibe axes.
 */
export function computeStrongestAxis(axes: VibeAxes): StrongestAxis {
  let strongest: StrongestAxis = {
    key: "automation_heaviness",
    name: AXIS_METADATA.automation_heaviness.name,
    score: axes.automation_heaviness.score,
  };

  for (const key of AXIS_ORDER) {
    const axis = axes[key];
    if (axis.score > strongest.score) {
      strongest = {
        key,
        name: AXIS_METADATA[key].name,
        score: axis.score,
      };
    }
  }

  return strongest;
}

/**
 * Format strongest axis for display (e.g., "AI-Heavy Automation")
 */
export function formatStrongestAxis(axes: VibeAxes): string {
  const { key } = computeStrongestAxis(axes);
  const meta = AXIS_METADATA[key];
  return `${meta.highLabel} ${meta.name}`;
}

// =============================================================================
// Metric 2: Style Descriptor
// =============================================================================

export type StyleDescriptor =
  | "Fast Builder"
  | "Safe Shipper"
  | "Rapid Cycler"
  | "Steady Hand"
  | "Bold Mover"
  | "Deep Planner"
  | "Wide Scoper"
  | "Balanced";

/**
 * Compute a human-readable style descriptor from axis scores.
 *
 * Returns a memorable label that captures the user's overall approach.
 */
export function computeStyleDescriptor(axes: VibeAxes): StyleDescriptor {
  const A = axes.automation_heaviness.score;
  const B = axes.guardrail_strength.score;
  const C = axes.iteration_loop_intensity.score;
  const D = axes.planning_signal.score;
  const E = axes.surface_area_per_change.score;
  const F = axes.shipping_rhythm.score;

  // High automation + high iteration = Fast Builder
  if (A >= 70 && C >= 65) return "Fast Builder";

  // High guardrails + decent automation = Safe Shipper
  if (B >= 70 && A >= 50) return "Safe Shipper";

  // High rhythm + high iteration = Rapid Cycler
  if (F >= 70 && C >= 60) return "Rapid Cycler";

  // High guardrails + low iteration = Steady Hand
  if (B >= 65 && C < 40) return "Steady Hand";

  // High automation + low guardrails = Bold Mover
  if (A >= 60 && B < 40) return "Bold Mover";

  // High planning = Deep Planner
  if (D >= 70) return "Deep Planner";

  // High surface area = Wide Scoper
  if (E >= 70) return "Wide Scoper";

  // Default
  return "Balanced";
}

// =============================================================================
// Metric 3: Rhythm Label
// =============================================================================

export type RhythmLabel = "Bursty" | "Steady" | "Mixed";

/**
 * Compute a rhythm label from shipping rhythm axis.
 */
export function computeRhythmLabel(axes: VibeAxes): RhythmLabel {
  const rhythmScore = axes.shipping_rhythm.score;
  const level = axes.shipping_rhythm.level;

  if (level === "high" || rhythmScore >= 65) return "Bursty";
  if (level === "low" || rhythmScore < 35) return "Steady";
  return "Mixed";
}

// =============================================================================
// Metric 4: Peak Time
// =============================================================================

export type PeakWindow = "mornings" | "afternoons" | "evenings" | "late_nights" | null;
export type PeakLabel = "Mornings" | "Afternoons" | "Evenings" | "Late Nights" | "All Hours";

/**
 * Compute a peak time label from timing analysis.
 *
 * @param peakWindow - The peak window from analysis insights, or null if not available
 */
export function computePeakLabel(peakWindow: PeakWindow): PeakLabel {
  switch (peakWindow) {
    case "mornings":
      return "Mornings";
    case "afternoons":
      return "Afternoons";
    case "evenings":
      return "Evenings";
    case "late_nights":
      return "Late Nights";
    default:
      return "All Hours";
  }
}

/**
 * Analyze commit timestamps to determine peak working window.
 *
 * @param commitTimestamps - Array of ISO date strings
 * @returns The most common time window, or null if insufficient data
 */
export function analyzePeakWindow(commitTimestamps: string[]): PeakWindow {
  if (commitTimestamps.length < 10) return null;

  const windowCounts = {
    mornings: 0,    // 6am - 12pm
    afternoons: 0,  // 12pm - 6pm
    evenings: 0,    // 6pm - 10pm
    late_nights: 0, // 10pm - 6am
  };

  for (const ts of commitTimestamps) {
    const date = new Date(ts);
    const hour = date.getHours();

    if (hour >= 6 && hour < 12) {
      windowCounts.mornings++;
    } else if (hour >= 12 && hour < 18) {
      windowCounts.afternoons++;
    } else if (hour >= 18 && hour < 22) {
      windowCounts.evenings++;
    } else {
      windowCounts.late_nights++;
    }
  }

  // Find the dominant window
  const entries = Object.entries(windowCounts) as [PeakWindow, number][];
  const sorted = entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const top = sorted[0];
  const second = sorted[1];

  if (!top || !second) return null;

  // Only return if there's a clear winner (>30% more than second place)
  if (top[1] > second[1] * 1.3) {
    return top[0];
  }

  return null;
}

// =============================================================================
// Complete ShareCard Metrics
// =============================================================================

export interface ShareCardMetrics {
  strongest: string;      // "AI-Heavy Automation"
  style: StyleDescriptor; // "Fast Builder"
  rhythm: RhythmLabel;    // "Bursty"
  peak: PeakLabel;        // "Afternoons"
}

/**
 * Compute all four ShareCard metrics.
 */
export function computeShareCardMetrics(
  axes: VibeAxes,
  peakWindow: PeakWindow = null
): ShareCardMetrics {
  return {
    strongest: formatStrongestAxis(axes),
    style: computeStyleDescriptor(axes),
    rhythm: computeRhythmLabel(axes),
    peak: computePeakLabel(peakWindow),
  };
}

// =============================================================================
// Confidence Formatting
// =============================================================================

/**
 * Format confidence level for display.
 */
export function formatConfidence(confidence: string): string {
  switch (confidence) {
    case "high":
      return "High Confidence";
    case "medium":
      return "Medium Confidence";
    case "low":
      return "Low Confidence";
    default:
      return confidence;
  }
}

// =============================================================================
// Consistency/Stability Label
// =============================================================================

export type ConsistencyLabel = "Steady" | "New" | string;

/**
 * Compute consistency label based on persona history.
 *
 * @param personaShifts - Number of times the persona changed
 * @param totalSnapshots - Total number of analysis snapshots
 */
export function computeConsistencyLabel(
  personaShifts: number,
  totalSnapshots: number
): ConsistencyLabel {
  if (totalSnapshots < 2) return "New";
  if (personaShifts === 0) return "Steady";
  return `${personaShifts} Shift${personaShifts > 1 ? "s" : ""}`;
}
