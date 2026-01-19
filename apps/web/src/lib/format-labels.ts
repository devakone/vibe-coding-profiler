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
