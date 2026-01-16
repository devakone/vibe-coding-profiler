/**
 * @bolokono/core
 *
 * Shared analysis logic, types, and utilities for Bolokono.
 */

// =============================================================================
// Types
// =============================================================================

export interface CommitEvent {
  sha: string;
  message: string;
  author_date: string;
  committer_date: string;
  author_email: string;
  files_changed: number;
  additions: number;
  deletions: number;
  parents: string[];
}

export type BuildCategory =
  | "setup"
  | "auth"
  | "feature"
  | "test"
  | "infra"
  | "docs"
  | "refactor"
  | "fix"
  | "style"
  | "chore"
  | "unknown";

export interface AnalysisMetrics {
  // Volume
  total_commits: number;
  total_additions: number;
  total_deletions: number;
  total_files_changed: number;

  // Timing
  first_commit_date: string;
  last_commit_date: string;
  active_days: number;
  span_days: number;

  // Commit size distribution
  commit_size_p50: number;
  commit_size_p90: number;
  commit_size_mean: number;
  commit_size_stddev: number;

  // Frequency
  commits_per_active_day_mean: number;
  commits_per_active_day_max: number;

  // Rhythm
  hours_between_commits_p50: number;
  hours_between_commits_p90: number;
  burstiness_score: number;

  // Message analysis
  message_length_p50: number;
  message_length_p90: number;
  conventional_commit_ratio: number;

  // Iteration patterns
  fix_commit_ratio: number;
  fixup_sequence_count: number;

  // Build sequence
  category_first_occurrence: Record<BuildCategory, number>;
  category_distribution: Record<BuildCategory, number>;

  // Merge behavior
  merge_commit_ratio: number;

  // Confidence
  data_quality_score: number;
}

export type BolokonoTypeName =
  | "foundation-first"
  | "auth-first"
  | "vertical-slice"
  | "incremental"
  | "fix-forward"
  | "test-driven"
  | "documentation-forward"
  | "refactor-driven"
  | "unique";

export interface BolokonoType {
  id: BolokonoTypeName;
  name: string;
  description: string;
}

export interface AnalysisReport {
  bolokono_type: BolokonoTypeName | null;
  confidence: "high" | "medium" | "low";
  narrative: {
    summary: string;
    sections: Array<{
      title: string;
      content: string;
      evidence: string[];
    }>;
    highlights: Array<{
      metric: string;
      value: string;
      interpretation: string;
    }>;
  };
  matched_criteria: string[];
}

export type JobStatus = "queued" | "running" | "done" | "error";

// =============================================================================
// Constants
// =============================================================================

export const BOLOKONO_TYPES: Record<BolokonoTypeName, BolokonoType> = {
  "foundation-first": {
    id: "foundation-first",
    name: "Foundation-First Craft",
    description: "Builds infrastructure and setup before features.",
  },
  "auth-first": {
    id: "auth-first",
    name: "Auth-First Craft",
    description: "Prioritizes authentication and security early.",
  },
  "vertical-slice": {
    id: "vertical-slice",
    name: "Vertical-Slice Craft",
    description: "Builds complete features end-to-end before moving on.",
  },
  incremental: {
    id: "incremental",
    name: "Incremental Craft",
    description: "Builds in small, steady increments.",
  },
  "fix-forward": {
    id: "fix-forward",
    name: "Fix-Forward Craft",
    description: "Quickly iterates with fixes after initial implementation.",
  },
  "test-driven": {
    id: "test-driven",
    name: "Test-Driven Craft",
    description: "Tests appear early and consistently.",
  },
  "documentation-forward": {
    id: "documentation-forward",
    name: "Documentation-Forward Craft",
    description: "Documentation is treated as first-class.",
  },
  "refactor-driven": {
    id: "refactor-driven",
    name: "Refactor-Driven Craft",
    description: "Regularly restructures code as understanding grows.",
  },
  unique: {
    id: "unique",
    name: "Unique Craft",
    description: "A distinctive pattern that doesn't fit standard archetypes.",
  },
};

export const MIN_COMMITS_FOR_ANALYSIS = 5;
export const MIN_COMMITS_FOR_TYPE = 10;
export const HIGH_CONFIDENCE_THRESHOLD = 50;

// =============================================================================
// Utilities
// =============================================================================

export function classifyCommit(message: string): BuildCategory {
  const subject = message.split("\n")[0].trim().toLowerCase();

  // Priority 1: Conventional commit prefixes
  if (/^feat(\(.+\))?:/.test(subject)) return "feature";
  if (/^fix(\(.+\))?:/.test(subject)) return "fix";
  if (/^test(\(.+\))?:/.test(subject)) return "test";
  if (/^docs(\(.+\))?:/.test(subject)) return "docs";
  if (/^style(\(.+\))?:/.test(subject)) return "style";
  if (/^refactor(\(.+\))?:/.test(subject)) return "refactor";
  if (/^chore(\(.+\))?:/.test(subject)) return "chore";
  if (/^(ci|build)(\(.+\))?:/.test(subject)) return "infra";

  // Priority 2: Conventional commit scope overrides
  if (/^\w+\(auth\):/.test(subject)) return "auth";
  if (/^\w+\((setup|init)\):/.test(subject)) return "setup";

  // Priority 3: Keyword matching
  if (/^initial|^init\b|^bootstrap|^scaffold|\bsetup\b|\bboilerplate\b/.test(subject)) return "setup";
  if (/\bauth|\blogin\b|\blogout\b|\bsign.?in\b|\bsign.?up\b|\bsession\b|\boauth\b|\bjwt\b/.test(subject)) return "auth";
  if (/\btest|\bspec\b/.test(subject)) return "test";
  if (/\bfix|\bbug|\bpatch\b|\bhotfix\b|\bresolve\b/.test(subject)) return "fix";
  if (/\breadme\b|\bdoc(s|umentation)?\b|\bchangelog\b/.test(subject)) return "docs";
  if (/\bci\b|\bcd\b|\bdeploy|\bdocker|\bkubernetes\b|\bk8s\b|\bgithub.?action|\bworkflow\b|\binfra/.test(subject)) return "infra";
  if (/\brefactor|\brestructure|\breorganize|\bcleanup\b|\bclean.?up\b/.test(subject)) return "refactor";
  if (/\blint|\bformat|\bprettier\b|\beslint\b/.test(subject)) return "style";
  if (/\bchore\b|\bdeps?\b|\bdependenc|\bbump\b|\bupgrade\b|\bupdate\b.*version/.test(subject)) return "chore";

  // Priority 4: Feature as default for substantive commits
  if (/\badd|\bimplement|\bcreate\b|\bnew\b|\bintroduce\b/.test(subject)) return "feature";

  return "unknown";
}

export function calculateBurstiness(commitTimestamps: Date[]): number {
  if (commitTimestamps.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < commitTimestamps.length; i++) {
    const hours =
      (commitTimestamps[i].getTime() - commitTimestamps[i - 1].getTime()) /
      (1000 * 60 * 60);
    intervals.push(hours);
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const stddev = Math.sqrt(
    intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
      intervals.length
  );

  // Burstiness: (stddev - mean) / (stddev + mean)
  // Range: -1 (perfectly regular) to +1 (highly bursty)
  if (stddev + mean === 0) return 0;
  return (stddev - mean) / (stddev + mean);
}

export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
