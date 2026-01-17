/**
 * @vibed/core
 *
 * Shared analysis logic, types, and utilities for Vibed Coding.
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
  /**
   * List of file paths changed in this commit.
   * Optional for backwards compatibility - older data may not have this.
   * Used for subsystem detection, episode breadth, and first-touch metrics.
   */
  file_paths?: string[];
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

export type VibeTypeName =
  | "foundation-first"
  | "auth-first"
  | "vertical-slice"
  | "incremental"
  | "fix-forward"
  | "test-driven"
  | "documentation-forward"
  | "refactor-driven"
  | "unique";

export interface VibeType {
  id: VibeTypeName;
  name: string;
  description: string;
}

export interface AnalysisReport {
  vibe_type: VibeTypeName | null;
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

export type AnalysisInsightConfidence = "high" | "medium" | "low";

export type AnalysisInsightTimeWindow = "mornings" | "afternoons" | "evenings" | "late_nights";

export type AnalysisInsightChunkiness = "slicer" | "mixer" | "chunker";

export type PersonaId =
  | "spec-architect"
  | "test-validator"
  | "vibe-prototyper"
  | "agent-orchestrator"
  | "specialist-consultant"
  | "infra-architect"
  | "debugger-risk-taker"
  | "reflective-balancer";

export interface AnalysisInsightPersona {
  id: PersonaId;
  label: string;
  description: string;
  confidence: AnalysisInsightConfidence;
  archetypes: string[];
  evidence_shas: string[];
}

export interface AnalysisInsightTechSignals {
  source: "commit_message_keywords";
  top_terms: Array<{ term: string; count: number }>;
  confidence: AnalysisInsightConfidence;
}

export interface AnalysisInsightShareTemplate {
  colors: {
    primary: string;
    accent: string;
  };
  headline: string;
  subhead: string;
  metrics: Array<{ label: string; value: string }>;
  persona_archetype: {
    label: string;
    archetypes: string[];
  };
}

export interface AnalysisInsightPersonaDelta {
  from: PersonaId | null;
  to: PersonaId;
  note: string;
  evidence_shas: string[];
}

interface PersonaDescriptor {
  label: string;
  description: string;
  archetypes: string[];
  color: string;
  accent: string;
}

const PERSONA_DESCRIPTORS: Record<PersonaId, PersonaDescriptor> = {
  "spec-architect": {
    label: "Spec-Driven Architect",
    description: "Plans thoroughly before touching code; constraints are part of every decision.",
    archetypes: ["Shuri", "Nya", "Bix Caleen"],
    color: "#7C3AED",
    accent: "#C084FC",
  },
  "test-validator": {
    label: "Test-First Validator",
    description: "Test suites act as the contract; AI suggests code only after tests exist.",
    archetypes: ["Hermione Granger", "Shuri (mentor side)", "Kira Yukimura"],
    color: "#10B981",
    accent: "#6EE7B7",
  },
  "vibe-prototyper": {
    label: "Vibe Prototyper",
    description: "Explores ideas by prompt, iterates fast, and adapts on instinct.",
    archetypes: ["Mirabel Madrigal", "Aisha (Insecure)", "Naru"],
    color: "#F97316",
    accent: "#FDBA74",
  },
  "agent-orchestrator": {
    label: "Multi-Agent Orchestrator",
    description: "Coordinates autonomous agents/worktrees to conquer complex change.",
    archetypes: ["River Tam", "Chihiro", "Commander Adama"],
    color: "#0EA5E9",
    accent: "#7DD3FC",
  },
  "specialist-consultant": {
    label: "Specialist Consultant",
    description: "Assigns roles, libraries, and review steps with an architect’s precision.",
    archetypes: ["General Antiope", "Commander Kallus", "Zoe Washburne"],
    color: "#F472B6",
    accent: "#F9A8D4",
  },
  "infra-architect": {
    label: "Infrastructure Architect",
    description: "Enforces governance across services while enabling safe evolution.",
    archetypes: ["T'Challa", "Korra", "N'Jobu"],
    color: "#22D3EE",
    accent: "#7DD3FC",
  },
  "debugger-risk-taker": {
    label: "Rapid Risk-Taker",
    description: "Dives into hotfixes with urgency; loves hands-on debugging.",
    archetypes: ["Riri Williams / Ironheart", "Okoye", "Nakoma"],
    color: "#EF4444",
    accent: "#FCA5A5",
  },
  "reflective-balancer": {
    label: "Reflective Balancer",
    description: "Bridges creativity and discipline, reflecting before moving forward.",
    archetypes: ["Nakia", "Briar Rose", "Capheus"],
    color: "#0F766E",
    accent: "#5EEAD4",
  },
};

const INSIGHT_SOURCES = [
  "docs/research/ai-era-coding-personas.md",
  "docs/research/ai-era-developer-personas-chatgpt.md",
];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayName(weekday: number | null): string | null {
  if (weekday === null) return null;
  return WEEKDAY_NAMES[weekday] ?? null;
}

function formatWindowLabel(window: AnalysisInsightTimeWindow | null): string {
  if (!window) return "steady";
  if (window === "mornings") return "Mornings";
  if (window === "afternoons") return "Afternoons";
  if (window === "evenings") return "Evenings";
  return "Late nights";
}

function personaConfidenceFromScore(bestScore: number, totalScore: number): AnalysisInsightConfidence {
  const ratio = bestScore / Math.max(1, totalScore);
  if (ratio >= 0.4) return "high";
  if (ratio >= 0.2) return "medium";
  return "low";
}

interface PersonaDetectionArgs {
  totalCommits: number;
  docEvidence: string[];
  agentEvidence: string[];
  testCount: number;
  featureCount: number;
  fixCount: number;
  setupCount: number;
  docsCount: number;
  authCount: number;
  infraCount: number;
  chunkLabel: AnalysisInsightChunkiness | null;
  avgFilesChanged: number | null;
  highFileCommitRatio: number;
  fixAfterFeatureCount: number;
  patterns: boolean;
  evidenceByCategory: Map<BuildCategory, string[]>;
}

interface PersonaDetectionResult {
  persona: AnalysisInsightPersona;
  delta: AnalysisInsightPersonaDelta[];
}

function detectPersona(args: PersonaDetectionArgs): PersonaDetectionResult {
  const {
    totalCommits,
    docEvidence,
    agentEvidence,
    testCount,
    featureCount,
    fixCount,
    setupCount,
    docsCount,
    authCount,
    infraCount,
    chunkLabel,
    highFileCommitRatio,
    fixAfterFeatureCount,
    patterns,
    evidenceByCategory,
  } = args;

  const personaScores: Record<PersonaId, number> = {
    "spec-architect": 0,
    "test-validator": 0,
    "vibe-prototyper": 0,
    "agent-orchestrator": 0,
    "specialist-consultant": 0,
    "infra-architect": 0,
    "debugger-risk-taker": 0,
    "reflective-balancer": 0,
  };

  const personaEvidence: Record<PersonaId, Set<string>> = {
    "spec-architect": new Set(),
    "test-validator": new Set(),
    "vibe-prototyper": new Set(),
    "agent-orchestrator": new Set(),
    "specialist-consultant": new Set(),
    "infra-architect": new Set(),
    "debugger-risk-taker": new Set(),
    "reflective-balancer": new Set(),
  };

  const addScore = (id: PersonaId, value: number, evidence?: string[]) => {
    if (value <= 0) return;
    personaScores[id] += value;
    evidence?.forEach((sha) => personaEvidence[id].add(sha));
  };

  if (docEvidence.length > 0) {
    addScore("spec-architect", docEvidence.length, docEvidence);
  }

  if (patterns) {
    addScore("spec-architect", 1, docEvidence.slice(0, 1));
  }

  const docRatio =
    totalCommits === 0 ? 0 : (setupCount + docsCount + authCount) / Math.max(1, totalCommits);
  if (docRatio >= 0.15) {
    addScore("spec-architect", 1, docEvidence.slice(0, 1));
  }

  const testEvidence = evidenceByCategory.get("test") ?? [];
  if (testCount > 0) {
    addScore("test-validator", testCount, testEvidence);
  }

  if (chunkLabel === "chunker") {
    addScore("agent-orchestrator", 2, agentEvidence);
  } else if (chunkLabel === "mixer") {
    addScore("agent-orchestrator", 1, agentEvidence);
  }

  if (args.avgFilesChanged !== null && args.avgFilesChanged >= 6) {
    addScore("agent-orchestrator", 1, agentEvidence);
  }

  if (highFileCommitRatio >= 0.2) {
    addScore("agent-orchestrator", highFileCommitRatio * 3, agentEvidence);
  }

  if (fixAfterFeatureCount >= 2) {
    addScore("debugger-risk-taker", fixAfterFeatureCount, evidenceByCategory.get("fix"));
  }

  if (fixCount > featureCount) {
    addScore("debugger-risk-taker", 1, evidenceByCategory.get("fix"));
  }

  if (infraCount >= 3) {
    addScore("infra-architect", infraCount, evidenceByCategory.get("infra"));
  }

  if (testCount > 0 && docEvidence.length > 0) {
    addScore("specialist-consultant", 2, [...docEvidence, ...testEvidence]);
  }

  if (totalCommits <= 30) {
    addScore("vibe-prototyper", totalCommits > 0 ? 1 : 0, evidenceByCategory.get("feature"));
  }

  if (chunkLabel === "slicer" || chunkLabel === "mixer") {
    addScore("vibe-prototyper", chunkLabel === "slicer" ? 1.5 : 0.8, evidenceByCategory.get("feature"));
  }

  if (Object.values(personaScores).every((score) => score === 0)) {
    addScore("reflective-balancer", 1, docEvidence);
  }

  const sorted = Object.entries(personaScores) as Array<[PersonaId, number]>;
  sorted.sort((a, b) => b[1] - a[1]);
  const [bestId, bestScore] = sorted[0];
  const totalScore = Object.values(personaScores).reduce((sum, value) => sum + value, 0) || 1;
  const confidence = personaConfidenceFromScore(bestScore, totalScore);

  const descriptor = PERSONA_DESCRIPTORS[bestId];
  const persona: AnalysisInsightPersona = {
    id: bestId,
    label: descriptor.label,
    description: descriptor.description,
    confidence,
    archetypes: descriptor.archetypes,
    evidence_shas: Array.from(personaEvidence[bestId]).slice(0, 5),
  };

  const delta: AnalysisInsightPersonaDelta[] = [
    {
      from: null,
      to: bestId,
      note: `Detected as ${descriptor.label} based on observed signals.`,
      evidence_shas: persona.evidence_shas,
    },
  ];

  return { persona, delta };
}

function buildShareTemplate(
  persona: AnalysisInsightPersona,
  streak: ReturnType<typeof longestStreakUtc>,
  peakWindow: AnalysisInsightTimeWindow | null,
  chunkLabel: AnalysisInsights["chunkiness"]["label"],
  featuresPerFix: number | null,
  peakWeekday: number | null
): AnalysisInsightShareTemplate {
  const streakValue =
    streak.days > 0 ? `${streak.days} day${streak.days === 1 ? "" : "s"}` : "No streak yet";

  const scopeLabel =
    chunkLabel === "chunker"
      ? "Wide scope"
      : chunkLabel === "mixer"
        ? "Balanced"
        : chunkLabel === "slicer"
          ? "Focused"
          : "Steady";

  const metrics = [
    { label: "Longest streak", value: streakValue },
    { label: "Peak window", value: formatWindowLabel(peakWindow) },
    { label: "Commit scope", value: scopeLabel },
  ];

  if (featuresPerFix !== null) {
    metrics.push({
      label: "Feature / Fix ratio",
      value: featuresPerFix >= 1 ? `${featuresPerFix.toFixed(2)} features per fix` : `${(1 / featuresPerFix).toFixed(2)} fixes per feature`,
    });
  }

  const personaDescriptor = PERSONA_DESCRIPTORS[persona.id];

  return {
    colors: {
      primary: personaDescriptor.color,
      accent: personaDescriptor.accent,
    },
    headline: `Vibed as ${persona.label}`,
    subhead: `Confidence: ${persona.confidence}`,
    metrics,
    persona_archetype: {
      label: persona.label,
      archetypes: persona.archetypes,
    },
  };
}

export interface AnalysisInsights {
  version: string;
  timezone: "UTC";
  generated_at: string;
  totals: {
    commits: number;
  };
  streak: {
    longest_days: number;
    start_day: string | null;
    end_day: string | null;
    confidence: AnalysisInsightConfidence;
    evidence_shas: string[];
  };
  timing: {
    top_weekdays: Array<{ weekday: number; count: number }>;
    peak_weekday: number | null;
    peak_hour: number | null;
    peak_window: AnalysisInsightTimeWindow | null;
    confidence: AnalysisInsightConfidence;
    evidence_shas: string[];
  };
  commits: {
    top_category: BuildCategory | null;
    category_counts: Record<BuildCategory, number>;
    features: number;
    fixes: number;
    features_per_fix: number | null;
    fixes_per_feature: number | null;
    confidence: AnalysisInsightConfidence;
    evidence_shas: string[];
  };
  chunkiness: {
    avg_files_changed: number | null;
    label: AnalysisInsightChunkiness | null;
    confidence: AnalysisInsightConfidence;
    evidence_shas: string[];
  };
  patterns: {
    auth_then_roles: boolean | null;
    confidence: AnalysisInsightConfidence;
    evidence_shas: string[];
  };
  tech: AnalysisInsightTechSignals;
  persona: AnalysisInsightPersona;
  share_template: AnalysisInsightShareTemplate;
  persona_delta: AnalysisInsightPersonaDelta[];
  tech_signals: AnalysisInsightTechSignals;
  sources: string[];
  disclaimers: string[];
}

export type JobStatus = "queued" | "running" | "done" | "error";

// =============================================================================
// Constants
// =============================================================================

export const VIBE_TYPES: Record<VibeTypeName, VibeType> = {
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

/**
 * Detects if a commit is from automation/bots (release-please, dependabot, renovate, etc.)
 */
export function isAutomationCommit(event: CommitEvent): boolean {
  const subject = event.message.split("\n")[0].trim().toLowerCase();
  const email = event.author_email.toLowerCase();

  // Common bot email patterns
  const botEmails = [
    "release-please",
    "dependabot",
    "renovate",
    "github-actions",
    "semantic-release",
    "greenkeeper",
    "snyk-bot",
    "imgbot",
    "allcontributors",
    "kodiak",
    "mergify",
    "bot@",
    "noreply@github.com",
    "[bot]",
  ];

  if (botEmails.some((pattern) => email.includes(pattern))) {
    return true;
  }

  // Common automation commit message patterns
  const automationPatterns = [
    /^chore\(main\): release/i,
    /^chore\(release\):/i,
    /^release:/i,
    /^bump version/i,
    /^bump .* from .* to/i,
    /^\[bot\]/i,
    /^\[automated\]/i,
    /^auto-generated/i,
    /^update dependencies/i,
    /^chore\(deps\):/i,
    /^chore\(deps-dev\):/i,
    /^build\(deps\):/i,
    /^build\(deps-dev\):/i,
    /^merge pull request #\d+ from dependabot/i,
    /^merge pull request #\d+ from renovate/i,
  ];

  return automationPatterns.some((pattern) => pattern.test(subject));
}

/**
 * Filters out automation/bot commits from an array of commit events
 */
export function filterAutomationCommits(events: CommitEvent[]): CommitEvent[] {
  return events.filter((e) => !isAutomationCommit(e));
}

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
export * from "./vibe";

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

export function assignVibeType(metrics: AnalysisMetrics): {
  vibe_type: VibeTypeName | null;
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

  let vibe_type: VibeTypeName | null = null;
  if (setupEarly) vibe_type = "foundation-first";
  else if (authEarly) vibe_type = "auth-first";
  else if (testsEarly) vibe_type = "test-driven";
  else if (docsEarly && docsRatio >= 0.15) vibe_type = "documentation-forward";
  else if (refactorRatio >= 0.25) vibe_type = "refactor-driven";
  else if (fixRatio >= 0.3) vibe_type = "fix-forward";
  else if (metrics.commit_size_p50 > 0 && metrics.commit_size_p50 <= 40 && metrics.burstiness_score < 0.2)
    vibe_type = "incremental";
  else vibe_type = "unique";

  let confidence: AnalysisReport["confidence"] = "low";
  if (metrics.total_commits >= MIN_COMMITS_FOR_TYPE && metrics.data_quality_score >= HIGH_CONFIDENCE_THRESHOLD)
    confidence = "medium";
  if (metrics.total_commits >= 50 && metrics.data_quality_score >= 75) confidence = "high";

  return { vibe_type, confidence, matched_criteria };
}

function utcDayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function utcDayFromKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function timeWindowUtc(hour: number): AnalysisInsights["timing"]["peak_window"] {
  if (hour >= 5 && hour <= 11) return "mornings";
  if (hour >= 12 && hour <= 16) return "afternoons";
  if (hour >= 17 && hour <= 21) return "evenings";
  return "late_nights";
}

function toCountsRecord<K extends string>(all: K[], map: Map<K, number>): Record<K, number> {
  return Object.fromEntries(all.map((k) => [k, map.get(k) ?? 0])) as Record<K, number>;
}

function meanNumber(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function topNFromMap<T extends string | number>(map: Map<T, number>, n: number): Array<{ key: T; count: number }> {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function longestStreakUtc(dayKeys: string[]): { days: number; start: string | null; end: string | null } {
  const unique = Array.from(new Set(dayKeys));
  const dates = unique
    .map((k) => ({ key: k, d: utcDayFromKey(k) }))
    .filter((x): x is { key: string; d: Date } => Boolean(x.d))
    .sort((a, b) => a.d.getTime() - b.d.getTime());

  let best = { days: 0, start: null as string | null, end: null as string | null };
  let current = { days: 0, start: null as string | null, end: null as string | null };

  for (let i = 0; i < dates.length; i++) {
    const prev = dates[i - 1];
    const cur = dates[i];
    if (!prev) {
      current = { days: 1, start: cur.key, end: cur.key };
    } else {
      const deltaDays = Math.round((cur.d.getTime() - prev.d.getTime()) / (1000 * 60 * 60 * 24));
      if (deltaDays === 1) current = { days: current.days + 1, start: current.start, end: cur.key };
      else current = { days: 1, start: cur.key, end: cur.key };
    }
    if (current.days > best.days) best = { ...current };
  }

  return best;
}

function confidenceFromCommits(totalCommits: number): AnalysisInsightConfidence {
  if (totalCommits >= 50) return "high";
  if (totalCommits >= 15) return "medium";
  return "low";
}

export function computeAnalysisInsights(events: CommitEvent[]): AnalysisInsights {
  // Filter out automation/bot commits for cleaner insights
  const humanCommits = filterAutomationCommits(events);

  const byTimeAsc = [...humanCommits].sort(
    (a, b) => new Date(a.committer_date).getTime() - new Date(b.committer_date).getTime()
  );

  const totalCommits = byTimeAsc.length;
  const confidence = confidenceFromCommits(totalCommits);

  const dayCounts = new Map<string, number>();
  const weekdayCounts = new Map<number, number>();
  const hourCounts = new Map<number, number>();
  const categoryCounts = new Map<BuildCategory, number>();
  const filesChanged: number[] = [];

  const evidenceByWeekday = new Map<number, string[]>();
  const evidenceByWindow = new Map<AnalysisInsights["timing"]["peak_window"], string[]>();
  const evidenceByCategory = new Map<BuildCategory, string[]>();

  const docKeywordRegex = /\b(doc|docs|documentation|architecture|design|spec|plan|adr|blueprint)\b/i;
  const agentKeywordRegex = /\b(agent|agentic|cursor|autonomous|auto-?gpt)\b/i;

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

  let prevCategory: BuildCategory | null = null;
  let fixAfterFeatureCount = 0;
  const docEvidence: string[] = [];
  const agentEvidence: string[] = [];

  for (const e of byTimeAsc) {
    const dayKey = utcDayKey(e.committer_date);
    if (dayKey) dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);

    const d = new Date(e.committer_date);
    if (!Number.isNaN(d.getTime())) {
      const dow = d.getUTCDay();
      const hour = d.getUTCHours();
      weekdayCounts.set(dow, (weekdayCounts.get(dow) ?? 0) + 1);
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
      if ((evidenceByWeekday.get(dow) ?? []).length < 5) {
        evidenceByWeekday.set(dow, [...(evidenceByWeekday.get(dow) ?? []), e.sha]);
      }

      const w = timeWindowUtc(hour);
      if ((evidenceByWindow.get(w) ?? []).length < 5) {
        evidenceByWindow.set(w, [...(evidenceByWindow.get(w) ?? []), e.sha]);
      }
    }

    const category = classifyCommit(e.message);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    if ((evidenceByCategory.get(category) ?? []).length < 5) {
      evidenceByCategory.set(category, [...(evidenceByCategory.get(category) ?? []), e.sha]);
    }

    const subject = (e.message.split("\n")[0] ?? "").toLowerCase();
    if (docKeywordRegex.test(subject) && docEvidence.length < 5) {
      docEvidence.push(e.sha);
    }
    if (agentKeywordRegex.test(subject) && agentEvidence.length < 5) {
      agentEvidence.push(e.sha);
    }

    if (Number.isFinite(e.files_changed)) filesChanged.push(e.files_changed);

    if (category === "fix" && prevCategory === "feature") {
      fixAfterFeatureCount += 1;
    }
    prevCategory = category;
  }

  const streak = longestStreakUtc(Array.from(dayCounts.keys()));
  const topWeekdays = topNFromMap(weekdayCounts, 2).map((x) => ({ weekday: x.key, count: x.count }));
  const peakWeekday = topWeekdays[0]?.weekday ?? null;
  const peakHour = topNFromMap(hourCounts, 1)[0]?.key ?? null;
  const peakWindow = peakHour !== null ? timeWindowUtc(peakHour) : null;

  const topCategory = topNFromMap(categoryCounts, 1)[0]?.key ?? null;
  const features = categoryCounts.get("feature") ?? 0;
  const fixes = categoryCounts.get("fix") ?? 0;

  const featuresPerFix = fixes > 0 ? features / fixes : null;
  const fixesPerFeature = features > 0 ? fixes / features : null;

  const avgFiles = meanNumber(filesChanged);
  const chunkLabel: AnalysisInsights["chunkiness"]["label"] =
    avgFiles === null ? null : avgFiles >= 6 ? "chunker" : avgFiles >= 3 ? "mixer" : "slicer";

  const authIndex = byTimeAsc.findIndex((e) => classifyCommit(e.message) === "auth");
  const rolesIndex = byTimeAsc.findIndex((e) =>
    /(\brole\b|\broles\b|\brbac\b|\bpermission(s)?\b|\bacl\b|\baccess control\b)/i.test(
      e.message.split("\n")[0] ?? ""
    )
  );

  const patterns = {
    auth_then_roles:
      authIndex !== -1 && rolesIndex !== -1 && rolesIndex > authIndex && rolesIndex - authIndex <= 12,
    evidence_shas:
      authIndex !== -1 && rolesIndex !== -1
        ? [byTimeAsc[authIndex]?.sha, byTimeAsc[rolesIndex]?.sha].filter(
            (s): s is string => typeof s === "string"
          )
        : [],
  };

  const patternsConfidence = totalCommits >= 20 ? "medium" : confidence;

  const techTerms = [
    "react",
    "next",
    "supabase",
    "postgres",
    "docker",
    "kubernetes",
    "tailwind",
    "typescript",
    "node",
    "python",
    "go",
    "rust",
    "terraform",
    "aws",
    "gcp",
    "azure",
    "vercel",
    "prisma",
  ];

  const techCounts = new Map<string, number>();
  for (const e of byTimeAsc) {
    const subject = (e.message.split("\n")[0] ?? "").toLowerCase();
    for (const t of techTerms) {
      if (subject.includes(t)) techCounts.set(t, (techCounts.get(t) ?? 0) + 1);
    }
  }

  const topTech = topNFromMap(techCounts, 3)
    .filter((t) => t.count >= 2)
    .map((t) => ({ term: String(t.key), count: t.count }));

  const categoryCountsRecord = toCountsRecord(allCategories, categoryCounts);

  const streakEvidence =
    streak.start && streak.end
      ? byTimeAsc
          .filter((e) => {
            const k = utcDayKey(e.committer_date);
            return k !== null && k >= streak.start! && k <= streak.end!;
          })
          .slice(0, 10)
          .map((e) => e.sha)
      : [];

  const timingEvidence = peakWindow !== null ? [...(evidenceByWindow.get(peakWindow) ?? [])] : [];
  const commitsEvidence = topCategory ? [...(evidenceByCategory.get(topCategory) ?? [])] : [];

  const techSignals: AnalysisInsightTechSignals = {
    source: "commit_message_keywords",
    top_terms: topTech,
    confidence: topTech.length > 0 ? confidence : "low",
  };

  const personaResult = detectPersona({
    totalCommits,
    docEvidence,
    testCount: categoryCounts.get("test") ?? 0,
    featureCount: features,
    fixCount: fixes,
    setupCount: categoryCounts.get("setup") ?? 0,
    docsCount: categoryCounts.get("docs") ?? 0,
    authCount: categoryCounts.get("auth") ?? 0,
    infraCount: categoryCounts.get("infra") ?? 0,
    chunkLabel,
    avgFilesChanged: avgFiles,
    highFileCommitRatio: totalCommits === 0 ? 0 : filesChanged.filter((n) => n >= 8).length / totalCommits,
    fixAfterFeatureCount,
    agentEvidence,
    patterns: patterns.auth_then_roles,
    evidenceByCategory,
  });

  const shareTemplate = buildShareTemplate(
    personaResult.persona,
    streak,
    peakWindow,
    chunkLabel,
    featuresPerFix,
    peakWeekday
  );

  const disclaimers = [
    "Insights are computed from commit timestamps and messages only (no file contents).",
    "Time-based insights are computed in UTC for consistency.",
    "These are observational patterns, not judgments.",
  ];

  return {
    version: "0.1.0",
    timezone: "UTC",
    generated_at: new Date().toISOString(),
    totals: { commits: totalCommits },
    streak: {
      longest_days: streak.days,
      start_day: streak.start,
      end_day: streak.end,
      confidence,
      evidence_shas: streakEvidence,
    },
    timing: {
      top_weekdays: topWeekdays,
      peak_weekday: peakWeekday,
      peak_hour: peakHour,
      peak_window: peakWindow,
      confidence,
      evidence_shas: timingEvidence,
    },
    commits: {
      top_category: topCategory,
      category_counts: categoryCountsRecord,
      features,
      fixes,
      features_per_fix: featuresPerFix,
      fixes_per_feature: fixesPerFeature,
      confidence,
      evidence_shas: commitsEvidence,
    },
    chunkiness: {
      avg_files_changed: avgFiles,
      label: chunkLabel,
      confidence,
      evidence_shas: commitsEvidence,
    },
    patterns: {
      auth_then_roles: totalCommits >= 10 ? patterns.auth_then_roles : null,
      confidence: patternsConfidence,
      evidence_shas: patterns.evidence_shas,
    },
    tech: techSignals,
    persona: personaResult.persona,
    share_template: shareTemplate,
    persona_delta: personaResult.delta,
    tech_signals: techSignals,
    sources: INSIGHT_SOURCES,
    disclaimers,
  };
}
