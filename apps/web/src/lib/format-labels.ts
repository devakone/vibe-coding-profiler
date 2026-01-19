/**
 * Shared utilities for formatting metric labels and other underscore-style names
 * into user-friendly display text.
 */

const ABBREVIATIONS: Record<string, string> = {
  p50: "P50",
  p90: "P90",
  p95: "P95",
  p99: "P99",
  avg: "Avg",
  llm: "LLM",
  api: "API",
  url: "URL",
  id: "ID",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  pr: "PR",
  ci: "CI",
  cd: "CD",
};

/**
 * Convert underscore-separated metric/criteria names to user-friendly labels.
 *
 * Examples:
 *   "category_first_occurrence" → "Category First Occurrence"
 *   "commits_per_active_day_mean" → "Commits Per Active Day Mean"
 *   "conventional_commit_ratio" → "Conventional Commit Ratio"
 *   "llm_api_calls" → "LLM API Calls"
 *   "p95_latency" → "P95 Latency"
 */
export function formatMetricLabel(raw: string): string {
  return raw
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      if (ABBREVIATIONS[lower]) return ABBREVIATIONS[lower];
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Axis legend for rule formatting (A-F mapping to axis names)
 */
export const AXIS_LEGEND = {
  A: "Automation",
  B: "Guardrails",
  C: "Iteration",
  D: "Planning",
  E: "Surface Area",
  F: "Rhythm",
} as const;

/**
 * Format matched rule strings into user-friendly labels.
 *
 * Handles two patterns:
 * 1. Axis comparison rules: "A >= 60" → "Automation >= 60"
 * 2. Underscore-separated names: "docs_before_feature" → "Docs Before Feature"
 *
 * Examples:
 *   "A >= 60" → "Automation >= 60"
 *   "B < 40" → "Guardrails < 40"
 *   "high_iteration_ratio" → "High Iteration Ratio"
 */
export function formatMatchedRule(rule: string): string {
  // Handle axis comparison rules like "A >= 60"
  const m = rule.match(/^([A-F])\s*([<>]=?|=)\s*(\d+)\s*$/);
  if (m) {
    const axis = m[1] as keyof typeof AXIS_LEGEND;
    const op = m[2];
    const value = m[3];
    return `${AXIS_LEGEND[axis]} ${op} ${value}`;
  }
  // Fallback: format underscore-separated names
  if (rule.includes("_")) {
    return formatMetricLabel(rule);
  }
  return rule;
}

/**
 * Format a numeric value for display.
 * - Rounds to specified decimal places (default 2)
 * - Handles very long decimals like 0.9857142857142858 → "0.99"
 * - Returns integers without decimals
 * - Handles string numbers that look like decimals
 *
 * Examples:
 *   0.9857142857142858 → "0.99"
 *   18 → "18"
 *   1.5 → "1.5"
 *   "0.2857142857142857" → "0.29"
 */
export function formatMetricValue(
  value: string | number,
  decimals: number = 2
): string {
  // If it's a string, try to parse it as a number
  const num = typeof value === "string" ? parseFloat(value) : value;

  // If not a valid number, return the original value
  if (isNaN(num)) {
    return String(value);
  }

  // If it's an integer, return without decimals
  if (Number.isInteger(num)) {
    return String(num);
  }

  // Round to specified decimal places
  const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

  // Format with appropriate decimal places
  // Remove trailing zeros after decimal point
  return rounded.toFixed(decimals).replace(/\.?0+$/, "") || "0";
}

/**
 * Smart format for metric values that could be ratios, percentages, or counts.
 * Detects the type of value and formats appropriately.
 *
 * Examples:
 *   0.98 (ratio) → "98%"
 *   1.5 (ratio > 1) → "1.5"
 *   18 (count) → "18"
 *   "0.2857142857142857" → "29%"
 */
export function formatSmartMetricValue(
  value: string | number,
  hint?: "ratio" | "count" | "decimal"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return String(value);
  }

  // If explicitly a count or it's a whole number >= 2, treat as count
  if (hint === "count" || (Number.isInteger(num) && num >= 2)) {
    return String(num);
  }

  // If it looks like a ratio (0-1 range), show as percentage
  if (hint === "ratio" || (num >= 0 && num <= 1)) {
    const percentage = Math.round(num * 100);
    return `${percentage}%`;
  }

  // Otherwise format as decimal
  return formatMetricValue(num, 2);
}
