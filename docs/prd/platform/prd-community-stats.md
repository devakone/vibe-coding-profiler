# PRD: Community Stats (Public, Anonymized Aggregates)

**Status:** Draft v2 (reviewed, grounded in actual data model)
**Owner:** Product + Engineering
**Related:** `docs/how-vibe-coding-profile-works.md`, `docs/architecture/vibed-analysis-pipeline.md`, `docs/prd/profile/PRD-profile-aggregation.md`

---

## 1. Problem

Vibe Coding Profile currently provides repo-level and user-level insights, but no product-level view of community patterns. As adoption grows, users need a public page that answers:

- What does the broader community look like?
- What patterns are common across builders?
- How am I similar/different from the overall baseline?

This page must remain privacy-safe: no raw user data, no repo identifiers, and no traceable per-user output.

---

## 2. Goals and Non-Goals

### Goals

1. Publish high-signal, anonymized aggregate metrics across all eligible profiles.
2. Make community insights understandable for both technical and non-technical visitors.
3. Ensure the page is fast (<300ms server response target for cached payload).
4. Keep privacy risk low via thresholds, suppression rules, and bucketed outputs.

### Non-Goals

1. User ranking, leaderboards, or competitive scoring.
2. Segmenting by employer, org, or specific repository.
3. Segmented community views (e.g., by repo size band) — deferred to v2 if k-anonymity can be maintained.
4. Real-time streaming metrics (v1 uses scheduled rollups).
5. Differential privacy / statistical noise — suppression + bucketing is sufficient for current scale.
6. Any metric that could reasonably identify a single user.

---

## 3. Audience and User Stories

### Primary Audience

- Current users comparing their own profile to the broader population.
- Visitors evaluating whether Vibe Coding Profile reflects real-world patterns.

### User Stories

- As a visitor, I can see high-level community trends in one glance.
- As a user, I can understand "what's typical" for workflow patterns.
- As a privacy-conscious user, I can trust that this page does not expose personal or repo-level data.

---

## 4. Community Metrics Proposal (What to Surface)

Only publish metrics that are both meaningful and privacy-safe. All outputs are aggregate-level and bucketed where appropriate.

Every metric below is annotated with its **actual data source** in the current schema.

### A. Coverage and Participation

| Metric | Source | Notes |
|--------|--------|-------|
| `total_eligible_profiles` | COUNT of `user_profiles` rows where `total_commits >= 80` | Direct query on snapshot table |
| `total_eligible_repos` | SUM of `user_profiles.total_repos` across eligible profiles | Already stored per user |
| `total_analyzed_commits` | SUM of `user_profiles.total_commits` across eligible profiles | Already stored per user |

Purpose: Establish trust in sample size and freshness.

**Deferred (v1.1):** `rolling_30d_new_profiles` — `user_profiles.created_at` tracks row creation but does not distinguish "first profile" from "profile re-aggregation." To support this, either add a `first_profile_at` column or derive from `MIN(analysis_jobs.completed_at)` per user. Not blocking for v1.

### B. Persona Distribution

| Metric | Source | Notes |
|--------|--------|-------|
| `persona_distribution_pct` | GROUP BY `user_profiles.persona_id` | Uses `VibePersonaId` values (see reference below) |
| `persona_confidence_distribution` | GROUP BY `user_profiles.persona_confidence` | Values: `"high"`, `"medium"`, `"low"` |

Purpose: Show how builder archetypes distribute across the community.

**Data Reference — `VibePersonaId` values (7 active personas):**

| `persona_id` | Display Name |
|--------------|-------------|
| `prompt_sprinter` | Vibe Prototyper |
| `guardrailed_viber` | Test-First Validator |
| `spec_first_director` | Spec-Driven Architect |
| `vertical_slice_shipper` | Agent Orchestrator |
| `fix_loop_hacker` | Hands-On Debugger |
| `rapid_risk_taker` | Rapid Risk-Taker |
| `balanced_builder` | Reflective Balancer (fallback) |

Note: `toolsmith_viber` and `infra_weaver` exist in the TypeScript union type but have no detection rules in `detectVibePersona()` and will never be assigned. Exclude from community stats.

### C. Vibe Axis Community Baseline

For each of the 6 axes, compute p25/p50/p75 from `user_profiles.axes_json-><axis_key>->>'score'`:

