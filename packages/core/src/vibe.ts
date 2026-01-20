/**
 * Vibe Coding Identity System (v1)
 *
 * Deterministic computation of vibe axes and persona detection.
 * LLM is used only to narrate, not to decide.
 */

// =============================================================================
// Types
// =============================================================================

export type Confidence = "high" | "medium" | "low";
export type Level = "low" | "medium" | "high";

export type EvidenceType =
  | "metric"
  | "commit"
  | "pr"
  | "commit_stat"
  | "pr_stat"
  | "sequence"
  | "episode";

export interface EvidenceRef {
  source: "commits" | "prs" | "metrics" | "episodes";
  sha?: string;
  number?: number;
  key?: string;
  episode_id?: string;
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  label: string;
  detail: string;
  ref: EvidenceRef;
  confidence: Confidence;
}

export interface AxisValue {
  score: number; // 0-100
  level: Level;
  why: string[]; // evidence ids
}

export interface VibeAxes {
  automation_heaviness: AxisValue;
  guardrail_strength: AxisValue;
  iteration_loop_intensity: AxisValue;
  planning_signal: AxisValue;
  surface_area_per_change: AxisValue;
  shipping_rhythm: AxisValue;
}

export type VibePersonaId =
  | "prompt_sprinter"
  | "guardrailed_viber"
  | "spec_first_director"
  | "vertical_slice_shipper"
  | "fix_loop_hacker"
  | "toolsmith_viber"
  | "infra_weaver"
  | "rapid_risk_taker"
  | "balanced_builder";

export interface PersonaRuleDiagnostic {
  id: VibePersonaId;
  name: string;
  satisfiedConditions: string[];
  failedConditions: string[];
  satisfiedRatio: number; // 0-1
  score: number;
}

export interface PersonaDiagnostics {
  isFallback: boolean;
  selection: "strict" | "loose" | "fallback";
  nearMisses: PersonaRuleDiagnostic[]; // rules that were close to matching
  allRuleScores: PersonaRuleDiagnostic[];
  axes: { A: number; B: number; C: number; D: number; E: number; F: number };
  suggestion?: string; // hint if this looks like a missing persona pattern
}

export interface VibePersona {
  id: VibePersonaId;
  name: string;
  tagline: string;
  confidence: Confidence;
  score: number; // 0-100 match score
  matched_rules: string[];
  why: string[]; // evidence ids
  caveats: string[];
  diagnostics?: PersonaDiagnostics;
}

export type InsightCardType =
  | "persona"
  | "axis"
  | "rhythm"
  | "guardrails"
  | "loops"
  | "surface_area"
  | "planning"
  | "tech"
  | "streak";

export interface InsightCard {
  id: string;
  type: InsightCardType;
  title: string;
  value: string;
  subtitle?: string;
  evidence: string[]; // evidence ids
}

export interface VibeInsightsV1 {
  version: "v1";
  generated_at: string;
  axes: VibeAxes;
  persona: VibePersona;
  cards: InsightCard[];
  evidence_index: EvidenceItem[];
}

// =============================================================================
// Input Types
// =============================================================================

export interface PullRequestLite {
  number: number;
  title: string;
  body?: string | null;
  created_at: string;
  merged_at?: string | null;
  closed_at?: string | null;
  state: "open" | "closed";
  merged: boolean;
  merge_method?: "merge" | "squash" | "rebase" | "unknown";
  changed_files?: number | null;
  additions?: number | null;
  deletions?: number | null;
  commits?: number | null;
  linked_issue_count?: number;
  checklist_count?: number;
}

export interface WorkEpisode {
  episode_id: string;
  start: string;
  end: string;
  commit_count: number;
  total_additions: number;
  total_deletions: number;
  total_files_changed: number;
  category_counts: Record<string, number>;
  subsystems_touched: string[];
  quick_fix_count: number;
}

export interface FirstTouchPercentiles {
  tests?: number; // 0..1 fraction of timeline
  ci?: number;
  docs?: number;
  infra?: number;
}

export interface ComputeVibeAxesInput {
  commits: Array<{
    sha: string;
    message: string;
    author_date: string;
    committer_date: string;
    files_changed: number;
    additions: number;
    deletions: number;
  }>;
  metrics: {
    total_commits?: number;
    total_files_changed?: number;
    commit_size_p90?: number;
    fixup_sequence_count?: number;
    fix_commit_ratio?: number;
    conventional_commit_ratio?: number;
    burstiness_score?: number;
    data_quality_score?: number;
    category_distribution?: Record<string, number>;
    category_first_occurrence?: Record<string, number>;
  };
  prs?: PullRequestLite[];
  languages?: Record<string, number>;
  episodes?: WorkEpisode[];
  firstTouch?: FirstTouchPercentiles;
}

export interface ComputeVibeAxesOutput {
  axes: VibeAxes;
  evidence: EvidenceItem[];
}

// =============================================================================
// Subsystem Classification
// =============================================================================

export type Subsystem = "ui" | "api" | "db" | "infra" | "tests" | "docs" | "tools" | "ai_config" | "other";

