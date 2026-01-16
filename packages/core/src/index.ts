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

export * from "./crypto";

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isConventionalCommit(message: string): boolean {
  const subject = message.split("\n")[0].trim();
  return /^(feat|fix|docs|test|chore|refactor|style|ci|build)(\(.+\))?:\s+.+/.test(subject);
}

export function computeAnalysisMetrics(events: CommitEvent[]): AnalysisMetrics {
  const byTimeAsc = [...events].sort(
    (a, b) => new Date(a.committer_date).getTime() - new Date(b.committer_date).getTime()
  );

  const timestamps = byTimeAsc.map((e) => new Date(e.committer_date));
  const messageLengths = byTimeAsc.map((e) => e.message.length);
  const sizes = byTimeAsc.map((e) => e.additions + e.deletions);

  const total_commits = byTimeAsc.length;
  const total_additions = byTimeAsc.reduce((s, e) => s + e.additions, 0);
  const total_deletions = byTimeAsc.reduce((s, e) => s + e.deletions, 0);
  const total_files_changed = byTimeAsc.reduce((s, e) => s + e.files_changed, 0);

  const first_commit_date = total_commits > 0 ? byTimeAsc[0].committer_date : new Date(0).toISOString();
  const last_commit_date =
    total_commits > 0 ? byTimeAsc[byTimeAsc.length - 1].committer_date : new Date(0).toISOString();

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const commitsByDay = new Map<string, number>();
  for (const t of timestamps) {
    const k = dayKey(t);
    commitsByDay.set(k, (commitsByDay.get(k) ?? 0) + 1);
  }
  const active_days = commitsByDay.size;
  const span_days =
    total_commits > 0
      ? Math.max(
          0,
          Math.ceil(
            (new Date(last_commit_date).getTime() - new Date(first_commit_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const commit_size_p50 = percentile(sizes, 50);
  const commit_size_p90 = percentile(sizes, 90);
  const commit_size_mean = mean(sizes);
  const commit_size_stddev = stddev(sizes);

  const commits_per_active_day_mean = active_days > 0 ? total_commits / active_days : 0;
  const commits_per_active_day_max =
    active_days > 0 ? Math.max(...Array.from(commitsByDay.values())) : 0;

  const intervalsHours: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    intervalsHours.push(
      (timestamps[i].getTime() - timestamps[i - 1].getTime()) / (1000 * 60 * 60)
    );
  }
  const hours_between_commits_p50 = percentile(intervalsHours, 50);
  const hours_between_commits_p90 = percentile(intervalsHours, 90);
  const burstiness_score = calculateBurstiness(timestamps);

  const message_length_p50 = percentile(messageLengths, 50);
  const message_length_p90 = percentile(messageLengths, 90);
  const conventional_commit_ratio =
    total_commits > 0
      ? byTimeAsc.filter((e) => isConventionalCommit(e.message)).length / total_commits
      : 0;

  const categories = byTimeAsc.map((e) => classifyCommit(e.message));
  const allCategories: BuildCategory[] = [
    "setup",
    "auth",
    "feature",
    "test",
    "infra",
    "docs",
    "refactor",
    "fix",
    "style",
    "chore",
    "unknown",
  ];

  const category_first_occurrence = Object.fromEntries(
    allCategories.map((c) => [c, -1])
  ) as Record<BuildCategory, number>;

  const category_distribution = Object.fromEntries(
    allCategories.map((c) => [c, 0])
  ) as Record<BuildCategory, number>;

  categories.forEach((c, idx) => {
    category_distribution[c] += 1;
    if (category_first_occurrence[c] === -1) category_first_occurrence[c] = idx;
  });

  const fix_commit_ratio =
    total_commits > 0 ? categories.filter((c) => c === "fix").length / total_commits : 0;

  let fixup_sequence_count = 0;
  for (let i = 1; i < categories.length; i++) {
    if (categories[i] === "fix" && categories[i - 1] === "feature") fixup_sequence_count += 1;
  }

  const merge_commit_ratio =
    total_commits > 0 ? byTimeAsc.filter((e) => e.parents.length > 1).length / total_commits : 0;

  const hasStatsRatio =
    total_commits > 0 ? byTimeAsc.filter((e) => e.additions + e.deletions > 0).length / total_commits : 0;

  const data_quality_score = clamp(
    Math.round(100 * (0.6 * clamp(total_commits / 100, 0, 1) + 0.4 * hasStatsRatio)),
    0,
    100
  );

  return {
    total_commits,
    total_additions,
    total_deletions,
    total_files_changed,
    first_commit_date,
    last_commit_date,
    active_days,
    span_days,
    commit_size_p50,
    commit_size_p90,
    commit_size_mean,
    commit_size_stddev,
    commits_per_active_day_mean,
    commits_per_active_day_max,
    hours_between_commits_p50,
    hours_between_commits_p90,
    burstiness_score,
    message_length_p50,
    message_length_p90,
    conventional_commit_ratio,
    fix_commit_ratio,
    fixup_sequence_count,
    category_first_occurrence,
    category_distribution,
    merge_commit_ratio,
    data_quality_score,
  };
}

export function assignBolokonoType(metrics: AnalysisMetrics): {
  bolokono_type: BolokonoTypeName | null;
  confidence: AnalysisReport["confidence"];
  matched_criteria: string[];
} {
  const first = metrics.category_first_occurrence;
  const dist = metrics.category_distribution;
  const total = metrics.total_commits || 1;

  const matched_criteria: string[] = [];

  const setupEarly = first.setup !== -1 && (first.feature === -1 || first.setup < first.feature);
  const authEarly = first.auth !== -1 && (first.feature === -1 || first.auth < first.feature);
  const testsEarly = first.test !== -1 && (first.feature === -1 || first.test < first.feature);
  const docsEarly = first.docs !== -1 && (first.feature === -1 || first.docs < first.feature);

  if (setupEarly) matched_criteria.push("setup-before-feature");
  if (authEarly) matched_criteria.push("auth-before-feature");
  if (testsEarly) matched_criteria.push("tests-before-feature");
  if (docsEarly) matched_criteria.push("docs-before-feature");

  const docsRatio = dist.docs / total;
  const refactorRatio = dist.refactor / total;
  const fixRatio = dist.fix / total;

  if (docsRatio >= 0.2) matched_criteria.push("high-docs-ratio");
  if (refactorRatio >= 0.2) matched_criteria.push("high-refactor-ratio");
  if (fixRatio >= 0.25) matched_criteria.push("high-fix-ratio");

  let bolokono_type: BolokonoTypeName | null = null;
  if (setupEarly) bolokono_type = "foundation-first";
  else if (authEarly) bolokono_type = "auth-first";
  else if (testsEarly) bolokono_type = "test-driven";
  else if (docsEarly && docsRatio >= 0.15) bolokono_type = "documentation-forward";
  else if (refactorRatio >= 0.25) bolokono_type = "refactor-driven";
  else if (fixRatio >= 0.3) bolokono_type = "fix-forward";
  else if (metrics.commit_size_p50 > 0 && metrics.commit_size_p50 <= 40 && metrics.burstiness_score < 0.2)
    bolokono_type = "incremental";
  else bolokono_type = "unique";

  let confidence: AnalysisReport["confidence"] = "low";
  if (metrics.total_commits >= MIN_COMMITS_FOR_TYPE && metrics.data_quality_score >= HIGH_CONFIDENCE_THRESHOLD)
    confidence = "medium";
  if (metrics.total_commits >= 50 && metrics.data_quality_score >= 75) confidence = "high";

  return { bolokono_type, confidence, matched_criteria };
}