| Axis Key | Display Name | Low Label | High Label |
|----------|-------------|-----------|------------|
| `automation_heaviness` | Automation | Manual | AI-Heavy |
| `guardrail_strength` | Guardrails | Light | Rigorous |
| `iteration_loop_intensity` | Iteration | Stable | Rapid |
| `planning_signal` | Planning | Emergent | Structured |
| `surface_area_per_change` | Surface Area | Narrow | Wide |
| `shipping_rhythm` | Rhythm | Steady | Bursty |

Each axis in `axes_json` has shape: `{ score: number (0-100), level: "low"|"medium"|"high", why: string[] }`.

Output per axis: `{ p25: number, p50: number, p75: number }`.

Purpose: Provide robust baseline + spread (median/IQR) without exposing tails.

### D. Workflow Rhythm

**v1 — derivable from existing data:**

The `shipping_rhythm` axis score (Section C) already captures rhythm patterns. No additional rhythm metrics in v1.

**v1.1 — requires joining per-job data not currently aggregated per-user:**

| Metric | Potential Source | Notes |
|--------|-----------------|-------|
| `weekday_distribution` | `analysis_insights.insights_json.timing.top_weekdays` | Per-job, not per-user aggregate. Would need cross-job merge. |
| `local_hour_heatmap` | `analysis_insights.insights_json.timing.peak_hour` | Only stores peak, not full distribution. Full heatmap requires raw `analysis_metrics.events_json` (array of `CommitEvent` with `author_date`). |
| `streak_length_buckets` | `analysis_insights.insights_json.streak.longest_days` | Per-job streak length exists. Bucket into `1`, `2-3`, `4-7`, `8-14`, `15+`. |
| `burstiness_buckets` | `analysis_metrics.metrics_json.burstiness_score` | Score from -1 (regular) to +1 (bursty). Bucket into `steady` (< -0.3), `mixed` (-0.3 to 0.3), `bursty` (> 0.3). |

Deferred because these are per-job (per-repo) values, not per-user aggregates. The snapshot would need to merge across a user's multiple repos via `analysis_jobs` → `analysis_metrics`/`analysis_insights` joins.

### E. Commit and Change Shape

| Metric | Source | Notes |
|--------|--------|-------|
| `category_mix_pct` | `analysis_metrics.metrics_json.category_distribution` | Per-job `Record<BuildCategory, number>`. See actual category values below. |
| `conventional_commit_adoption_pct` | `analysis_metrics.metrics_json.conventional_commit_ratio` | Per-job ratio (0-1). Aggregate as median across eligible users. |
| `fix_iteration_rate_median` | `analysis_metrics.metrics_json.fix_commit_ratio` | Per-job ratio (0-1). More accurate than `fixup_sequence_count` for community baseline. |
| `commit_size_buckets` | `analysis_metrics.metrics_json.commit_size_p50` | Per-job. Bucket: `tiny` (p50 < 2 files), `small` (2-4), `medium` (5-9), `large` (10+). |

**Data Reference — `BuildCategory` values (actual commit classification enum):**

`"setup"`, `"auth"`, `"feature"`, `"test"`, `"infra"`, `"docs"`, `"refactor"`, `"fix"`, `"style"`, `"chore"`, `"unknown"`

Note: The original PRD listed 7 categories (`feature/fix/docs/tests/refactor/infra/chore`). The actual `BuildCategory` enum has 11 values. For community display, group as: `feature` + `auth` + `setup` → "Building", `fix` → "Fixing", `test` → "Testing", `docs` → "Documenting", `refactor` + `style` → "Refactoring", `infra` + `chore` → "Infrastructure", `unknown` → suppress.

**v1 scoping:** All commit shape metrics are per-job values stored in `analysis_metrics`. To produce per-user aggregates, the snapshot upsert must join through `analysis_jobs` to find the user's latest completed job(s). This adds complexity beyond the simple `user_profiles` read path. **Defer entire Section E to v1.1.**

Purpose: Reveal common build habits and iteration loops.

### F. AI Tooling (Public by Default)

| Metric | Source | Notes |
|--------|--------|-------|
| `ai_collaboration_rate_buckets` | `vibe_insights.ai_tools_json.ai_collaboration_rate` | 0-1 float. Bucket: `none` (0), `light` (0.01-0.1), `moderate` (0.1-0.3), `heavy` (0.3-0.6), `ai-native` (0.6+). |
| `tool_presence_pct` | `vibe_insights.ai_tools_json.tools[].tool_id` | Percent of eligible profiles where each tool_id appears. |
| `tool_diversity_buckets` | `vibe_insights.ai_tools_json.tool_diversity` | Integer. Bucket: `0`, `1`, `2`, `3+`. |