const SUBSYSTEM_PATTERNS: Array<{ subsystem: Subsystem; patterns: RegExp[] }> = [
  {
    subsystem: "tests",
    patterns: [
      /\.(test|spec)\.[jt]sx?$/i,
      /\/__tests__\//i,
      /\/test\//i,
      /\/tests\//i,
      /\.cy\.[jt]sx?$/i, // Cypress
      /\.e2e\.[jt]sx?$/i,
      /\/e2e\//i,
      /\.stories\.[jt]sx?$/i, // Storybook
    ],
  },
  {
    // ai_config MUST come before docs to catch AI-specific .md files
    subsystem: "ai_config",
    patterns: [
      // Cursor: .cursor/rules/* (current), .cursorrules (legacy)
      // Ref: https://cursor.com/docs/context/rules
      /\.cursor\/rules\//i,
      /\.cursorrules$/i,

      // Claude Code: CLAUDE.md, CLAUDE.local.md, .claude/CLAUDE.md, .claude/rules/*.md
      // Ref: https://code.claude.com/docs/en/memory
      /CLAUDE\.md$/i,
      /CLAUDE\.local\.md$/i,
      /\.claude\/CLAUDE\.md$/i,
      /\.claude\/rules\//i,

      // GitHub Copilot: .github/copilot-instructions.md, .github/instructions/*.instructions.md
      // Also: .github/agents/* (custom agents), .github/prompts/* (reusable prompts)
      // Ref: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
      /\.github\/copilot-instructions\.md$/i,
      /\.github\/instructions\/.*\.instructions\.md$/i,
      /\.github\/agents\//i,
      /\.github\/prompts\//i,

      // AGENTS.md: Cross-tool open convention (can be anywhere in repo)
      // Ref: https://agents.md/
      /AGENTS\.md$/i,

      // Aider: .aider.conf*
      /\.aider\.conf/i,

      // Cline: .clinerules/ folder for version-controlled instructions
      // Ref: https://cline.bot/blog/clinerules-version-controlled-shareable-and-ai-editable-instructions
      /\.clinerules\//i,
      /\.clinerules$/i,
    ],
  },
  {
    subsystem: "docs",
    patterns: [
      /\.md$/i,
      /\.mdx$/i,
      /\/docs?\//i,
      /readme/i,
      /changelog/i,
      /license/i,
      /contributing/i,
      /\.txt$/i,
    ],
  },
  {
    subsystem: "infra",
    patterns: [
      /dockerfile/i,
      /docker-compose/i,
      /\.ya?ml$/i,
      /\.github\//i,
      /\.gitlab/i,
      /terraform/i,
      /\.tf$/i,
      /kubernetes/i,
      /k8s/i,
      /helm/i,
      /\.env/i,
      /\.config\.[jt]s$/i,
      /vite\.config/i,
      /next\.config/i,
      /eslint/i,
      /prettier/i,
      /tsconfig/i,
      /package\.json$/i,
      /package-lock\.json$/i,
      /yarn\.lock$/i,
      /pnpm-lock/i,
      /bun\.lockb$/i,
      /Makefile$/i,
      /\.sh$/i,
    ],
  },
  {
    subsystem: "db",
    patterns: [
      /\/migrations?\//i,
      /\/schema/i,
      /\.sql$/i,
      /\/prisma\//i,
      /\/drizzle\//i,
      /\/supabase\//i,
      /seed/i,
    ],
  },
  {
    subsystem: "api",
    patterns: [
      /\/api\//i,
      /\/routes?\//i,
      /\/controllers?\//i,
      /\/handlers?\//i,
      /\/middleware\//i,
      /\/server\//i,
      /\/functions?\//i,
      /\/graphql\//i,
      /\/trpc\//i,
    ],
  },
  {
    subsystem: "ui",
    patterns: [
      /\/components?\//i,
      /\/pages?\//i,
      /\/app\//i,
      /\/views?\//i,
      /\/layouts?\//i,
      /\/hooks?\//i,
      /\/context\//i,
      /\/store\//i,
      /\.css$/i,
      /\.scss$/i,
      /\.sass$/i,
      /\.less$/i,
      /\.[jt]sx$/i, // JSX/TSX are typically UI
    ],
  },
  {
    subsystem: "tools",
    patterns: [
      /\/cli\//i,
      /\/cli\.[jt]s$/i,
      /\/tools?\//i,
      /\/scripts?\//i,
      /\/bin\//i,
      /\/sdk\//i,
      /\/packages?\//i, // monorepo packages are often libs/tools
      /\/libs?\//i,
      /\/utils?\//i,
      /\/utilities?\//i,
      /\/helpers?\//i,
      /\/commands?\//i,
      /\/plugins?\//i,
      /\/extensions?\//i,
      /\.sh$/i, // shell scripts (if not caught by infra)
      /cliplugin/i,
    ],
  },
];

/**
 * Classify a file path into a subsystem category.
 */
export function classifySubsystem(filePath: string): Subsystem {
  const normalized = filePath.toLowerCase();
  for (const { subsystem, patterns } of SUBSYSTEM_PATTERNS) {
    if (patterns.some((p) => p.test(normalized))) {
      return subsystem;
    }
  }
  return "other";
}

/**
 * Get all unique subsystems touched by a set of file paths.
 */
export function getSubsystemsFromPaths(filePaths: string[]): Subsystem[] {
  const subsystems = new Set<Subsystem>();
  for (const path of filePaths) {
    subsystems.add(classifySubsystem(path));
  }
  return Array.from(subsystems).sort();
}

// =============================================================================
// Episode Builder
// =============================================================================

const DEFAULT_GAP_HOURS = 4; // Gap threshold for separating work episodes

export interface EpisodeCommit {
  sha: string;
  timestamp: Date;
  message: string;
  additions: number;
  deletions: number;
  files_changed: number;
  file_paths: string[];
}

/**
 * Build work episodes from a list of commits.
 * Episodes are separated by gaps of `gapHours` or more between commits.
 */
export function buildWorkEpisodes(
  commits: EpisodeCommit[],
  gapHours: number = DEFAULT_GAP_HOURS
): WorkEpisode[] {
  if (commits.length === 0) return [];

  // Sort by timestamp ascending
  const sorted = [...commits].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const episodes: WorkEpisode[] = [];
  let currentEpisode: EpisodeCommit[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gapMs = curr.timestamp.getTime() - prev.timestamp.getTime();
    const gapHoursActual = gapMs / (1000 * 60 * 60);

    if (gapHoursActual >= gapHours) {
      // End current episode and start new one
      episodes.push(episodeFromCommits(currentEpisode, episodes.length));
      currentEpisode = [curr];
    } else {
      currentEpisode.push(curr);
    }
  }

  // Don't forget the last episode
  if (currentEpisode.length > 0) {
    episodes.push(episodeFromCommits(currentEpisode, episodes.length));
  }

  return episodes;
}

function episodeFromCommits(commits: EpisodeCommit[], index: number): WorkEpisode {
  const start = commits[0].timestamp.toISOString();
  const end = commits[commits.length - 1].timestamp.toISOString();

  const allPaths = commits.flatMap((c) => c.file_paths);
  const subsystemsTouched = getSubsystemsFromPaths(allPaths);

  // Count commits by category (using message classification)
  const categoryCounts: Record<string, number> = {};
  let quickFixCount = 0;

  for (const c of commits) {
    const subject = c.message.split("\n")[0].toLowerCase();
    const category = getEpisodeCategory(subject);
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

    // Quick fix: small change with "fix" in message
    if (
      subject.includes("fix") &&
      c.additions + c.deletions < 50 &&
      c.files_changed <= 3
    ) {
      quickFixCount++;
    }
  }

  return {
    episode_id: `ep_${String(index + 1).padStart(3, "0")}`,
    start,
    end,
    commit_count: commits.length,
    total_additions: commits.reduce((s, c) => s + c.additions, 0),
    total_deletions: commits.reduce((s, c) => s + c.deletions, 0),
    total_files_changed: commits.reduce((s, c) => s + c.files_changed, 0),
    category_counts: categoryCounts,
    subsystems_touched: subsystemsTouched,
    quick_fix_count: quickFixCount,
  };
}

function getEpisodeCategory(subject: string): string {
  if (/^feat(\(.+\))?:/.test(subject) || /\badd\b|\bimplement\b/.test(subject))
    return "feature";
  if (/^fix(\(.+\))?:/.test(subject) || /\bfix\b|\bbug\b/.test(subject))
    return "fix";
  if (/^test(\(.+\))?:/.test(subject) || /\btest\b/.test(subject)) return "test";
  if (/^docs?(\(.+\))?:/.test(subject) || /\bdocs?\b/.test(subject)) return "docs";
  if (/^refactor(\(.+\))?:/.test(subject) || /\brefactor\b/.test(subject))
    return "refactor";
  if (/^chore(\(.+\))?:/.test(subject)) return "chore";
  if (/^(ci|build)(\(.+\))?:/.test(subject)) return "ci";
  return "other";
}

// =============================================================================
// First-Touch Percentile Calculator
// =============================================================================

export interface FirstTouchResult {
  percentiles: FirstTouchPercentiles;
  /** Index in commit sequence where each subsystem first appeared */
  firstIndices: Record<string, number>;
}

