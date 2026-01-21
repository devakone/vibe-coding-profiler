# LLM Narrative Workflow Documentation

This document describes how LLM narratives are generated, stored, and aggregated across individual repository analyses and aggregated user profiles.

---

## Overview

Vibe Coding Profile generates two types of narratives:

1. **Individual Repo Narrative** — Generated per analysis job, stored in `analysis_reports.narrative_json`
2. **Profile Narrative** — Generated from aggregated data across all repos, stored in `user_profiles.narrative_json`

Each narrative can be:
- **LLM-generated** — Uses Claude, GPT, or Gemini to create personalized, engaging text
- **Fallback (deterministic)** — Uses templated text based on metrics (no LLM call)

---

## Database Schema

### Individual Report Narrative

Table: `analysis_reports`
- `narrative_json` (JSONB, NOT NULL) — The structured narrative
- `llm_model` (TEXT, default 'none') — e.g., "claude-sonnet-4", "gpt-4o", "none"
- `llm_key_source` (TEXT) — "platform", "user", "sponsor", "none"

Schema: `supabase/migrations/0001_init_core_schema.sql`

### Profile Narrative

Table: `user_profiles` (columns added in migration 0017)
- `narrative_json` (JSONB, nullable) — Profile-level narrative
- `llm_model` (TEXT) — Model used for profile narrative
- `llm_key_source` (TEXT) — Key source for profile narrative

Schema: `supabase/migrations/0017_add_profile_narrative.sql`

> **NOTE:** The TypeScript types in `packages/db/src/database.types.ts` have not been regenerated to include `narrative_json`, `llm_model`, and `llm_key_source` columns for `user_profiles`. These columns exist in the database but are not typed.

---

## LLM Resolution Logic

### For Individual Repo Analysis

Function: `resolveLLMConfig(userId, repoId)`
Location: `apps/web/src/lib/llm-config.ts` (lines 365-401)

Resolution order:
1. **Check opt-in** — User must have `users.llm_narrative_opt_in = true`
2. **Check platform disabled** — `llm_configs.llm_disabled` for platform scope
3. **User's own key** — Check `llm_configs` with `scope='user'` and `scope_id=userId`
4. **Platform key with limit** — Check `llm_usage` for per-repo limit (default: 1 free LLM per repo)
5. **Fallback** — Return `{ config: null, source: "none" }`

### For Profile Aggregation

Function: `resolveProfileLLMConfig(userId)`
Location: `apps/web/src/lib/llm-config.ts` (lines 483-519)

Resolution order:
1. **Check opt-in** — User must have opted in
2. **Check platform disabled**
3. **User's own key** — Always allowed for profile
4. **Platform key with profile limit** — Check if `countReposWithLlmReports(userId) <= profileLlmRepoLimit` (default: 3)
5. **Fallback** — Return `{ config: null, source: "none" }`

---

## Current Workflow

### Step 1: User Triggers Analysis

User clicks "Run Analysis" on a repository.

### Step 2: Inngest Job Runs

Function: `analyze-repo`
Location: `apps/web/src/inngest/functions/analyze-repo.ts`

The job executes these steps:
1. Fetch commits from GitHub
2. Process commit metadata
3. Compute vibe metrics
4. Classify vibe/persona
5. Generate and save report (includes narrative)
6. Update user profile (includes profile narrative)

### Step 3: Individual Report Narrative (Step 5)

Location: `apps/web/src/inngest/functions/analyze-repo.ts` (lines 1040-1138)

Process:
1. Always compute fallback narrative first via `toNarrativeFallback()`
2. Resolve LLM config via `resolveLLMConfig(userId, repoId)`
3. If LLM available, try to generate via `generateNarrativeWithLLM()`
4. Use whichever narrative was generated (LLM or fallback)
5. Save to `analysis_reports` with `llm_model` and `llm_key_source` tracking

### Step 4: Profile Aggregation (Step 6)

Location: `apps/web/src/inngest/functions/analyze-repo.ts` (lines 1192-1595)

Process:
1. Fetch all completed jobs for user (excluding disconnected repos)
2. Fetch vibe_insights for each job
3. Build `RepoInsightSummary[]` array
4. Call `aggregateUserProfile()` to compute weighted axes and persona
5. Resolve LLM config for profile via `resolveProfileLLMConfig(userId)`
6. Generate profile narrative (LLM via `generateProfileNarrativeWithLLM()` or fallback via `toProfileNarrativeFallback()`)
7. Upsert `user_profiles` with narrative and LLM metadata
8. Save snapshot to `user_profile_history` with LLM metadata

---

## Scenario Analysis

### Scenario 1: Full LLM User (BYOK with Opt-In)

**User state:**
- `users.llm_narrative_opt_in = true`
- Has valid API key in `llm_configs` with `scope='user'`