Purpose: Community-level lens on AI-assisted workflows.

**Data availability gap:** `ai_tools_json` was added to `vibe_insights` in migration `20260130`. The core package's `aggregateUserProfile()` returns `AggregatedProfile.aiTools: AIToolMetrics`, but **the `user_profiles` table has no `ai_tools_json` column** — the AI data is computed but never persisted to the profile table. It only exists in per-job `vibe_insights` rows.

**Required fix (Phase 0):** Add `ai_tools_json JSONB DEFAULT NULL` column to `user_profiles` via migration. Update the profile upsert logic in the Inngest `analyzeRepo` function to persist `AggregatedProfile.aiTools`. Without this, AI metrics require joining through `analysis_jobs` → `vibe_insights` per user.

Notes:
- Public by default — no per-user consent required since data is anonymized.
- Keep tool results coarse and suppress low-frequency tool rows (suppress any tool with < 25 profiles).
- Show AI section only when sufficient data meets the `k >= 25` bucket threshold.
- AI metrics will initially have a smaller eligible pool (only post-migration analyses).

---

## 5. Privacy and Anonymization Requirements

Community stats are only computed from **eligible profiles** and only shown when group sizes meet thresholds.

### Inclusion Policy

All users are included in community aggregates regardless of public profile settings. Since outputs are anonymized aggregates with no per-user identifiable data, individual opt-in is not required.

### Eligibility Rules (Input Filtering)

1. Include users with sufficient data quality only (v1: `user_profiles.total_commits >= 80`). PR-based eligibility deferred to v2 — `pull_requests` table requires joins through `repos` → `user_repos` and there is no pre-aggregated PR count per user.
2. Exclude bot/service accounts where detectable (check `users.github_username` against known bot patterns).
3. Exclude profiles flagged as deleted (future-proofing).

### Publication Rules (Output Suppression)

1. Global metrics shown only if `N >= 10` eligible profiles.
2. Any breakdown row requires `k >= 25` profiles in that bucket.
3. Do not publish raw minima/maxima or exact tail values.
4. Round percentages to 1 decimal and counts to coarse steps when needed.

### Data Handling Rules

1. Never expose user IDs, repo names, commit SHAs, or per-profile values.
2. Community endpoints return only pre-aggregated payloads.
3. Keep aggregation tables separate from user-facing profile tables.

---

## 6. Performance Architecture (How to Compute Efficiently)

### Overview

Use a two-stage rollup pipeline:

1. **Profile Snapshot Layer** (one row per eligible profile, latest snapshot only).
2. **Community Rollup Layer** (small precomputed JSON payloads for page/API).

This avoids scanning raw `analysis_*` tables on each request.

### A. Snapshot Table (Per User, Incremental)

Proposed table: `community_profile_snapshots`

**Columns (mapped to actual sources):**

| Column | Type | Source |
|--------|------|--------|
| `user_id` | UUID PK | `user_profiles.user_id` |
| `snapshot_date` | DATE | Current date at upsert time |
| `is_eligible` | BOOLEAN | `user_profiles.total_commits >= 80` |
| `total_commits` | INTEGER | `user_profiles.total_commits` |
| `total_repos` | INTEGER | `user_profiles.total_repos` |
| `persona_id` | TEXT | `user_profiles.persona_id` (VibePersonaId) |
| `persona_confidence` | TEXT | `user_profiles.persona_confidence` (`"high"/"medium"/"low"`) |
| `persona_score` | INTEGER | `user_profiles.persona_score` (0-100) |
| `automation_heaviness` | INTEGER | `user_profiles.axes_json.automation_heaviness.score` |
| `guardrail_strength` | INTEGER | `user_profiles.axes_json.guardrail_strength.score` |
| `iteration_loop_intensity` | INTEGER | `user_profiles.axes_json.iteration_loop_intensity.score` |
| `planning_signal` | INTEGER | `user_profiles.axes_json.planning_signal.score` |
| `surface_area_per_change` | INTEGER | `user_profiles.axes_json.surface_area_per_change.score` |
| `shipping_rhythm` | INTEGER | `user_profiles.axes_json.shipping_rhythm.score` |
| `ai_collaboration_rate` | REAL (nullable) | `user_profiles.ai_tools_json.ai_collaboration_rate` (requires Phase 0 migration) |
| `ai_tool_diversity` | INTEGER (nullable) | `user_profiles.ai_tools_json.tool_diversity` |
| `ai_tools_detected` | BOOLEAN (nullable) | `user_profiles.ai_tools_json.detected` |
| `source_version` | TEXT | Analyzer version string |
| `updated_at` | TIMESTAMPTZ | now() on upsert |