/**
 * Calculate when each subsystem first appeared as a percentile of the commit timeline.
 * Returns values 0..1 where 0 = first commit, 1 = last commit.
 */
export function calculateFirstTouchPercentiles(
  commits: Array<{ file_paths?: string[] }>
): FirstTouchResult {
  const totalCommits = commits.length;
  if (totalCommits === 0) {
    return { percentiles: {}, firstIndices: {} };
  }

  const firstIndices: Record<string, number> = {};

  for (let i = 0; i < commits.length; i++) {
    const paths = commits[i].file_paths ?? [];
    for (const path of paths) {
      const subsystem = classifySubsystem(path);
      if (!(subsystem in firstIndices)) {
        firstIndices[subsystem] = i;
      }
    }
  }

  const percentiles: FirstTouchPercentiles = {};
  const denominator = Math.max(1, totalCommits - 1);

  if ("tests" in firstIndices) {
    percentiles.tests = firstIndices.tests / denominator;
  }
  if ("infra" in firstIndices) {
    // CI/infra share the same subsystem for first-touch purposes
    percentiles.ci = firstIndices.infra / denominator;
    percentiles.infra = firstIndices.infra / denominator;
  }
  if ("docs" in firstIndices) {
    percentiles.docs = firstIndices.docs / denominator;
  }

  return { percentiles, firstIndices };
}

