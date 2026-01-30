/**
 * Unit tests for VCP metric utilities
 */
import { describe, it, expect } from "vitest";
import type { VibeAxes } from "@vibe-coding-profiler/core";
import {
  computeStrongestAxis,
  formatStrongestAxis,
  computeStyleDescriptor,
  computeRhythmLabel,
  computePeakLabel,
  analyzePeakWindow,
  computeShareCardMetrics,
  formatConfidence,
  computeConsistencyLabel,
} from "../metrics";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockAxes(overrides: Partial<Record<keyof VibeAxes, { score: number; level: "high" | "medium" | "low" }>> = {}): VibeAxes {
  const defaults: VibeAxes = {
    automation_heaviness: { score: 50, level: "medium", why: [] },
    guardrail_strength: { score: 50, level: "medium", why: [] },
    iteration_loop_intensity: { score: 50, level: "medium", why: [] },
    planning_signal: { score: 50, level: "medium", why: [] },
    surface_area_per_change: { score: 50, level: "medium", why: [] },
    shipping_rhythm: { score: 50, level: "medium", why: [] },
  };

  const result: VibeAxes = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const axisKey = key as keyof VibeAxes;
    result[axisKey] = { ...defaults[axisKey], ...value };
  }
  return result;
}

function createTimestamps(hours: number[], count: number = 1): string[] {
  const timestamps: string[] = [];
  for (const hour of hours) {
    for (let i = 0; i < count; i++) {
      // Create a date with the specified hour
      const date = new Date(2024, 0, 1, hour, 0, 0);
      timestamps.push(date.toISOString());
    }
  }
  return timestamps;
}

// =============================================================================
// computeStrongestAxis
// =============================================================================

describe("computeStrongestAxis", () => {
  it("returns the axis with the highest score", () => {
    const axes = createMockAxes({
      automation_heaviness: { score: 80, level: "high" },
      guardrail_strength: { score: 60, level: "medium" },
    });

    const result = computeStrongestAxis(axes);

    expect(result.key).toBe("automation_heaviness");
    expect(result.name).toBe("Automation");
    expect(result.score).toBe(80);
  });

  it("returns the first axis when all scores are equal", () => {
    const axes = createMockAxes(); // all at 50

    const result = computeStrongestAxis(axes);

    // Should return automation_heaviness since it's checked first
    expect(result.key).toBe("automation_heaviness");
    expect(result.score).toBe(50);
  });

  it("correctly identifies different strongest axes", () => {
    const testCases: { key: keyof VibeAxes; name: string }[] = [
      { key: "guardrail_strength", name: "Guardrails" },
      { key: "iteration_loop_intensity", name: "Iteration" },
      { key: "planning_signal", name: "Planning" },
      { key: "surface_area_per_change", name: "Surface Area" },
      { key: "shipping_rhythm", name: "Rhythm" },
    ];

    for (const { key, name } of testCases) {
      const axes = createMockAxes({
        [key]: { score: 90, level: "high" },
      });

      const result = computeStrongestAxis(axes);

      expect(result.key).toBe(key);
      expect(result.name).toBe(name);
      expect(result.score).toBe(90);
    }
  });
});

// =============================================================================
// formatStrongestAxis
// =============================================================================

describe("formatStrongestAxis", () => {
  it("formats as 'Name Score'", () => {
    const axes = createMockAxes({
      automation_heaviness: { score: 78, level: "high" },
    });

    const result = formatStrongestAxis(axes);

    expect(result).toBe("Automation 78");
  });

  it("formats different axes correctly", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 85, level: "high" },
    });

    const result = formatStrongestAxis(axes);

    expect(result).toBe("Rhythm 85");
  });
});

// =============================================================================
// computeStyleDescriptor
// =============================================================================