**v1.1 additions** (deferred — require `analysis_metrics` join):

| Column | Type | Source |
|--------|------|--------|
| `burstiness_score` | REAL | `analysis_metrics.metrics_json.burstiness_score` |
| `conventional_commit_ratio` | REAL | `analysis_metrics.metrics_json.conventional_commit_ratio` |
| `fix_commit_ratio` | REAL | `analysis_metrics.metrics_json.fix_commit_ratio` |
| `commit_size_p50` | REAL | `analysis_metrics.metrics_json.commit_size_p50` |
| `category_distribution` | JSONB | `analysis_metrics.metrics_json.category_distribution` |
| `longest_streak_days` | INTEGER | `analysis_insights.insights_json.streak.longest_days` |

Population strategy:

- Update when a user profile changes (triggered by completed analysis job, after `aggregateUserProfile()` in step 8 of the Inngest `analyzeRepo` function).
- Source data from the aggregated `user_profiles` row (which merges all repos), not from per-repo `vibe_insights`.
- Upsert one current snapshot per user (multiple repo analyses for the same user result in a single latest snapshot).
- Keep only latest row per user in v1 (history optional in v2).
- **Backfill:** On first deploy, run a one-time backfill job that populates snapshots from all existing `user_profiles` rows meeting eligibility criteria.

### B. Rollup Table (Page Payloads)

Proposed table: `community_rollups` (single table, partitioned by window type)

Columns:

- `id` UUID PK
- `window` TEXT (`'daily'`, `'30d'`)
- `as_of_date` DATE
- `payload_json` JSONB (fully assembled page payload)
- `eligible_profiles` INTEGER
- `source_version` TEXT
- `generated_at` TIMESTAMPTZ

Rollup strategy:

- Scheduled Inngest job every hour to refresh rollups.
- Full recompute from `community_profile_snapshots` (small table) in v1.
- Optional incremental aggregation in v2 if table grows significantly.

### C. Query Path (Runtime)

Public API endpoint: `GET /api/community/stats`

Runtime behavior:

1. Read latest row from `community_rollups` WHERE `window = '30d'` ORDER BY `as_of_date` DESC LIMIT 1.
2. Return `payload_json` directly.
3. Cache at CDN/edge with `s-maxage=300`, `stale-while-revalidate=3600`.

No joins, no raw metric computation during request handling.

### D. Expected Scale and Cost

- Snapshot table cardinality ~ number of active users.
- Rollup read path: O(1).
- Rollup compute path: O(N eligible profiles) hourly, acceptable for current growth stage.

---

## 7. API Contract (v1)

### `GET /api/community/stats`

Response shape (using actual `VibePersonaId` values and axis keys):

```json
{
  "as_of": "2026-02-22",
  "eligible_profiles": 124,
  "eligible_repos": 389,
  "total_analyzed_commits": 184500,
  "personas": [
    { "id": "prompt_sprinter", "name": "Vibe Prototyper", "pct": 24.1 },
    { "id": "guardrailed_viber", "name": "Test-First Validator", "pct": 17.8 },
    { "id": "spec_first_director", "name": "Spec-Driven Architect", "pct": 15.2 },
    { "id": "vertical_slice_shipper", "name": "Agent Orchestrator", "pct": 12.9 },
    { "id": "fix_loop_hacker", "name": "Hands-On Debugger", "pct": 11.4 },
    { "id": "rapid_risk_taker", "name": "Rapid Risk-Taker", "pct": 10.1 },
    { "id": "balanced_builder", "name": "Reflective Balancer", "pct": 8.5 }
  ],
  "persona_confidence": {
    "high": 42.3,
    "medium": 38.1,
    "low": 19.6
  },
  "axes": {
    "automation_heaviness": { "p25": 41, "p50": 57, "p75": 72 },
    "guardrail_strength": { "p25": 33, "p50": 49, "p75": 66 },
    "iteration_loop_intensity": { "p25": 28, "p50": 45, "p75": 63 },
    "planning_signal": { "p25": 35, "p50": 52, "p75": 68 },
    "surface_area_per_change": { "p25": 22, "p50": 40, "p75": 58 },
    "shipping_rhythm": { "p25": 30, "p50": 48, "p75": 65 }
  },
  "ai_tools": {
    "eligible_profiles_with_data": 87,
    "collaboration_rate_buckets": [
      { "bucket": "none", "pct": 12.6 },
      { "bucket": "light", "pct": 28.7 },
      { "bucket": "moderate", "pct": 33.3 },
      { "bucket": "heavy", "pct": 18.4 },
      { "bucket": "ai-native", "pct": 6.9 }
    ],
    "tool_presence": [
      { "tool_id": "cursor", "tool_name": "Cursor", "pct": 45.2 },
      { "tool_id": "copilot", "tool_name": "GitHub Copilot", "pct": 38.1 }
    ],
    "tool_diversity_buckets": [
      { "bucket": "0", "pct": 12.6 },
      { "bucket": "1", "pct": 41.4 },
      { "bucket": "2", "pct": 29.9 },
      { "bucket": "3+", "pct": 16.1 }
    ]
  },
  "meta": {
    "window": "30d",
    "version": "community-v1",
    "generated_at": "2026-02-22T14:00:00Z"
  }
}
```