// =============================================================================
// Helpers
// =============================================================================

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function toLevel(score: number): Level {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function scoreFromZish(x: number, mid: number, spread: number): number {
  const z = (x - mid) / spread;
  return Math.round(100 * clamp01(0.5 + 0.25 * z));
}

// =============================================================================
// Axis Computation
// =============================================================================

export function computeVibeAxes(input: ComputeVibeAxesInput): ComputeVibeAxesOutput {
  const evidence: EvidenceItem[] = [];
  const addEv = (ev: Omit<EvidenceItem, "id">): string => {
    const id = `ev_${String(evidence.length + 1).padStart(3, "0")}`;
    evidence.push({ id, ...ev });
    return id;
  };

  const metrics = input.metrics ?? {};
  const prs = input.prs ?? [];
  const episodes = input.episodes ?? [];

  // --- Axis A: Automation Heaviness ---
  const totalCommits = metrics.total_commits ?? input.commits?.length ?? 1;
  const totalFilesChanged = metrics.total_files_changed ?? 0;
  const avgFiles = totalFilesChanged / Math.max(1, totalCommits);
  const p90Commit = Number(metrics.commit_size_p90 ?? 0);

  const prChangedFiles = prs
    .map((p) => p.changed_files ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const prP90 = prChangedFiles.length
    ? prChangedFiles[Math.floor(0.9 * (prChangedFiles.length - 1))]
    : 0;

  const evA1 = addEv({
    type: "commit_stat",
    label: "Commit breadth",
    detail: `Average files changed per commit = ${avgFiles.toFixed(1)}`,
    ref: { source: "metrics", key: "avg_files_changed" },
    confidence: "medium",
  });

  const evA2 = addEv({
    type: "commit_stat",
    label: "Large commits exist",
    detail: `p90 commit size (additions+deletions) = ${Math.round(p90Commit)}`,
    ref: { source: "metrics", key: "commit_size_p90" },
    confidence: "medium",
  });

  const evA3 = prP90
    ? addEv({
        type: "pr_stat",
        label: "Large PRs exist",
        detail: `p90 PR changed files = ${prP90}`,
        ref: { source: "prs", number: prs[0]?.number },
        confidence: prs.length >= 10 ? "high" : "medium",
      })
    : undefined;

  const automationScore = Math.round(
    0.5 * scoreFromZish(avgFiles, 4, 4) +
      0.3 * scoreFromZish(p90Commit, 400, 400) +
      0.2 * scoreFromZish(prP90, 25, 25)
  );

  // --- Axis B: Guardrail Strength ---
  const ft = input.firstTouch ?? {};
  const testsFt = typeof ft.tests === "number" ? ft.tests : undefined;
  const ciFt = typeof ft.ci === "number" ? ft.ci : undefined;
  const docsFt = typeof ft.docs === "number" ? ft.docs : undefined;

  const guardrailEarly = (() => {
    const vals = [testsFt, ciFt, docsFt].filter(
      (v): v is number => typeof v === "number"
    );
    if (!vals.length) return 0.5;
    return 1 - vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  const guardrailDensity = (() => {
    const dist = metrics.category_distribution ?? {};
    const total = Math.max(1, totalCommits);
    const guard =
      (dist.test ?? 0) + (dist.docs ?? 0) + (dist.chore ?? 0) + (dist.ci ?? 0);
    return guard / total;
  })();

  const prChecklistRate = prs.length
    ? prs.filter((p) => (p.checklist_count ?? 0) > 0).length / prs.length
    : 0;

  const evB1 = addEv({
    type: "metric",
    label: "Early guardrails",
    detail:
      testsFt != null || ciFt != null || docsFt != null
        ? `First-touch (tests/ci/docs) earlier-than-late average`
        : `First-touch data not available yet`,
    ref: { source: "metrics", key: "firstTouch" },
    confidence:
      testsFt != null || ciFt != null || docsFt != null ? "medium" : "low",
  });

  const evB2 = addEv({
    type: "metric",
    label: "Guardrail density",
    detail: `Share of tests/docs/ci/chore commits = ${(guardrailDensity * 100).toFixed(1)}%`,
    ref: { source: "metrics", key: "category_distribution" },
    confidence: "medium",
  });

  const guardrailScore = Math.round(
    0.5 * Math.round(100 * clamp01(guardrailEarly)) +
      0.3 * Math.round(100 * clamp01(guardrailDensity * 2)) +
      0.2 * Math.round(100 * clamp01(prChecklistRate))
  );

  // --- Axis C: Iteration Loop Intensity ---
  const fixSeq = Number(metrics.fixup_sequence_count ?? 0);
  const total = Math.max(1, totalCommits);
  const fixRatio = Number(metrics.fix_commit_ratio ?? 0);

  const episodeFixDensity = episodes.length
    ? episodes
        .map((e) => (e.category_counts.fix ?? 0) / Math.max(1, e.commit_count))
        .reduce((a, b) => a + b, 0) / episodes.length
    : 0;

  const evC1 = addEv({
    type: "metric",
    label: "Fix-forward sequences",
    detail: `Fix-after-feature sequences = ${fixSeq}`,
    ref: { source: "metrics", key: "fixup_sequence_count" },
    confidence: "medium",
  });

  const evC2 = addEv({
    type: "metric",
    label: "Fix ratio",
    detail: `Fix commits = ${(fixRatio * 100).toFixed(1)}%`,
    ref: { source: "metrics", key: "fix_commit_ratio" },
    confidence: "medium",
  });

  const iterationScore = Math.round(
    0.5 * scoreFromZish(fixSeq / total, 0.12, 0.12) +
      0.3 * Math.round(100 * clamp01(fixRatio)) +
      0.2 * Math.round(100 * clamp01(episodeFixDensity))
  );

  // --- Axis D: Planning Signal ---
  const conv = Number(metrics.conventional_commit_ratio ?? 0);
  const issueLinkRate = prs.length
    ? prs.filter((p) => (p.linked_issue_count ?? 0) > 0).length / prs.length
    : 0;

  const docsFirst = (() => {
    const first = metrics.category_first_occurrence ?? {};
    const docsIdx = first.docs ?? -1;
    const featIdx = first.feature ?? -1;
    if (docsIdx >= 0 && featIdx >= 0) return docsIdx < featIdx ? 1 : 0;
    return 0.5;
  })();

  const evD1 = addEv({
    type: "metric",
    label: "Structured commits",
    detail: `Conventional commit ratio = ${(conv * 100).toFixed(1)}%`,
    ref: { source: "metrics", key: "conventional_commit_ratio" },
    confidence: "medium",
  });

  const evD2 = addEv({
    type: "pr_stat",
    label: "Issue linking",
    detail: prs.length
      ? `PRs linking issues = ${(issueLinkRate * 100).toFixed(1)}%`
      : `PR data not available`,
    ref: { source: "prs", number: prs[0]?.number },
    confidence: prs.length >= 10 ? "high" : prs.length ? "medium" : "low",
  });

  const planningScore = Math.round(
    0.35 * Math.round(100 * clamp01(issueLinkRate)) +
      0.35 * Math.round(100 * clamp01(conv)) +
      0.3 * Math.round(100 * clamp01(docsFirst))
  );

  // --- Axis E: Surface Area per Change ---
  const subsystemsPerEpisode = episodes.length
    ? episodes.map((e) => e.subsystems_touched.length).sort((a, b) => a - b)
    : [];
  const medSubsystems = subsystemsPerEpisode.length
    ? subsystemsPerEpisode[Math.floor(0.5 * (subsystemsPerEpisode.length - 1))]
    : 0;

  const evE1 = addEv({
    type: "episode",
    label: "Subsystem breadth",
    detail: episodes.length
      ? `Median subsystems touched per episode = ${medSubsystems}`
      : `Episodes not available yet`,
    ref: { source: "episodes", episode_id: episodes[0]?.episode_id },
    confidence: episodes.length ? "medium" : "low",
  });

  const surfaceScore = Math.round(scoreFromZish(medSubsystems, 3, 2));

  // --- Axis F: Shipping Rhythm ---
  const burst = Number(metrics.burstiness_score ?? 0);
  const episodeP90 = episodes.length
    ? episodes
        .map((e) => e.commit_count)
        .sort((a, b) => a - b)[Math.floor(0.9 * (episodes.length - 1))]
    : 0;

  const evF1 = addEv({
    type: "metric",
    label: "Burstiness",
    detail: `Burstiness score = ${burst.toFixed(2)}`,
    ref: { source: "metrics", key: "burstiness_score" },
    confidence: "medium",
  });

  const evF2 = addEv({
    type: "episode",
    label: "Big sessions",
    detail: episodes.length
      ? `p90 commits per episode = ${episodeP90}`
      : `Episodes not available yet`,
    ref: { source: "episodes", episode_id: episodes[0]?.episode_id },
    confidence: episodes.length ? "medium" : "low",
  });

  const burstScaled = Math.round(100 * clamp01((burst + 1) / 2));
  const rhythmScore = Math.round(
    0.6 * burstScaled + 0.4 * scoreFromZish(episodeP90, 6, 6)
  );

  const axes: VibeAxes = {
    automation_heaviness: {
      score: automationScore,
      level: toLevel(automationScore),
      why: [evA1, evA2, ...(evA3 ? [evA3] : [])],
    },
    guardrail_strength: {
      score: guardrailScore,
      level: toLevel(guardrailScore),
      why: [evB1, evB2],
    },
    iteration_loop_intensity: {
      score: iterationScore,
      level: toLevel(iterationScore),
      why: [evC1, evC2],
    },
    planning_signal: {
      score: planningScore,
      level: toLevel(planningScore),
      why: [evD1, evD2],
    },
    surface_area_per_change: {
      score: surfaceScore,
      level: toLevel(surfaceScore),
      why: [evE1],
    },
    shipping_rhythm: {
      score: rhythmScore,
      level: toLevel(rhythmScore),
      why: [evF1, evF2],
    },
  };

  return { axes, evidence };
}

// =============================================================================
// Persona Detection
// =============================================================================

export function detectVibePersona(
  axes: VibeAxes,
  meta: { commitCount: number; prCount: number; dataQualityScore?: number }
): VibePersona {
  const A = axes.automation_heaviness.score;
  const B = axes.guardrail_strength.score;
  const C = axes.iteration_loop_intensity.score;
  const D = axes.planning_signal.score;
  const E = axes.surface_area_per_change.score;
  const F = axes.shipping_rhythm.score;

  interface PersonaRule {
    id: VibePersonaId;
    name: string;
    tagline: string;
    conditions: Array<{ id: string; ok: () => boolean }>;
    match: () => boolean;
    score: () => number;
    matched_rules: () => string[];
  }

  const rules: PersonaRule[] = [
    {
      id: "prompt_sprinter",
      name: "Vibe Prototyper",
      tagline: "You build to think — code is your sketchpad.",
      conditions: [
        { id: "A>=70", ok: () => A >= 70 },
        { id: "C>=65", ok: () => C >= 65 },
        { id: "B<40", ok: () => B < 40 },
        { id: "D<45", ok: () => D < 45 },
      ],
      match: () => A >= 70 && C >= 65 && B < 40 && D < 45,
      score: () => Math.round((A + C + (100 - B) + (100 - D)) / 4),
      matched_rules: () => ["A>=70", "C>=65", "B<40", "D<45"],
    },
    {
      id: "guardrailed_viber",
      name: "Test-First Validator",
      tagline: "You lean on tests and safety nets before big changes.",
      conditions: [
        { id: "A>=65", ok: () => A >= 65 },
        { id: "B>=65", ok: () => B >= 65 },
        { id: "C>=40", ok: () => C >= 40 },
      ],
      match: () => A >= 65 && B >= 65 && C >= 40,
      score: () => Math.round((A + B + C) / 3),
      matched_rules: () => ["A>=65", "B>=65", "C>=40"],
    },
    {
      id: "spec_first_director",
      name: "Spec-Driven Architect",
      tagline: "Plans thoroughly before touching code; constraints show up early and often.",
      conditions: [
        { id: "D>=70", ok: () => D >= 70 },
        { id: "B>=55", ok: () => B >= 55 },
        { id: "A>=40", ok: () => A >= 40 },
      ],
      match: () => D >= 70 && B >= 55 && A >= 40,
      score: () => Math.round((D + B + A) / 3),
      matched_rules: () => ["D>=70", "B>=55", "A>=40"],
    },
    {
      id: "vertical_slice_shipper",
      name: "Agent Orchestrator",
      tagline: "Coordinates tools and assistants; breaks work into structured moves.",
      conditions: [
        { id: "E>=70", ok: () => E >= 70 },
        { id: "A>=60", ok: () => A >= 60 },
      ],
      match: () => E >= 70 && A >= 60,
      score: () => Math.round((E + A + Math.max(C, F)) / 3),
      matched_rules: () => ["E>=70", "A>=60"],
    },
    {
      id: "fix_loop_hacker",
      name: "Hands-On Debugger",
      tagline: "You move fast through triage and fix loops, refining in tight cycles.",
      conditions: [
        { id: "C>=80", ok: () => C >= 80 },
        { id: "F>=60", ok: () => F >= 60 },
      ],
      match: () => C >= 80 && F >= 60,
      score: () => Math.round((C + F + (100 - B)) / 3),
      matched_rules: () => ["C>=80", "F>=60"],
    },
    {
      id: "rapid_risk_taker",
      name: "Rapid Risk-Taker",
      tagline: "You vibe with AI and ship fast — guardrails can wait.",
      conditions: [
        { id: "A>=65", ok: () => A >= 65 },
        { id: "B<45", ok: () => B < 45 },
        { id: "D<50", ok: () => D < 50 },
        { id: "F>=40", ok: () => F >= 40 },
      ],
      match: () => A >= 65 && B < 45 && D < 50 && F >= 40,
      score: () => Math.round((A + (100 - B) + (100 - D) + F) / 4),
      matched_rules: () => ["A>=65", "B<45", "D<50", "F>=40"],
    },
  ];

  const matched = rules.filter((r) => r.match());
  const chosenStrict = matched.sort((a, b) => b.score() - a.score())[0] ?? null;

  const fallback = {
    id: "balanced_builder" as const,
    name: "Reflective Balancer",
    tagline: "You balance exploration, guardrails, and shipping rhythm.",
    score: Math.round((A + B + C + D + E + F) / 6),
    matched_rules: [] as string[],
  };

  const chosenLoose = (() => {
    if (chosenStrict) return { rule: chosenStrict, selection: "strict" as const };

    const scored = rules
      .map((rule) => {
        const satisfied = rule.conditions.filter((c) => c.ok()).length;
        const ratio = rule.conditions.length > 0 ? satisfied / rule.conditions.length : 0;
        return { rule, satisfied, ratio, score: rule.score() };
      })
      .sort((a, b) => {
        if (b.ratio !== a.ratio) return b.ratio - a.ratio;
        return b.score - a.score;
      });

    const top = scored[0];
    if (!top) return null;

    if (top.ratio >= 0.5 && top.score >= 60) {
      return { rule: top.rule, selection: "loose" as const };
    }

    return null;
  })();

  const chosenRule = chosenLoose?.rule ?? null;
  const chosenSelection = chosenLoose?.selection ?? null;

  const chosenId = chosenRule?.id ?? fallback.id;
  const chosenName = chosenRule?.name ?? fallback.name;
  const chosenTagline = chosenRule?.tagline ?? fallback.tagline;
  const personaScore = chosenRule?.score() ?? fallback.score;
  const matchedRules = chosenRule?.matched_rules() ?? fallback.matched_rules;

  const confidence: Confidence = (() => {
    const commitOk = meta.commitCount >= 200;
    const prOk = meta.prCount >= 15;
    const qualityOk = (meta.dataQualityScore ?? 60) >= 70;

    // For Balanced Builder (fallback), confidence is based on data quality alone
    // since the persona score is just the average of axes (which can be low even with good data)
    const isFallback = chosenRule === null;
    if (isFallback) {
      if ((commitOk || prOk) && qualityOk) return "high";
      if (meta.commitCount >= 80 || meta.prCount >= 6) return "medium";
      return "low";
    }

    if ((commitOk || prOk) && qualityOk && personaScore >= 75) return "high";
    if ((meta.commitCount >= 80 || meta.prCount >= 6) && personaScore >= 65)
      return "medium";
    return "low";
  })();

  const axisWhy = (axis: AxisValue) => axis.why ?? [];
  const why = (() => {
    const ids: string[] = [];
    if (matchedRules.some((r) => r.startsWith("A")))
      ids.push(...axisWhy(axes.automation_heaviness));
    if (matchedRules.some((r) => r.startsWith("B")))
      ids.push(...axisWhy(axes.guardrail_strength));
    if (matchedRules.some((r) => r.startsWith("C")))
      ids.push(...axisWhy(axes.iteration_loop_intensity));
    if (matchedRules.some((r) => r.startsWith("D")))
      ids.push(...axisWhy(axes.planning_signal));
    if (matchedRules.some((r) => r.startsWith("E")))
      ids.push(...axisWhy(axes.surface_area_per_change));
    if (matchedRules.some((r) => r.startsWith("F")))
      ids.push(...axisWhy(axes.shipping_rhythm));
    return Array.from(new Set(ids)).slice(0, 6);
  })();

  // Build diagnostics to help identify missing persona patterns
  const allRuleScores: PersonaRuleDiagnostic[] = rules.map((rule) => {
    const satisfied = rule.conditions.filter((c) => c.ok());
    const failed = rule.conditions.filter((c) => !c.ok());
    return {
      id: rule.id,
      name: rule.name,
      satisfiedConditions: satisfied.map((c) => c.id),
      failedConditions: failed.map((c) => c.id),
      satisfiedRatio: rule.conditions.length > 0 ? satisfied.length / rule.conditions.length : 0,
      score: rule.score(),
    };
  });

  // Near misses: rules with >= 50% conditions satisfied but didn't fully match
  const nearMisses = allRuleScores
    .filter((r) => r.satisfiedRatio >= 0.5 && r.satisfiedRatio < 1)
    .sort((a, b) => b.satisfiedRatio - a.satisfiedRatio);

  const isFallback = chosenRule === null;
  const selection: "strict" | "loose" | "fallback" = chosenStrict
    ? "strict"
    : chosenLoose
      ? "loose"
      : "fallback";

  // Generate suggestion for potential missing personas
  const suggestion = (() => {
    if (!isFallback) return undefined;

    // Check for distinct patterns that might warrant a new persona
    const patterns: string[] = [];

    // High automation without matching any existing persona
    if (A >= 60 && nearMisses.length === 0) {
      patterns.push(`High automation (${A}) with no near-miss rules`);
    }

    // Identify dominant axes (score >= 60)
    const dominantAxes: string[] = [];
    if (A >= 60) dominantAxes.push(`A=${A}`);
    if (B >= 60) dominantAxes.push(`B=${B}`);
    if (C >= 60) dominantAxes.push(`C=${C}`);
    if (D >= 60) dominantAxes.push(`D=${D}`);
    if (E >= 60) dominantAxes.push(`E=${E}`);
    if (F >= 60) dominantAxes.push(`F=${F}`);

    // Identify low axes (score < 40)
    const lowAxes: string[] = [];
    if (A < 40) lowAxes.push(`A=${A}`);
    if (B < 40) lowAxes.push(`B=${B}`);
    if (C < 40) lowAxes.push(`C=${C}`);
    if (D < 40) lowAxes.push(`D=${D}`);
    if (E < 40) lowAxes.push(`E=${E}`);
    if (F < 40) lowAxes.push(`F=${F}`);

    if (dominantAxes.length > 0 || lowAxes.length > 0) {
      const parts: string[] = [];
      if (dominantAxes.length > 0) parts.push(`high: ${dominantAxes.join(", ")}`);
      if (lowAxes.length > 0) parts.push(`low: ${lowAxes.join(", ")}`);
      patterns.push(`Distinct pattern: ${parts.join("; ")}`);
    }

    if (patterns.length > 0) {
      return `POTENTIAL MISSING PERSONA: ${patterns.join(". ")}. Consider adding a new persona rule.`;
    }

    return undefined;
  })();

  const diagnostics: PersonaDiagnostics = {
    isFallback,
    selection,
    nearMisses,
    allRuleScores,
    axes: { A, B, C, D, E, F },
    suggestion,
  };

  return {
    id: chosenId,
    name: chosenName,
    tagline: chosenTagline,
    confidence,
    score: personaScore,
    matched_rules: matchedRules,
    why,
    caveats: [
      ...(chosenSelection === "loose"
        ? ["Selected by nearest-match because no strict rule matched."]
        : []),
      "Inferred from GitHub metadata (commits/PRs), not IDE prompts.",
      "Unpushed local work and private discussions are not visible.",
    ],
    diagnostics,
  };
}

// =============================================================================
// Persona Coverage Analysis
// =============================================================================

export interface PersonaCoverageResult {
  totalCombinations: number;
  fallbackCount: number;
  fallbackPercentage: number;
  personaCounts: Record<string, number>;
  sampleFallbacks: Array<{
    axes: { A: number; B: number; C: number; D: number; E: number; F: number };
    suggestion?: string;
  }>;
}

/**
 * Analyzes persona rule coverage by testing sample axes combinations.
 * Helps identify gaps where users might fall into the fallback persona.
 *
 * @param step - The step size for iterating axes (default 20, meaning 0/20/40/60/80/100)
 * @param maxFallbackSamples - Maximum number of fallback examples to include
 */
export function analyzePersonaCoverage(
  step = 20,
  maxFallbackSamples = 10
): PersonaCoverageResult {
  const personaCounts: Record<string, number> = {};
  const fallbackSamples: PersonaCoverageResult["sampleFallbacks"] = [];
  let totalCombinations = 0;
  let fallbackCount = 0;

  // Generate axes combinations at the specified step intervals
  const values = [];
  for (let v = 0; v <= 100; v += step) {
    values.push(v);
  }

  // Create a dummy AxisValue for testing
  const makeAxis = (score: number): AxisValue => ({
    score,
    level: score < 35 ? "low" : score < 65 ? "medium" : "high",
    why: [],
  });

  for (const A of values) {
    for (const B of values) {
      for (const C of values) {
        for (const D of values) {
          for (const E of values) {
            for (const F of values) {
              totalCombinations++;

              const axes: VibeAxes = {
                automation_heaviness: makeAxis(A),
                guardrail_strength: makeAxis(B),
                iteration_loop_intensity: makeAxis(C),
                planning_signal: makeAxis(D),
                surface_area_per_change: makeAxis(E),
                shipping_rhythm: makeAxis(F),
              };

              const result = detectVibePersona(axes, {
                commitCount: 200,
                prCount: 0,
                dataQualityScore: 80,
              });

              personaCounts[result.id] = (personaCounts[result.id] ?? 0) + 1;

              if (result.diagnostics?.isFallback) {
                fallbackCount++;
                if (fallbackSamples.length < maxFallbackSamples && result.diagnostics.suggestion) {
                  fallbackSamples.push({
                    axes: { A, B, C, D, E, F },
                    suggestion: result.diagnostics.suggestion,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    totalCombinations,
    fallbackCount,
    fallbackPercentage: Math.round((fallbackCount / totalCombinations) * 100),
    personaCounts,
    sampleFallbacks: fallbackSamples,
  };
}

// =============================================================================
// Insight Cards Builder
// =============================================================================

export function buildInsightCards(
  persona: VibePersona,
  axes: VibeAxes
): InsightCard[] {
  const cards: InsightCard[] = [];

  cards.push({
    id: "card_persona",
    type: "persona",
    title: "Your vibe coding identity",
    value: persona.name,
    subtitle: persona.tagline,
    evidence: persona.why,
  });

  const axisCard = (
    id: string,
    type: InsightCardType,
    title: string,
    axis: AxisValue,
    subtitle: string
  ) => {
    cards.push({
      id,
      type,
      title,
      value: axis.level.toUpperCase(),
      subtitle,
      evidence: axis.why.slice(0, 4),
    });
  };

  axisCard(
    "card_automation",
    "axis",
    "Automation style",
    axes.automation_heaviness,
    axes.automation_heaviness.level === "high"
      ? "Big slices and high-leverage moves show up often"
      : axes.automation_heaviness.level === "medium"
        ? "A mix of small moves and larger drops"
        : "More manual, incremental changes"
  );

  axisCard(
    "card_guardrails",
    "guardrails",
    "Guardrails",
    axes.guardrail_strength,
    axes.guardrail_strength.level === "high"
      ? "Tests/CI/docs stay close to the work"
      : axes.guardrail_strength.level === "medium"
        ? "Some guardrails, but not always adjacent to big changes"
        : "Guardrails tend to come later or appear less often"
  );

  axisCard(
    "card_loops",
    "loops",
    "Feedback loops",
    axes.iteration_loop_intensity,
    axes.iteration_loop_intensity.level === "high"
      ? "You iterate quickly after shipping changes"
      : axes.iteration_loop_intensity.level === "medium"
        ? "You iterate sometimes, with occasional fix bursts"
        : "You tend to stabilize in fewer follow-up passes"
  );

  axisCard(
    "card_planning",
    "planning",
    "Planning signal",
    axes.planning_signal,
    axes.planning_signal.level === "high"
      ? "Work is often structured through issues, conventions, or docs-first moves"
      : axes.planning_signal.level === "medium"
        ? "Some structure appears, but not consistently"
        : "Structure is light, the work leads the way"
  );

  axisCard(
    "card_surface",
    "surface_area",
    "Surface area",
    axes.surface_area_per_change,
    axes.surface_area_per_change.level === "high"
      ? "Your typical change touches many subsystems"
      : axes.surface_area_per_change.level === "medium"
        ? "Your changes touch a few subsystems at a time"
        : "Your changes stay narrowly scoped"
  );

  axisCard(
    "card_rhythm",
    "rhythm",
    "Shipping rhythm",
    axes.shipping_rhythm,
    axes.shipping_rhythm.level === "high"
      ? "Bursty sessions followed by pauses"
      : axes.shipping_rhythm.level === "medium"
        ? "A mix of bursts and steady progress"
        : "More steady, incremental rhythm"
  );

  return cards.slice(0, 8);
}

// =============================================================================
// Top-Level Entry Point
// =============================================================================

export function computeVibeInsightsV1(
  input: ComputeVibeAxesInput & { prCount?: number }
): VibeInsightsV1 {
  const { axes, evidence } = computeVibeAxes(input);

  const persona = detectVibePersona(axes, {
    commitCount: input.commits?.length ?? input.metrics?.total_commits ?? 0,
    prCount: input.prs?.length ?? input.prCount ?? 0,
    dataQualityScore: input.metrics?.data_quality_score,
  });

  const cards = buildInsightCards(persona, axes);

  return {
    version: "v1",
    generated_at: new Date().toISOString(),
    axes,
    persona,
    cards,
    evidence_index: evidence,
  };
}

// =============================================================================
// Convenience: CommitEvent → VibeInsightsV1
// =============================================================================

/**
 * Input interface matching the existing CommitEvent from index.ts
 * (with optional file_paths for vibe v2 features)
 */
export interface VibeCommitEvent {
  sha: string;
  message: string;
  author_date: string;
  committer_date: string;
  author_email: string;
  files_changed: number;
  additions: number;
  deletions: number;
  parents: string[];
  file_paths?: string[];
}

export interface ComputeVibeFromCommitsInput {
  commits: VibeCommitEvent[];
  prs?: PullRequestLite[];
  languages?: Record<string, number>;
  /**
   * Gap in hours between commits that separates work episodes.
   * Default: 4 hours
   */
  episodeGapHours?: number;
}

/**
 * Convenience function that takes raw CommitEvents (the existing shape)
 * and computes the full VibeInsightsV1 output.
 *
 * This handles:
 * - Building work episodes from commits (if file_paths present)
 * - Computing first-touch percentiles (if file_paths present)
 * - Computing all metrics
 * - Axis computation
 * - Persona detection
 * - Card generation
 */
export function computeVibeFromCommits(
  input: ComputeVibeFromCommitsInput
): VibeInsightsV1 {
  const { commits, prs, languages, episodeGapHours = 4 } = input;

  // Sort commits by time ascending
  const sortedCommits = [...commits].sort(
    (a, b) =>
      new Date(a.committer_date).getTime() - new Date(b.committer_date).getTime()
  );

  // Check if we have file_paths data
  const hasFilePaths = sortedCommits.some(
    (c) => c.file_paths && c.file_paths.length > 0
  );

  // Build episodes if we have file_paths
  let episodes: WorkEpisode[] = [];
  if (hasFilePaths) {
    const episodeCommits: EpisodeCommit[] = sortedCommits.map((c) => ({
      sha: c.sha,
      timestamp: new Date(c.committer_date),
      message: c.message,
      additions: c.additions,
      deletions: c.deletions,
      files_changed: c.files_changed,
      file_paths: c.file_paths ?? [],
    }));
    episodes = buildWorkEpisodes(episodeCommits, episodeGapHours);
  }

  // Calculate first-touch percentiles if we have file_paths
  let firstTouch: FirstTouchPercentiles | undefined;
  if (hasFilePaths) {
    const result = calculateFirstTouchPercentiles(sortedCommits);
    firstTouch = result.percentiles;
  }

  // Compute basic metrics
  const totalCommits = sortedCommits.length;
  const totalFilesChanged = sortedCommits.reduce((s, c) => s + c.files_changed, 0);
  const sizes = sortedCommits.map((c) => c.additions + c.deletions);
  const sortedSizes = [...sizes].sort((a, b) => a - b);
  const commit_size_p90 =
    sortedSizes.length > 0
      ? sortedSizes[Math.floor(0.9 * (sortedSizes.length - 1))]
      : 0;

  // Category classification
  const categoryDistribution: Record<string, number> = {};
  const categoryFirstOccurrence: Record<string, number> = {};
  let fixCommitCount = 0;
  let fixupSequenceCount = 0;
  let prevWasFeature = false;
  let conventionalCount = 0;

  for (let i = 0; i < sortedCommits.length; i++) {
    const c = sortedCommits[i];
    const subject = c.message.split("\n")[0].toLowerCase();
    const category = getCommitCategory(subject);

    categoryDistribution[category] = (categoryDistribution[category] ?? 0) + 1;
    if (!(category in categoryFirstOccurrence)) {
      categoryFirstOccurrence[category] = i;
    }

    if (category === "fix") fixCommitCount++;
    if (category === "fix" && prevWasFeature) fixupSequenceCount++;
    prevWasFeature = category === "feature";

    if (/^(feat|fix|docs|test|chore|refactor|style|ci|build)(\(.+\))?:/.test(subject)) {
      conventionalCount++;
    }
  }

  // Burstiness
  const timestamps = sortedCommits.map((c) => new Date(c.committer_date));
  const burstiness_score = computeBurstiness(timestamps);

  // Data quality
  const hasStatsRatio =
    totalCommits > 0
      ? sortedCommits.filter((c) => c.additions + c.deletions > 0).length /
        totalCommits
      : 0;
  const data_quality_score = Math.round(
    100 * (0.6 * Math.min(1, totalCommits / 100) + 0.4 * hasStatsRatio)
  );

  // Build input for axis computation
  const axisInput: ComputeVibeAxesInput = {
    commits: sortedCommits.map((c) => ({
      sha: c.sha,
      message: c.message,
      author_date: c.author_date,
      committer_date: c.committer_date,
      files_changed: c.files_changed,
      additions: c.additions,
      deletions: c.deletions,
    })),
    metrics: {
      total_commits: totalCommits,
      total_files_changed: totalFilesChanged,
      commit_size_p90,
      fixup_sequence_count: fixupSequenceCount,
      fix_commit_ratio: totalCommits > 0 ? fixCommitCount / totalCommits : 0,
      conventional_commit_ratio:
        totalCommits > 0 ? conventionalCount / totalCommits : 0,
      burstiness_score,
      data_quality_score,
      category_distribution: categoryDistribution,
      category_first_occurrence: categoryFirstOccurrence,
    },
    prs,
    languages,
    episodes: episodes.length > 0 ? episodes : undefined,
    firstTouch,
  };

  return computeVibeInsightsV1({
    ...axisInput,
    prCount: prs?.length ?? 0,
  });
}

function getCommitCategory(subject: string): string {
  if (/^feat(\(.+\))?:/.test(subject) || /\badd\b|\bimplement\b|\bcreate\b/.test(subject))
    return "feature";
  if (/^fix(\(.+\))?:/.test(subject) || /\bfix\b|\bbug\b/.test(subject)) return "fix";
  if (/^test(\(.+\))?:/.test(subject) || /\btest\b/.test(subject)) return "test";
  if (/^docs?(\(.+\))?:/.test(subject) || /\bdocs?\b|\breadme\b/.test(subject)) return "docs";
  if (/^refactor(\(.+\))?:/.test(subject) || /\brefactor\b/.test(subject)) return "refactor";
  if (/^chore(\(.+\))?:/.test(subject)) return "chore";
  if (/^(ci|build)(\(.+\))?:/.test(subject) || /\bci\b|\bbuild\b/.test(subject)) return "ci";
  return "other";
}

function computeBurstiness(timestamps: Date[]): number {
  if (timestamps.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const hours =
      (timestamps[i].getTime() - timestamps[i - 1].getTime()) / (1000 * 60 * 60);
    intervals.push(hours);
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const stddev = Math.sqrt(
    intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / intervals.length
  );

  if (stddev + mean === 0) return 0;
  return (stddev - mean) / (stddev + mean);
}

// =============================================================================
// Profile Aggregation: One Persona Per User
// =============================================================================

/**
 * Summary of a single repo's vibe insights, used for aggregation.
 */
export interface RepoInsightSummary {
  jobId: string;
  repoName: string;
  commitCount: number;
  axes: VibeAxes;
  persona: VibePersona;
  analyzedAt: string;
}

/**
 * A repo's contribution to the aggregated profile.
 */
export interface RepoBreakdown {
  jobId: string;
  repoName: string;
  personaId: VibePersonaId;
  personaName: string;
  commitCount: number;
  /** Percentage of total commits this repo contributes */
  weight: number;
  axes: VibeAxes;
}

/**
 * The user's aggregated profile across all analyzed repos.
 */
export interface AggregatedProfile {
  /** Total commits across all repos */
  totalCommits: number;
  /** Number of repos analyzed */
  totalRepos: number;
  /** Job IDs that contributed to this profile */
  jobIds: string[];

  /** Weighted average of axes across all repos */
  axes: VibeAxes;

  /** Persona detected from aggregated axes */
  persona: VibePersona;

  /** Per-repo breakdown showing individual contributions */
  repoBreakdown: RepoBreakdown[];

  /** Profile-level insight cards */
  cards: InsightCard[];

  /** When this profile was last updated */
  updatedAt: string;
}

/**
 * Aggregate multiple repo insights into a single user profile.
 *
 * The aggregation strategy:
 * - Axes are weighted by commit count (repos with more commits have more influence)
 * - Persona is detected from the aggregated axes
 * - Cards highlight cross-repo patterns
 */
export function aggregateUserProfile(
  repoInsights: RepoInsightSummary[]
): AggregatedProfile {
  if (repoInsights.length === 0) {
    throw new Error("Cannot aggregate empty insights");
  }

  const totalCommits = repoInsights.reduce((s, r) => s + r.commitCount, 0);
  const totalRepos = repoInsights.length;
  const jobIds = repoInsights.map((r) => r.jobId);

  // Compute weighted average of axes
  const aggregatedAxes = computeWeightedAxes(repoInsights, totalCommits);

  // Detect persona from aggregated axes
  const persona = detectVibePersona(aggregatedAxes, {
    commitCount: totalCommits,
    prCount: 0, // TODO: aggregate PR counts when available
    dataQualityScore: computeAggregatedDataQuality(repoInsights),
  });

  // Build repo breakdown
  const repoBreakdown: RepoBreakdown[] = repoInsights.map((r) => ({
    jobId: r.jobId,
    repoName: r.repoName,
    personaId: r.persona.id,
    personaName: r.persona.name,
    commitCount: r.commitCount,
    weight: totalCommits > 0 ? r.commitCount / totalCommits : 1 / totalRepos,
    axes: r.axes,
  }));

  // Build profile-level insight cards
  const cards = buildProfileCards(persona, aggregatedAxes, repoInsights);

  return {
    totalCommits,
    totalRepos,
    jobIds,
    axes: aggregatedAxes,
    persona,
    repoBreakdown,
    cards,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compute weighted average of axes across repos.
 * Weight is determined by commit count.
 */
function computeWeightedAxes(
  insights: RepoInsightSummary[],
  totalCommits: number
): VibeAxes {
  const axisKeys = [
    "automation_heaviness",
    "guardrail_strength",
    "iteration_loop_intensity",
    "planning_signal",
    "surface_area_per_change",
    "shipping_rhythm",
  ] as const;

  const result: Partial<VibeAxes> = {};

  for (const key of axisKeys) {
    let weightedSum = 0;
    const allWhy: string[] = [];

    for (const insight of insights) {
      const weight =
        totalCommits > 0
          ? insight.commitCount / totalCommits
          : 1 / insights.length;
      const axis = insight.axes[key];
      weightedSum += axis.score * weight;
      allWhy.push(...axis.why);
    }

    const score = Math.round(weightedSum);
    result[key] = {
      score,
      level: scoreToLevel(score),
      why: [...new Set(allWhy)].slice(0, 5), // Dedupe and limit
    };
  }

  return result as VibeAxes;
}

function scoreToLevel(score: number): Level {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Compute aggregated data quality score.
 */
function computeAggregatedDataQuality(insights: RepoInsightSummary[]): number {
  const totalCommits = insights.reduce((s, r) => s + r.commitCount, 0);

  // More repos and more commits = higher quality
  const repoFactor = Math.min(1, insights.length / 5); // Max out at 5 repos
  const commitFactor = Math.min(1, totalCommits / 500); // Max out at 500 commits

  return Math.round(100 * (0.4 * repoFactor + 0.6 * commitFactor));
}

/**
 * Build profile-level insight cards that span multiple repos.
 */
function buildProfileCards(
  persona: VibePersona,
  axes: VibeAxes,
  insights: RepoInsightSummary[]
): InsightCard[] {
  const cards: InsightCard[] = [];

  // Card 1: Primary persona
  cards.push({
    id: "profile-persona",
    type: "persona",
    title: persona.name,
    value: `${persona.score}%`,
    subtitle: persona.tagline,
    evidence: [],
  });

  // Card 2: Profile coverage (use rhythm type as closest match)
  const totalCommits = insights.reduce((s, r) => s + r.commitCount, 0);
  cards.push({
    id: "profile-coverage",
    type: "rhythm",
    title: "Profile Coverage",
    value: `${insights.length} repos`,
    subtitle: `${totalCommits.toLocaleString()} commits analyzed`,
    evidence: [],
  });

  // Card 3: Strongest axis
  const axisEntries = Object.entries(axes) as [keyof VibeAxes, AxisValue][];
  const strongest = axisEntries.reduce((a, b) => (b[1].score > a[1].score ? b : a));
  const axisTypeMap: Record<string, InsightCardType> = {
    automation_heaviness: "axis",
    guardrail_strength: "guardrails",
    iteration_loop_intensity: "loops",
    planning_signal: "planning",
    surface_area_per_change: "surface_area",
    shipping_rhythm: "rhythm",
  };
  const axisLabels: Record<string, string> = {
    automation_heaviness: "Automation",
    guardrail_strength: "Guardrails",
    iteration_loop_intensity: "Iteration",
    planning_signal: "Planning",
    surface_area_per_change: "Surface Area",
    shipping_rhythm: "Rhythm",
  };
  cards.push({
    id: "profile-strongest-axis",
    type: axisTypeMap[strongest[0]] ?? "axis",
    title: "Strongest Signal",
    value: axisLabels[strongest[0]] ?? strongest[0],
    subtitle: `Score: ${strongest[1].score}`,
    evidence: [],
  });

  // Card 4: Cross-repo pattern (if multiple personas)
  const uniquePersonas = new Set(insights.map((r) => r.persona.id));
  if (uniquePersonas.size > 1 && insights.length > 1) {
    const personaCounts: Record<string, number> = {};
    for (const insight of insights) {
      personaCounts[insight.persona.name] =
        (personaCounts[insight.persona.name] ?? 0) + 1;
    }
    const personaList = Object.entries(personaCounts)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ");

    cards.push({
      id: "profile-cross-repo",
      type: "persona",
      title: "Cross-Repo Pattern",
      value: `${uniquePersonas.size} different vibes`,
      subtitle: personaList,
      evidence: [],
    });
  }

  // Card 5: Consistency insight
  if (uniquePersonas.size === 1 && insights.length > 1) {
    cards.push({
      id: "profile-consistency",
      type: "persona",
      title: "Consistent Style",
      value: insights[0].persona.name,
      subtitle: `Same vibe across ${insights.length} repos`,
      evidence: [],
    });
  }

  return cards;
}