describe("computeStyleDescriptor", () => {
  it("returns 'Fast Builder' for high automation + high iteration", () => {
    const axes = createMockAxes({
      automation_heaviness: { score: 70, level: "high" },
      iteration_loop_intensity: { score: 65, level: "medium" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Fast Builder");
  });

  it("returns 'Safe Shipper' for high guardrails + decent automation", () => {
    const axes = createMockAxes({
      guardrail_strength: { score: 70, level: "high" },
      automation_heaviness: { score: 50, level: "medium" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Safe Shipper");
  });

  it("returns 'Rapid Cycler' for high rhythm + high iteration", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 70, level: "high" },
      iteration_loop_intensity: { score: 60, level: "medium" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Rapid Cycler");
  });

  it("returns 'Steady Hand' for high guardrails + low iteration", () => {
    const axes = createMockAxes({
      guardrail_strength: { score: 65, level: "medium" },
      iteration_loop_intensity: { score: 30, level: "low" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Steady Hand");
  });

  it("returns 'Bold Mover' for high automation + low guardrails", () => {
    const axes = createMockAxes({
      automation_heaviness: { score: 60, level: "medium" },
      guardrail_strength: { score: 30, level: "low" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Bold Mover");
  });

  it("returns 'Deep Planner' for high planning", () => {
    const axes = createMockAxes({
      planning_signal: { score: 70, level: "high" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Deep Planner");
  });

  it("returns 'Wide Scoper' for high surface area", () => {
    const axes = createMockAxes({
      surface_area_per_change: { score: 70, level: "high" },
    });

    expect(computeStyleDescriptor(axes)).toBe("Wide Scoper");
  });

  it("returns 'Balanced' when no specific pattern matches", () => {
    const axes = createMockAxes(); // all at 50

    expect(computeStyleDescriptor(axes)).toBe("Balanced");
  });
});

// =============================================================================
// computeRhythmLabel
// =============================================================================

describe("computeRhythmLabel", () => {
  it("returns 'Bursty' for high level rhythm", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 70, level: "high" },
    });

    expect(computeRhythmLabel(axes)).toBe("Bursty");
  });

  it("returns 'Bursty' for score >= 65 regardless of level", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 65, level: "medium" },
    });

    expect(computeRhythmLabel(axes)).toBe("Bursty");
  });

  it("returns 'Steady' for low level rhythm", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 30, level: "low" },
    });

    expect(computeRhythmLabel(axes)).toBe("Steady");
  });

  it("returns 'Steady' for score < 35 regardless of level", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 34, level: "medium" },
    });

    expect(computeRhythmLabel(axes)).toBe("Steady");
  });

  it("returns 'Mixed' for medium scores", () => {
    const axes = createMockAxes({
      shipping_rhythm: { score: 50, level: "medium" },
    });

    expect(computeRhythmLabel(axes)).toBe("Mixed");
  });
});

// =============================================================================
// computePeakLabel
// =============================================================================

describe("computePeakLabel", () => {
  it("returns 'Mornings' for mornings window", () => {
    expect(computePeakLabel("mornings")).toBe("Mornings");
  });

  it("returns 'Afternoons' for afternoons window", () => {
    expect(computePeakLabel("afternoons")).toBe("Afternoons");
  });

  it("returns 'Evenings' for evenings window", () => {
    expect(computePeakLabel("evenings")).toBe("Evenings");
  });

  it("returns 'Late Nights' for late_nights window", () => {
    expect(computePeakLabel("late_nights")).toBe("Late Nights");
  });

  it("returns 'Varied' for null", () => {
    expect(computePeakLabel(null)).toBe("Varied");
  });
});

// =============================================================================
// analyzePeakWindow
// =============================================================================