**Suppressed response** (when `eligible_profiles < 10`):

```json
{
  "suppressed": true,
  "reason": "insufficient_data",
  "eligible_profiles": 4,
  "threshold": 10
}
```

**Per-section suppression:** Individual sections (e.g., `ai_tools`) may be `null` if their specific data pool is below the `k >= 25` threshold. The page handles this gracefully.

The endpoint requires no authentication. The `/community` page is publicly accessible without login.

**v1 does NOT include:** `rhythm` detail section (weekday_distribution, streak_buckets, hour_heatmap) or `commit_shape` section (category_mix, commit_size_buckets). These are deferred to v1.1 (see Section 4D and 4E).

---

## 8. UX Notes for Public Community Page

### Core Sections (v1)

1. **Community at a glance** — eligible profiles, repos, commits.
2. **Persona distribution** — bar/pie chart of 7 personas + confidence breakdown. Use display names from Section 4B.
3. **Axis baseline cards** — 6 cards showing median + IQR range for each axis. Use axis display names and low/high labels from VCP constants (Section 4C).
4. **AI collaboration** — collaboration rate buckets, tool presence, tool diversity. Show only when data meets thresholds. Include note on data pool size.

### Deferred Sections (v1.1)

5. Rhythm section (weekday + hour heatmap + streak buckets).
6. Commit shape and category mix.

### Copy and Trust

1. Explicitly label as anonymized aggregate view.
2. Show sample size (`eligible_profiles`) and `generated_at` timestamp on every chart group.
3. Avoid normative language ("best", "worst"); keep observational tone.

---

## 9. Implementation Plan

### Phase 0: Schema Prerequisite

1. **Add `ai_tools_json` column to `user_profiles`** — new migration. Populate during `aggregateUserProfile()` from the `AggregatedProfile.aiTools` field that already exists in the core package but is not persisted to the DB.

### Phase 1: Data Foundation

1. Add `community_profile_snapshots` table + migration + RLS (service-role only, no user access).
2. Add `community_rollups` table + migration + RLS (public read via API, service-role write).
3. Add snapshot upsert hook in the Inngest `analyzeRepo` function (after step 8, `aggregateUserProfile()`).
4. Add eligibility check utility in core package (`isEligibleForCommunityStats(profile)`).
5. Add one-time backfill script/job for existing `user_profiles`.

### Phase 2: Rollups and API

1. Add new Inngest scheduled function (`community/rollup.compute`, cron every hour) to compute rollups from snapshots.
2. Add rollup computation logic in core package (percentile calculations, bucketing, suppression).
3. Add `GET /api/community/stats` route handler.
4. Add CDN caching headers and graceful fallback when sample size below threshold.

### Phase 3: Public UI

1. Build `/community` page powered only by rollup endpoint.
2. Add suppression-safe empty states for both global suppression and per-section suppression.
3. Add basic observability (rollup job success, payload freshness).

---

## 10. Success Criteria

1. Community page p95 API latency < 300ms (cached path).
2. Rollup job success rate > 99%.
3. 0 privacy incidents from exposed low-cardinality buckets.
4. 0 runtime heavy queries against raw analysis tables for page requests.
5. Meaningful engagement: users who view `/community` have higher return rate vs control (post-launch experiment).

