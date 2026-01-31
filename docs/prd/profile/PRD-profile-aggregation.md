# PRD: Profile Aggregation — Unified VCP Per User

**Status:** Core Implementation Complete — See `docs/implementation-trackers/profile-aggregation.md` for details

> **Reference Documentation:** For technical details on aggregation, see:
> - [Vibe Coding Profile Analysis Pipeline](./architecture/vibed-analysis-pipeline.md#profile-aggregation) — Aggregation algorithm details

## The Problem

We built personas per repo. The PRDs say personas should aggregate per user.

### What the PRDs Said

From [`PRD-vibed-ux.md`](../ux/PRD-vibed-ux.md):

> "Vibe Coding Profile builds a profile of your AI-era coding style **across projects**. One repo gives you a Repo VCP. Three repos show patterns. Five repos reveal your Unified VCP when you're building with AI tools."

> "**One project = one data point.** We can tell you what we see, but we can't know if that's 'you' or just 'this project.' **Multiple projects = actual patterns.** Now we can say with confidence: 'This is how you work, not just how this codebase works.'"

The PRD even mocked the target:

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR AI CODING PROFILE                                     │
│  Based on 5 projects · 2,341 commits · 8 months of data    │
│                                                             │
│  🎭 PRIMARY VIBE: THE PROTOTYPER                           │
│  "You prompt fast, ship fast, and let the code evolve"      │
│  ████████████████░░░░ 84% confident                        │
└─────────────────────────────────────────────────────────────┘
```

### What We Built

- Each analysis job produces its own persona
- `analysis_insights.persona_id` is per-job, not per-user
- No aggregation of axes or metrics across repos
- No user-level profile table
- UI shows per-repo reports, not a unified profile

### Why This Matters

1. **Accuracy**: One repo might be a hackathon, another is work. Combined = the real you.
2. **Engagement**: "Add more repos to sharpen your profile" is the natural growth loop.
3. **Value**: Cross-repo insights are unique to Vibe Coding Profile — no one else does this.

---

## Gap Analysis

### Database

| What Exists | What's Missing |
|-------------|----------------|
| `analysis_insights` (per job) | `user_profiles` (per user, aggregated) |
| `analysis_metrics` (per job) | `user_profile_history` (snapshots over time) |
| Per-job axes/persona | User-level axes/persona |

### Core Logic

| What Exists | What's Missing |
|-------------|----------------|
| `computeVibeFromCommits(commits)` | `aggregateUserProfile(jobInsights[])` |
| Per-job axis computation | Cross-job axis aggregation (weighted by commit count) |
| Per-job persona detection | User-level persona detection from aggregated axes |

### Worker

| What Exists | What's Missing |
|-------------|----------------|
| Computes insights per job | Trigger to re-aggregate user profile after each job |
| Stores to `analysis_insights` | Stores to `user_profiles` |

### UI

| What Exists | What's Missing |
|-------------|----------------|
| `/analysis/[jobId]` (per-repo report) | `/profile` (user's aggregated profile) |
| Per-repo persona card | Unified persona with repo breakdown |
| Per-repo share card | Profile-level share card |

---

## Data Model Changes

### New Table: `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Aggregated from all completed jobs
  total_commits INTEGER NOT NULL DEFAULT 0,
  total_repos INTEGER NOT NULL DEFAULT 0,
  job_ids UUID[] NOT NULL DEFAULT '{}',

  -- Aggregated axes (weighted average by commit count)
  axes_json JSONB NOT NULL,
  -- { automation_heaviness: { score: 72, confidence: "high" }, ... }

  -- Aggregated persona
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  persona_tagline TEXT,
  persona_confidence TEXT NOT NULL, -- "high" | "medium" | "low"
  persona_score INTEGER NOT NULL,

  -- Per-repo breakdown for UI
  repo_personas_json JSONB NOT NULL DEFAULT '[]',
  -- [{ repo_name: "acme/api", persona_id: "prompt-sprinter", axes: {...} }, ...]

  -- Insight cards for profile-level share
  cards_json JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Track profile changes over time
CREATE TABLE user_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_snapshot JSONB NOT NULL, -- Full profile at this point
  trigger_job_id UUID REFERENCES analysis_jobs(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profile_history_user ON user_profile_history(user_id);
```

### RLS Policies

```sql
-- user_profiles: users can only see their own
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert/update (worker)
CREATE POLICY "Service role full access"
  ON user_profiles FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Core Logic Changes

### New: `aggregateUserProfile()`

```typescript
// packages/core/src/vibe.ts

export interface RepoInsightSummary {
  jobId: string;
  repoName: string;
  commitCount: number;
  axes: VibeAxes;
  persona: VibePersona;
  analyzedAt: string;
}

export interface AggregatedProfile {
  totalCommits: number;
  totalRepos: number;
  jobIds: string[];

  // Weighted average of axes
  axes: VibeAxes;

  // Persona from aggregated axes
  persona: VibePersona;

  // Per-repo breakdown
  repoBreakdown: Array<{
    repoName: string;
    personaId: string;
    personaName: string;
    commitCount: number;
    axes: VibeAxes;
  }>;

  // Profile-level insight cards
  cards: InsightCard[];
}

export function aggregateUserProfile(
  repoInsights: RepoInsightSummary[]
): AggregatedProfile {
  if (repoInsights.length === 0) {
    throw new Error("Cannot aggregate empty insights");
  }

  const totalCommits = repoInsights.reduce((s, r) => s + r.commitCount, 0);
  const totalRepos = repoInsights.length;
  const jobIds = repoInsights.map(r => r.jobId);

  // Weighted average of axes by commit count
  const aggregatedAxes = computeWeightedAxes(repoInsights, totalCommits);

  // Detect persona from aggregated axes
  const persona = detectVibePersona(aggregatedAxes, {
    commitCount: totalCommits,
    prCount: 0, // TODO: aggregate PR counts
    dataQualityScore: computeAggregatedDataQuality(repoInsights),
  });

  // Build profile-level cards
  const cards = buildProfileCards(persona, aggregatedAxes, repoInsights);

  return {
    totalCommits,
    totalRepos,
    jobIds,
    axes: aggregatedAxes,
    persona,
    repoBreakdown: repoInsights.map(r => ({
      repoName: r.repoName,
      personaId: r.persona.id,
      personaName: r.persona.name,
      commitCount: r.commitCount,
      axes: r.axes,
    })),
    cards,
  };
}

function computeWeightedAxes(
  insights: RepoInsightSummary[],
  totalCommits: number
): VibeAxes {
  // For each axis, compute weighted average
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
    const allEvidence: EvidenceItem[] = [];

    for (const insight of insights) {
      const weight = insight.commitCount / totalCommits;
      const axis = insight.axes[key];
      weightedSum += axis.score * weight;
      allEvidence.push(...axis.evidence);
    }

    result[key] = {
      score: Math.round(weightedSum),
      confidence: determineAggregatedConfidence(insights.map(i => i.axes[key].confidence)),
      evidence: allEvidence.slice(0, 5), // Top 5 evidence items
    };
  }

  return result as VibeAxes;
}
```

### Update: Worker Post-Job Hook

After each job completes, re-aggregate the user's profile:

```typescript
// In apps/web/src/inngest/functions/analyze-repo.ts

// Step 6: Update user profile (NEW)
await step.run("update-user-profile", async () => {
  // Fetch all completed jobs for this user
  const { data: completedJobs } = await supabase
    .from("analysis_jobs")
    .select("id, repo_id, repos(full_name), commit_count")
    .eq("user_id", userId)
    .eq("status", "done");

  if (!completedJobs || completedJobs.length === 0) return;

  // Fetch insights for each job
  const { data: allInsights } = await supabase
    .from("vibe_insights") // or analysis_insights with axes_json
    .select("job_id, axes_json, persona_id, persona_name")
    .in("job_id", completedJobs.map(j => j.id));

  // Build RepoInsightSummary array
  const repoInsights: RepoInsightSummary[] = completedJobs.map(job => {
    const insight = allInsights?.find(i => i.job_id === job.id);
    return {
      jobId: job.id,
      repoName: job.repos?.full_name ?? "Unknown",
      commitCount: job.commit_count ?? 0,
      axes: insight?.axes_json ?? defaultAxes(),
      persona: { id: insight?.persona_id, name: insight?.persona_name, ... },
      analyzedAt: job.completed_at,
    };
  });

  // Aggregate
  const profile = aggregateUserProfile(repoInsights);

  // Upsert user_profiles
  await supabase.from("user_profiles").upsert({
    user_id: userId,
    total_commits: profile.totalCommits,
    total_repos: profile.totalRepos,
    job_ids: profile.jobIds,
    axes_json: profile.axes,
    persona_id: profile.persona.id,
    persona_name: profile.persona.name,
    persona_tagline: profile.persona.tagline,
    persona_confidence: profile.persona.confidence,
    persona_score: profile.persona.score,
    repo_personas_json: profile.repoBreakdown,
    cards_json: profile.cards,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // Save history snapshot
  await supabase.from("user_profile_history").insert({
    user_id: userId,
    profile_snapshot: profile,
    trigger_job_id: jobId,
  });
});
```

---

## UI Changes

### New Page: `/profile`

The user's aggregated profile page (the "home base"):

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR UNIFIED VCP                                             │
│  Based on 3 repos · 847 commits                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🎭 PROMPT SPRINTER                                       │  │
│  │  "You ship fast, iterate faster, and stabilize when it    │  │
│  │   matters."                                               │  │
│  │                                                           │  │
│  │  ████████████████████░░░░ 78% confident                   │  │
│  │                                                           │  │
│  │  [Share profile]                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  YOUR AXES                                                      │
│  ┌─────────────┬─────────────┬─────────────┐                    │
│  │ Automation  │ Guardrails  │ Iteration   │                    │
│  │ ████████░░  │ ████░░░░░░  │ █████████░  │                    │
│  │ 78          │ 42          │ 89          │                    │
│  ├─────────────┼─────────────┼─────────────┤                    │
│  │ Planning    │ Surface     │ Rhythm      │                    │
│  │ ███░░░░░░░  │ ██████░░░░  │ ████████░░  │                    │
│  │ 31          │ 62          │ 76          │                    │
│  └─────────────┴─────────────┴─────────────┘                    │
│                                                                 │
│  YOUR REPOS                                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  acme/api           Prompt Sprinter      312 commits      │  │
│  │  acme/dashboard     Fix-Loop Hacker      285 commits      │  │
│  │  acme/infra         Infra Weaver         250 commits      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  "On acme/api you sprint and ship. On acme/dashboard you        │
│   iterate in tight loops. Your infra work is more methodical."  │
│                                                                 │
│  [Add another repo]  [View individual reports]                  │
└─────────────────────────────────────────────────────────────────┘
```

### Update: Dashboard (`/`)

Show aggregated profile summary, not just stats:

```tsx
// Before: "Projects in profile: 3"
// After: Show actual persona from user_profiles

{userProfile ? (
  <div>
    <p className="text-3xl font-semibold">{userProfile.persona_name}</p>
    <p className="text-sm text-zinc-600">
      Based on {userProfile.total_repos} repos · {userProfile.total_commits} commits
    </p>
    <Link href="/profile">View full profile →</Link>
  </div>
) : (
  <div>
    <p>Still forming</p>
    <p>Run a vibe check to get your first read.</p>
  </div>
)}
```

### Update: Individual Reports (`/analysis/[jobId]`)

Add context that this feeds into the profile:

```tsx
<div className="mt-4 p-4 bg-zinc-50 rounded-lg">
  <p className="text-sm text-zinc-600">
    This repo contributes to your overall profile.
  </p>
  <Link href="/profile" className="text-sm font-semibold">
    View aggregated profile →
  </Link>
</div>
```

---

## Migration Path

### Phase 1: Database + Core (No UI)

1. Create `user_profiles` and `user_profile_history` tables
2. Add `aggregateUserProfile()` to `@vibe-coding-profiler/core`
3. Update Inngest function to call aggregation after each job
4. Backfill existing users' profiles

### Phase 2: Profile Page

1. Create `/profile` page
2. Fetch from `user_profiles` table
3. Show aggregated persona + axes + repo breakdown

### Phase 3: Dashboard Integration

1. Update `/` dashboard to show profile summary
2. Link to `/profile` page
3. Update language from "Projects in profile" to profile-centric

### Phase 4: Individual Report Context

1. Update `/analysis/[jobId]` to show "feeds into profile" context
2. Add comparison: "On this repo vs your overall profile"

---

## Open Questions

1. **Weighting strategy**: Should we weight by commit count, or give each repo equal weight? (Recommendation: commit count, with a floor so small repos still matter)

2. **Staleness**: If a user hasn't analyzed a repo in 6 months, should it still contribute equally? (Recommendation: yes for now, consider decay later)

3. **Repo removal**: When a user disconnects a repo, should we re-aggregate immediately? (Recommendation: yes)

4. **History granularity**: Save a snapshot after every job, or batch? (Recommendation: every job, they're small)

5. **Mini-personas**: The user mentioned "mini personas" per repo. Should we show "On this repo, you were more of a [X]" explicitly? (Recommendation: yes, it's the insight)

---

## Success Criteria

1. Every user with ≥1 completed job has a `user_profiles` row
2. Profile updates within 30s of job completion
3. `/profile` page loads in <1s
4. Share card shows aggregated persona, not per-repo
5. Dashboard shows unified persona, not job count