describe("analyzePeakWindow", () => {
  it("returns null for fewer than 10 timestamps", () => {
    const timestamps = createTimestamps([9, 10, 11], 3); // only 9 timestamps

    expect(analyzePeakWindow(timestamps)).toBeNull();
  });

  it("returns 'mornings' for predominantly morning commits (6am-12pm)", () => {
    // 15 morning commits, 2 afternoon
    const timestamps = [
      ...createTimestamps([7, 8, 9, 10, 11], 3), // 15 morning commits
      ...createTimestamps([13, 14], 1), // 2 afternoon commits
    ];

    expect(analyzePeakWindow(timestamps)).toBe("mornings");
  });

  it("returns 'afternoons' for predominantly afternoon commits (12pm-6pm)", () => {
    // 15 afternoon commits, 2 morning
    const timestamps = [
      ...createTimestamps([13, 14, 15, 16, 17], 3), // 15 afternoon commits
      ...createTimestamps([9, 10], 1), // 2 morning commits
    ];

    expect(analyzePeakWindow(timestamps)).toBe("afternoons");
  });

  it("returns 'evenings' for predominantly evening commits (6pm-10pm)", () => {
    // 15 evening commits, 2 afternoon
    const timestamps = [
      ...createTimestamps([18, 19, 20, 21], 4), // 16 evening commits (21 is still before 22)
      ...createTimestamps([13, 14], 1), // 2 afternoon commits
    ];

    expect(analyzePeakWindow(timestamps)).toBe("evenings");
  });

  it("returns 'late_nights' for predominantly late night commits (10pm-6am)", () => {
    // 15 late night commits, 2 morning
    const timestamps = [
      ...createTimestamps([22, 23, 0, 1, 2], 3), // 15 late night commits
      ...createTimestamps([9, 10], 1), // 2 morning commits
    ];

    expect(analyzePeakWindow(timestamps)).toBe("late_nights");
  });

  it("returns null when no clear winner (close distribution)", () => {
    // Even distribution across windows
    const timestamps = [
      ...createTimestamps([9], 5),  // 5 morning
      ...createTimestamps([14], 5), // 5 afternoon
      ...createTimestamps([19], 5), // 5 evening
    ];

    expect(analyzePeakWindow(timestamps)).toBeNull();
  });
});

// =============================================================================
// computeShareCardMetrics
// =============================================================================

describe("computeShareCardMetrics", () => {
  it("returns all four metrics", () => {
    const axes = createMockAxes({
      automation_heaviness: { score: 78, level: "high" },
      iteration_loop_intensity: { score: 70, level: "high" },
      shipping_rhythm: { score: 60, level: "medium" },
    });

    const result = computeShareCardMetrics(axes, "afternoons");

    expect(result).toEqual({
      strongest: "Automation 78",
      style: "Fast Builder",
      rhythm: "Mixed",
      peak: "Afternoons",
    });
  });

  it("uses 'Varied' for peak when no peakWindow provided", () => {
    const axes = createMockAxes();

    const result = computeShareCardMetrics(axes);

    expect(result.peak).toBe("Varied");
  });

  it("handles null peakWindow explicitly", () => {
    const axes = createMockAxes();

    const result = computeShareCardMetrics(axes, null);

    expect(result.peak).toBe("Varied");
  });
});

// =============================================================================
// formatConfidence
// =============================================================================

describe("formatConfidence", () => {
  it("formats 'high' as 'High Confidence'", () => {
    expect(formatConfidence("high")).toBe("High Confidence");
  });

  it("formats 'medium' as 'Medium Confidence'", () => {
    expect(formatConfidence("medium")).toBe("Medium Confidence");
  });

  it("formats 'low' as 'Low Confidence'", () => {
    expect(formatConfidence("low")).toBe("Low Confidence");
  });

  it("returns unknown values as-is", () => {
    expect(formatConfidence("unknown")).toBe("unknown");
    expect(formatConfidence("custom")).toBe("custom");
  });
});

// =============================================================================
// computeConsistencyLabel
// =============================================================================

describe("computeConsistencyLabel", () => {
  it("returns 'New' for fewer than 2 snapshots", () => {
    expect(computeConsistencyLabel(0, 0)).toBe("New");
    expect(computeConsistencyLabel(0, 1)).toBe("New");
  });

  it("returns 'Steady' for 0 persona shifts with 2+ snapshots", () => {
    expect(computeConsistencyLabel(0, 2)).toBe("Steady");
    expect(computeConsistencyLabel(0, 10)).toBe("Steady");
  });

  it("returns singular '1 Shift' for one persona shift", () => {
    expect(computeConsistencyLabel(1, 5)).toBe("1 Shift");
  });

  it("returns plural 'N Shifts' for multiple persona shifts", () => {
    expect(computeConsistencyLabel(2, 5)).toBe("2 Shifts");
    expect(computeConsistencyLabel(5, 10)).toBe("5 Shifts");
  });
});