---

## 11. Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | AI tooling metrics: public or gated? | **Public by default.** Data is anonymized; no per-user consent needed. |
| 2 | Segmented community views in v2? | **Deferred.** One global view for v1. Revisit in v2 if k-anonymity can be maintained. |
| 3 | Differential privacy? | **Not needed for v1.** Suppression + bucketing is sufficient at current scale. |
| 4 | Minimum eligible_profiles threshold? | **10.** Page is suppressed globally below this. |
| 5 | Include all users or only public profiles? | **All users.** Outputs are anonymized aggregates with no identifiable data. |
| 6 | Backfill strategy? | **One-time backfill job** from existing `user_profiles` on first deploy. |
| 7 | `/community` page auth requirement? | **No auth required.** Publicly accessible. |

## 12. Data Model Gaps (Must Fix Before Implementation)

These gaps were identified by cross-referencing the PRD against the actual schema (`supabase/migrations/`) and TypeScript types (`packages/core/src/`).

### Gap 1: `user_profiles` missing `ai_tools_json` column

**Problem:** `aggregateUserProfile()` in `packages/core/src/vibe.ts` returns `AggregatedProfile` which includes `aiTools: AIToolMetrics`. However, the `user_profiles` table (migrations `0009` + `0017`) has no `ai_tools_json` column. The AI data is computed but never persisted to the profile table — it only exists in per-job `vibe_insights.ai_tools_json`.

**Fix:** Add migration: `ALTER TABLE public.user_profiles ADD COLUMN ai_tools_json JSONB DEFAULT NULL`. Update the profile upsert in the Inngest function to persist `AggregatedProfile.aiTools`.

**Impact:** Blocks AI metrics in community stats (Section 4F). Without this, AI data requires joining through `analysis_jobs` → `vibe_insights` per user during snapshot creation.

### Gap 2: Per-job vs per-user data for commit shape metrics

**Problem:** `category_distribution`, `conventional_commit_ratio`, `fix_commit_ratio`, `burstiness_score`, and `commit_size_p50` are stored per-job in `analysis_metrics.metrics_json`. There is no per-user aggregate of these values in `user_profiles`. A user with 3 analyzed repos has 3 separate `analysis_metrics` rows.

**Fix (v1.1):** During snapshot creation, query the user's latest completed `analysis_jobs` → `analysis_metrics` and compute a weighted average (weighted by commit count per job). Alternatively, extend `aggregateUserProfile()` to include these fields.

**Impact:** Commit shape metrics (Section 4E) and detailed rhythm metrics (Section 4D) are deferred to v1.1.

### Gap 3: No `first_profile_at` timestamp

**Problem:** `user_profiles.created_at` is set on first insert but is not preserved distinctly from `updated_at` on subsequent upserts. For `rolling_30d_new_profiles`, we need to know when a user *first* got a profile.

**Fix (v1.1):** Add `first_profile_at TIMESTAMPTZ` to `user_profiles`, set it only on first insert (not on upsert). Backfill from `MIN(analysis_jobs.completed_at)` per user.

**Impact:** Growth indicator deferred to v1.1.

### Gap 4: Persona ID discrepancy between systems

**Problem:** The codebase has two persona ID systems. The older `analysis_insights` system (in `packages/core/src/index.ts`) uses hyphenated IDs like `"vibe-prototyper"`, `"spec-architect"`. The newer VCP system (in `packages/core/src/vibe.ts`) uses underscore IDs like `"prompt_sprinter"`, `"spec_first_director"`. Community stats must use the VCP IDs since that's what `user_profiles.persona_id` stores.

**Fix:** No code change needed — just ensure the API contract and UI use `VibePersonaId` values. Already corrected in Section 7 above.

### Gap 5: Two unimplemented persona IDs in TypeScript union

**Problem:** `VibePersonaId` type includes `"toolsmith_viber"` and `"infra_weaver"` but `detectVibePersona()` has no rules for them — they can never be assigned.

**Fix:** No code change needed for community stats — these will never appear in the data. The rollup logic should handle unknown persona IDs gracefully (group into "other" if encountered).

## 13. Next Steps

1. Create `docs/implementation-trackers/community-stats.md` with detailed task specs per `Agents.md` conventions.
2. Start with Phase 0 (add `ai_tools_json` to `user_profiles`) since it unblocks both community stats and potential future profile page improvements.
3. Implement Phase 1 → Phase 2 → Phase 3 sequentially per the plan.
