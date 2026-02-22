/**
 * Community stats: eligibility, rollup computation, and suppression.
 * See docs/prd/platform/prd-community-stats.md for specification.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum total_commits for a profile to be included in community aggregates. */
export const COMMUNITY_ELIGIBLE_MIN_COMMITS = 80;

/** Minimum eligible profiles before the community page is shown at all. */
export const COMMUNITY_GLOBAL_THRESHOLD = 10;

/** Minimum profiles in a breakdown bucket before that row is published. */
export const COMMUNITY_BUCKET_THRESHOLD = 25;

/** Persona ID → display name mapping (7 active personas). */
export const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  prompt_sprinter: "Vibe Prototyper",
  guardrailed_viber: "Test-First Validator",
  spec_first_director: "Spec-Driven Architect",
  vertical_slice_shipper: "Agent Orchestrator",
  fix_loop_hacker: "Hands-On Debugger",
  rapid_risk_taker: "Rapid Risk-Taker",
  balanced_builder: "Reflective Balancer",
};

const AXIS_KEYS = [
  "automation_heaviness",
  "guardrail_strength",
  "iteration_loop_intensity",
  "planning_signal",
  "surface_area_per_change",
  "shipping_rhythm",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a row from community_profile_snapshots (eligible only). */
export interface CommunitySnapshot {
  user_id: string;
  total_commits: number;
  total_repos: number;
  persona_id: string;
  persona_confidence: string;
  automation_heaviness: number;
  guardrail_strength: number;
  iteration_loop_intensity: number;
  planning_signal: number;
  surface_area_per_change: number;
  shipping_rhythm: number;
  ai_collaboration_rate: number | null;
  ai_tool_diversity: number | null;
  ai_tools_detected: boolean | null;
}

export interface CommunityStatsPayload {
  suppressed: false;
  as_of: string;
  eligible_profiles: number;
  eligible_repos: number;
  total_analyzed_commits: number;
  personas: Array<{ id: string; name: string; pct: number }>;
  persona_confidence: { high: number; medium: number; low: number };
  axes: Record<string, { p25: number; p50: number; p75: number }>;
  ai_tools: {
    eligible_profiles_with_data: number;
    collaboration_rate_buckets: Array<{ bucket: string; pct: number }>;
    tool_diversity_buckets: Array<{ bucket: string; pct: number }>;
  } | null;
  meta: { window: string; version: string; generated_at: string };
}

export interface CommunityStatsSuppressed {
  suppressed: true;
  reason: string;
  eligible_profiles: number;
  threshold: number;
}

export type CommunityStatsResult = CommunityStatsPayload | CommunityStatsSuppressed;

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

export function isEligibleForCommunityStats(totalCommits: number): boolean {
  return totalCommits >= COMMUNITY_ELIGIBLE_MIN_COMMITS;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function roundPct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 1000) / 10; // 1 decimal place
}

function bucketAICollaborationRate(rate: number): string {
  if (rate === 0) return "none";
  if (rate <= 0.1) return "light";
  if (rate <= 0.3) return "moderate";
  if (rate <= 0.6) return "heavy";
  return "ai-native";
}

function bucketToolDiversity(count: number): string {
  if (count === 0) return "0";
  if (count === 1) return "1";
  if (count === 2) return "2";
  return "3+";
}

// ---------------------------------------------------------------------------
// Rollup computation
// ---------------------------------------------------------------------------

export function computeCommunityRollup(
  snapshots: CommunitySnapshot[]
): CommunityStatsResult {
  const n = snapshots.length;

  if (n < COMMUNITY_GLOBAL_THRESHOLD) {
    return {
      suppressed: true,
      reason: "insufficient_data",
      eligible_profiles: n,
      threshold: COMMUNITY_GLOBAL_THRESHOLD,
    };
  }

  const now = new Date().toISOString();
  const asOf = now.split("T")[0];

  // --- Coverage ---
  const eligibleRepos = snapshots.reduce((s, r) => s + r.total_repos, 0);
  const totalCommits = snapshots.reduce((s, r) => s + r.total_commits, 0);

  // --- Persona distribution ---
  const personaCounts: Record<string, number> = {};
  for (const s of snapshots) {
    const id = s.persona_id;
    personaCounts[id] = (personaCounts[id] ?? 0) + 1;
  }

  const personas = Object.entries(personaCounts)
    .filter(([, count]) => count >= COMMUNITY_BUCKET_THRESHOLD)
    .map(([id, count]) => ({
      id,
      name: PERSONA_DISPLAY_NAMES[id] ?? id,
      pct: roundPct(count, n),
    }))
    .sort((a, b) => b.pct - a.pct);

  // --- Persona confidence ---
  const confCounts = { high: 0, medium: 0, low: 0 };
  for (const s of snapshots) {
    const c = s.persona_confidence as keyof typeof confCounts;
    if (c in confCounts) confCounts[c]++;
  }
  const personaConfidence = {
    high: roundPct(confCounts.high, n),
    medium: roundPct(confCounts.medium, n),
    low: roundPct(confCounts.low, n),
  };

  // --- Axis percentiles ---
  const axes: Record<string, { p25: number; p50: number; p75: number }> = {};
  for (const key of AXIS_KEYS) {
    const values = snapshots
      .map((s) => s[key] as number)
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);

    axes[key] = {
      p25: percentile(values, 25),
      p50: percentile(values, 50),
      p75: percentile(values, 75),
    };
  }

  // --- AI tools ---
  const aiSnapshots = snapshots.filter(
    (s) => s.ai_tools_detected === true && s.ai_collaboration_rate !== null
  );
  let aiTools: CommunityStatsPayload["ai_tools"] = null;

  if (aiSnapshots.length >= COMMUNITY_BUCKET_THRESHOLD) {
    // Collaboration rate buckets
    const rateBucketCounts: Record<string, number> = {
      none: 0, light: 0, moderate: 0, heavy: 0, "ai-native": 0,
    };
    for (const s of aiSnapshots) {
      const bucket = bucketAICollaborationRate(s.ai_collaboration_rate!);
      rateBucketCounts[bucket]++;
    }
    const collaborationRateBuckets = Object.entries(rateBucketCounts).map(
      ([bucket, count]) => ({ bucket, pct: roundPct(count, aiSnapshots.length) })
    );

    // Tool diversity buckets
    const divBucketCounts: Record<string, number> = {
      "0": 0, "1": 0, "2": 0, "3+": 0,
    };
    for (const s of aiSnapshots) {
      const bucket = bucketToolDiversity(s.ai_tool_diversity ?? 0);
      divBucketCounts[bucket]++;
    }
    const toolDiversityBuckets = Object.entries(divBucketCounts).map(
      ([bucket, count]) => ({ bucket, pct: roundPct(count, aiSnapshots.length) })
    );

    aiTools = {
      eligible_profiles_with_data: aiSnapshots.length,
      collaboration_rate_buckets: collaborationRateBuckets,
      tool_diversity_buckets: toolDiversityBuckets,
    };
  }

  return {
    suppressed: false,
    as_of: asOf,
    eligible_profiles: n,
    eligible_repos: eligibleRepos,
    total_analyzed_commits: totalCommits,
    personas,
    persona_confidence: personaConfidence,
    axes,
    ai_tools: aiTools,
    meta: {
      window: "30d",
      version: "community-v1",
      generated_at: now,
    },
  };
}
