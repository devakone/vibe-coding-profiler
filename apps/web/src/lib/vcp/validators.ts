import type { Level, VibeAxes } from "@vibed/core";

const AXIS_KEYS: (keyof VibeAxes)[] = [
  "automation_heaviness",
  "guardrail_strength",
  "iteration_loop_intensity",
  "planning_signal",
  "surface_area_per_change",
  "shipping_rhythm",
];

function isAxisValue(v: unknown): v is { score: number; level: Level; why: string[] } {
  if (!v || typeof v !== "object") return false;
  const record = v as Record<string, unknown>;
  if (typeof record.score !== "number") return false;
  if (typeof record.level !== "string") return false;
  if (!Array.isArray(record.why)) return false;
  return record.why.every((item) => typeof item === "string");
}

export function isVibeAxes(v: unknown): v is VibeAxes {
  if (!v || typeof v !== "object") return false;
  const record = v as Record<string, unknown>;
  return AXIS_KEYS.every((key) => isAxisValue(record[key]));
}