**Behavior:**
- Every repo analysis generates LLM narrative (using user's key)
- Every profile aggregation generates LLM narrative (using user's key)
- No usage limits apply (user's own key)

**Result:**
- `analysis_reports.llm_model = "claude-sonnet-4"` (or similar)
- `analysis_reports.llm_key_source = "user"`
- `user_profiles.llm_model = "claude-sonnet-4"`
- `user_profiles.llm_key_source = "user"`

---

### Scenario 2: No LLM User (No Opt-In, No Key)

**User state:**
- `users.llm_narrative_opt_in = false` (or never set)
- No API key configured

**Behavior:**
- All repo analyses use fallback narrative
- Profile uses fallback narrative
- Metrics are still computed; only narrative text is deterministic

**Result:**
- `analysis_reports.llm_model = "none"`
- `analysis_reports.llm_key_source = "none"`
- `user_profiles.llm_model = null`
- `user_profiles.llm_key_source = "none"`

---

### Scenario 3: Platform Free Tier User (Opted In, No Key)

**User state:**
- `users.llm_narrative_opt_in = true`
- No personal API key
- Using platform's free tier

**Platform limits (defaults):**
- Per-repo limit: 1 free LLM analysis per repo
- Profile LLM repo limit: 3 repos

**Behavior for first 3 repos:**
1. **Repo 1, Run 1:** LLM narrative (platform key)
2. **Repo 1, Run 2:** Fallback narrative (limit exhausted for this repo)
3. **Repo 2, Run 1:** LLM narrative (platform key)
4. **Repo 3, Run 1:** LLM narrative (platform key)
5. **Profile after Repo 3:** LLM profile narrative (3 repos with LLM ≤ limit of 3)

**Behavior for 4th repo onwards:**
6. **Repo 4, Run 1:** LLM narrative (platform key, this is first run on this repo)
7. **Profile after Repo 4:** Fallback profile narrative (4 repos with LLM > limit of 3)

---

### Scenario 4: Mixed Mode — Free Tier Exhausted, Then Non-LLM

**User state:**
- `users.llm_narrative_opt_in = true`
- No personal API key
- Already used free LLM on 3 repos

**Sequence:**
1. User has 3 repos with LLM-generated reports
2. User analyzes a 4th repo (first run) → LLM report (platform key)
3. User analyzes a 5th repo (first run) → LLM report (platform key)
4. User re-analyzes Repo 1 (second run) → Fallback report (per-repo limit exhausted)

**Profile after each step:**
- After step 1: LLM profile (3 repos ≤ 3)
- After step 2: Fallback profile (4 repos > 3)
- After step 3: Fallback profile (5 repos > 3)
- After step 4: Fallback profile (still 5 repos with successful LLM)

**Key insight:** The profile LLM decision is based on the **count of unique repos with successful LLM reports**, not the count of jobs or total LLM calls.

---

### Scenario 5: Downgrade — Had Key, Key Removed/Expired

**User state (before):**
- Opted in, had personal API key
- 5 repos all with LLM narratives

**User state (after):**
- Key removed or expired
- Still opted in

**Behavior on next analysis:**
1. User runs analysis on Repo 1 (second time)
2. `resolveLLMConfig` checks: no user key, check platform limit
3. Platform limit for Repo 1 already exhausted → Fallback narrative
4. Profile: 5 repos have LLM history > 3 → Fallback profile narrative

**Result:** New analyses fall back, but existing LLM narratives are preserved in history.

---

### Scenario 6: Upgrade — Was Free Tier, Added Key

**User state (before):**
- Opted in, no personal key
- 4 repos: Repo 1-3 have LLM, Repo 4 has fallback

**User state (after):**
- Added personal API key

**Behavior on next analysis:**
1. User runs analysis on Repo 4 (second time)
2. `resolveLLMConfig` finds user key → LLM narrative
3. Profile: User has key → LLM profile narrative (no limit with own key)

**Result:** Adding a key immediately unlocks LLM for all future analyses.

---

## Resolved Issues

The following issues have been fixed:

### Issue 1: TypeScript Types Updated (FIXED)

The `packages/db/src/database.types.ts` file has been manually updated to include:
- `user_profiles.narrative_json`
- `user_profiles.llm_model`
- `user_profiles.llm_key_source`
- `user_profiles.regenerating`
- `user_profile_history.version_number`
- `user_profile_history.llm_model`
- `user_profile_history.llm_key_source`

### Issue 2: Profile Narrative Displayed in UI (FIXED)

Location: `apps/web/src/app/page.tsx`

**What was done:**
- Updated profile queries to include `narrative_json`, `llm_model`, `llm_key_source`
- Profile insight section now shows LLM narrative headline when available
- Falls back to deterministic `generateCrossRepoInsight()` when no LLM narrative
- Shows "AI-generated" badge when narrative comes from LLM
- Displays full narrative paragraphs and highlights when available

### Issue 3: Version Selector for Reports (FIXED)

Location: `apps/web/src/app/analysis/[jobId]/AnalysisClient.tsx`

**What was done:**
- Added `repoHistory` computed value that filters history by the current repo
- Added a version selector dropdown that appears when multiple runs exist for the same repo
- Dropdown shows date, persona label, and navigation to switch between versions
- Styled consistently with the rest of the analysis page

### Issue 4: Profile History Accessible (FIXED)

Location: `apps/web/src/components/ProfileVersionSelector.tsx`

**What was done:**
- Created new `ProfileVersionSelector` client component
- Shows "Profile History" collapsible section on the profile page
- Fetches from `/api/profile/history` when expanded
- Version selector dropdown to browse historical profile states
- Shows persona, commit counts, repo counts, LLM model for each version
- Displays trigger repo name for context

### Issue 5: Visual Indicator for Profile Aggregation (FIXED)

Location: `apps/web/src/app/admin/jobs/page.tsx` and `apps/web/src/app/admin/actions.ts`

**What was done:**
- Updated `getAllJobs` action to query `user_profile_history` for profile updates triggered by jobs
- Added "Profile" column to the admin jobs table
- Shows "Updated" badge with checkmark for jobs that triggered a profile update
- Badge shows persona name on hover

---

## Aggregation Logic Details

### How Profile Narrative Changes with Mixed LLM/Non-LLM Reports

The profile narrative is **regenerated fresh on every job completion**. It doesn't "merge" LLM narratives from individual reports.

**What happens:**
1. Job completes
2. `aggregateUserProfile()` runs on all completed jobs (LLM and non-LLM alike)
3. `resolveProfileLLMConfig()` determines if profile gets LLM narrative
4. Either LLM generation or fallback is called
5. Result stored in `user_profiles.narrative_json`

**Key insight:** Individual report narratives don't affect the profile narrative decision. The profile LLM decision is solely based on:
1. User opt-in status
2. User's own API key (if any)
3. Count of repos with successful LLM reports (for platform key limit)

### What Data Goes Into Profile Narrative

Whether LLM or fallback, the profile narrative is generated from:
- `AggregatedProfile.persona` — The aggregated persona
- `AggregatedProfile.axes` — Weighted average of all repo axes
- `AggregatedProfile.totalCommits` — Total commits across all repos
- `AggregatedProfile.totalRepos` — Number of repos analyzed
- `AggregatedProfile.repoBreakdown` — Per-repo persona breakdown

**NOT included:** Individual repo narratives. The profile narrative is a fresh generation based on aggregated data.

---

## Accessing Historical Versions

### Current Capabilities

**For Repo Reports:**
- Each analysis creates a new `analysis_jobs` row with unique ID
- All jobs are stored; nothing is overwritten
- API: `GET /api/analysis/history` returns all insights with job metadata
- UI: Timeline in `AnalysisClient` shows up to 8 previous runs (lines 1137-1163)

**For Profile:**
- Each job completion creates a `user_profile_history` snapshot
- Snapshots include `version_number` (auto-incremented via trigger)
- API: `GET /api/profile/history` lists all versions
- API: `GET /api/profile/history/[id]` fetches specific version

### What's Missing

1. **Repo Version Selector:** A dropdown in the analysis page to switch between versions
2. **Profile Version Selector:** A dropdown on the profile page to view historical states
3. **Diff View:** Compare two versions side-by-side

---

## Key File Locations

| Component | Location |
|-----------|----------|
| LLM resolution (repo) | `apps/web/src/lib/llm-config.ts` → `resolveLLMConfig()` |
| LLM resolution (profile) | `apps/web/src/lib/llm-config.ts` → `resolveProfileLLMConfig()` |
| Repo narrative generation | `apps/web/src/inngest/functions/analyze-repo.ts` (lines 1040-1138) |
| Profile aggregation | `apps/web/src/inngest/functions/analyze-repo.ts` (lines 1192-1595) |
| Profile narrative generation | `apps/web/src/lib/profile-narrative.ts` |
| Fallback narrative (repo) | `packages/core/src/narrative.ts` → `toNarrativeFallback()` |
| Fallback narrative (profile) | `apps/web/src/lib/profile-narrative.ts` → `toProfileNarrativeFallback()` |
| Aggregation algorithm | `packages/core/src/vibe.ts` → `aggregateUserProfile()` |
| Profile history API | `apps/web/src/app/api/profile/history/route.ts` |
| Analysis history API | `apps/web/src/app/api/analysis/history/route.ts` |

---

## Summary Table

| Scenario | Repo LLM | Profile LLM | Notes |
|----------|----------|-------------|-------|
| No opt-in | Never | Never | Must opt in first |
| Opted in + own key | Always | Always | No limits |
| Opted in + platform key, <3 repos with LLM | First run per repo | Yes | Platform limits |
| Opted in + platform key, ≥4 repos with LLM | First run per repo | No | Profile limit exceeded |
| Key removed after use | Fallback | Fallback | Existing reports preserved |

---

## Related Documentation

- [Vibe Coding Profile Analysis Pipeline](./vibed-analysis-pipeline.md) — Full pipeline architecture
- [PRD: Profile Aggregation](../PRD-profile-aggregation.md) — Original design
- [LLM Setup Guide](../llm-setup.md) — User-facing LLM configuration
