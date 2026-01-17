# Vibe Coding Metrics v2: Workflow Forensics

## Core Architecture

**Axes** are deterministic from GitHub metadata (0-100 scores).
**Personas** are rules-based mapping from axes.
**LLM** is used only to narrate, not to decide.

This keeps analysis **reproducible**, **testable**, and avoids "AI detection" claims.

---

## Data Inputs (No Code Contents)

| Source | What we get |
|--------|-------------|
| Commit metadata | Timestamps, stats, messages, file counts (existing) |
| PR metadata | Titles, bodies, merge method, linked issues, checklists |
| Repo languages | `GET /repos/{owner}/{repo}/languages` |
| Tags/releases | Optional, for toolsmith detection |
| Local computation | Work episodes, churn, subsystem breadth (filenames only) |

---

## The Six Vibe Axes (v1)

Each axis is scored 0-100 with evidence and confidence.

---

### Axis A: Automation Heaviness

How "agentic" the workflow looks.

**Signals:**
- High avg files changed per commit
- High p90 commit size
- High PR chunkiness (files_changed_p90, commits_per_pr_p90)
- Higher squash-merge rate
- Text templating (regex patterns, length uniformity)

**Score formula:**
```
40% - Commit chunkiness (avg_files_changed, commit_size_p90)
40% - PR chunkiness (pr_files_changed_p90, commits_per_pr_p90)
20% - Text templating score
```

**Evidence examples:**
- "Top 10% PRs change 40+ files"
- "Median commit touches 6 files"

---

### Axis B: Guardrail Strength

How much the builder stabilizes with tests/CI/docs.

**Signals:**
- First-touch percentile for test paths (`/test`, `__tests__`)
- First-touch for CI (`.github/workflows`)
- First-touch for docs (`README`, `/docs`)
- Ratio of test|docs|chore|ci commits in first 20% of history
- PR checklist presence (`- [ ]` regex)

**Score formula:**
```
50% - Early guardrail first-touch
30% - Ongoing guardrail density
20% - PR checklist/review signals
```

**Evidence examples:**
- "CI appeared by commit #4"
- "One in 5 commits is tests/docs/CI"

---

### Axis C: Iteration Loop Intensity

How often they do rapid "generate → run → fix → run" cycles.

**Signals:**
- Quick remedy rate (fix-after-feature adjacency)
- Episode fix proportion
- Time-to-fix (fix within X minutes of feature)
- Reverts (message contains "revert" or GitHub revert PR)

**Score formula:**
```
50% - Quick fix timing
30% - Fix density within episodes
20% - Reverts
```

**Evidence examples:**
- "35% of feature commits are followed by a fix within 30 minutes"
- "Most build sessions end with a fix burst"

---

### Axis D: Planning Signal

How much intent is documented and work is structured.

**Signals:**
- PRs linked to issues
- Conventional commits ratio (existing)
- Docs/spec commits before major feature work
- PR body length and structure (headings/checklists)

**Score formula:**
```
40% - Issue linking
30% - Conventional commits + message structure
30% - Docs-first sequence
```

**Evidence examples:**
- "60% of PRs link to issues"
- "Docs/spec commits appear before first major feature"

---

### Axis E: Surface Area per Change

How broad each unit of work is across subsystems.

**Path groups:** `ui`, `api`, `db`, `infra`, `tests`, `docs`
(Use filename/path heuristics only)

**Score formula:**
```
60% - Median subsystems touched per commit
40% - Median subsystems touched per PR
```

**Evidence examples:**
- "Your typical PR touches 4 subsystems"

---

### Axis F: Shipping Rhythm

Bursty builder vs steady incremental.

**Signals:**
- Burstiness score (existing)
- Episode size distribution (commits per episode p90)
- Long streak vs gaps

**Score formula:**
```
40% - Burstiness
40% - Episode size p90
20% - Gapiness
```

**Evidence examples:**
- "You ship in bursts of 8-12 commits"
- "Long gaps followed by heavy sessions"

---

## Phase 1: New Data Sources

### 1.1 Pull Request Metadata

**GitHub API:** `GET /repos/{owner}/{repo}/pulls?state=all`

Fields to capture:
```typescript
interface PRMetadata {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  merged: boolean;
  merged_at: string | null;
  created_at: string;
  closed_at: string | null;

  // Merge info
  merge_commit_sha: string | null;
  merge_method: "merge" | "squash" | "rebase" | null; // infer from commit pattern

  // Size signals
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;

  // Collaboration signals
  comments: number;
  review_comments: number;

  // Linking signals
  linked_issues: number[]; // parse from body
  has_checklist: boolean;  // parse from body
  has_template: boolean;   // detect template markers
}
```

**Why it matters:**
- Agentic workflows → fewer PRs, chunkier PRs, more squash merges
- Spec-driven workflows → linked issues, structured templates, checklists

### 1.2 Repository Languages

**GitHub API:** `GET /repos/{owner}/{repo}/languages`

```typescript
interface RepoLanguages {
  [language: string]: number; // bytes of code
}
```

**Why:** Real tech profile without reading code. Distinguishes toolsmith vs product dev vs infra.

### 1.3 Commit-to-PR Mapping

**GitHub API:** `GET /repos/{owner}/{repo}/commits/{sha}/pulls`

Maps each commit to its PR (if any). Critical for:
- Understanding which commits are part of which "slice"
- Detecting squash merges vs merge commits
- Grouping work into logical units

---

## Phase 2: New Database Schema

### 2.1 New Tables

```sql
-- PR metadata
CREATE TABLE pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  github_pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL, -- 'open', 'closed'
  merged BOOLEAN NOT NULL DEFAULT false,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,

  -- Size
  commit_count INTEGER,
  additions INTEGER,
  deletions INTEGER,
  changed_files INTEGER,

  -- Collaboration
  comments_count INTEGER DEFAULT 0,
  review_comments_count INTEGER DEFAULT 0,

  -- Parsed signals
  linked_issue_numbers INTEGER[] DEFAULT '{}',
  has_checklist BOOLEAN DEFAULT false,
  has_template_markers BOOLEAN DEFAULT false,

  -- Inferred
  merge_method TEXT, -- 'merge', 'squash', 'rebase', null

  UNIQUE(repo_id, github_pr_number)
);

-- Commit-to-PR mapping
CREATE TABLE commit_pull_requests (
  commit_sha TEXT NOT NULL,
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  pr_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
  PRIMARY KEY (commit_sha, repo_id)
);

-- Repository languages
CREATE TABLE repo_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  languages_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(repo_id)
);

-- Work episodes (computed)
CREATE TABLE work_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  episode_index INTEGER NOT NULL,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  gap_before_minutes INTEGER, -- null for first episode

  -- Size
  commit_count INTEGER NOT NULL,
  commit_shas TEXT[] NOT NULL,
  additions INTEGER NOT NULL,
  deletions INTEGER NOT NULL,
  files_changed INTEGER NOT NULL,

  -- Categories
  category_counts JSONB NOT NULL, -- {feature: 3, fix: 2, test: 1}

  -- Shape
  ends_with_hardening BOOLEAN NOT NULL, -- test/ci/docs at end
  fix_ratio REAL NOT NULL, -- fixes / total
  churn_file_count INTEGER NOT NULL, -- files touched multiple times

  -- Subsystems
  subsystems TEXT[] NOT NULL, -- detected path groups
  subsystem_count INTEGER NOT NULL,

  UNIQUE(job_id, episode_index)
);

-- Enhanced insights
ALTER TABLE analysis_insights ADD COLUMN IF NOT EXISTS
  vibe_dimensions_json JSONB;
```

### 2.2 Updated analysis_insights Structure

```typescript
interface VibeDimensions {
  automation_heaviness: {
    score: number; // 0-100
    signals: {
      avg_commits_per_pr: number | null;
      squash_merge_ratio: number;
      chunky_pr_ratio: number; // PRs with >10 files
      templated_text_markers: number;
    };
    confidence: "high" | "medium" | "low";
  };

  guardrail_strength: {
    score: number;
    signals: {
      tests_in_first_20_percent: boolean;
      hardening_after_big_changes: number; // count
      ci_config_present: boolean;
      docs_before_code_ratio: number;
    };
    confidence: "high" | "medium" | "low";
  };

  iteration_intensity: {
    score: number;
    signals: {
      fix_after_feature_ratio: number;
      quick_remedy_bursts: number; // fix sequences within 2h
      early_churn_concentration: number; // churn in first 20% of commits
      same_file_24h_touches: number;
    };
    confidence: "high" | "medium" | "low";
  };

  planning_signal: {
    score: number;
    signals: {
      issue_link_ratio: number; // PRs with linked issues
      checklist_usage_ratio: number;
      template_usage_ratio: number;
      docs_commit_ratio: number;
    };
    confidence: "high" | "medium" | "low";
  };

  surface_area: {
    score: number;
    signals: {
      avg_subsystems_per_episode: number;
      max_subsystems_single_episode: number;
      subsystem_diversity: number; // unique subsystems / episodes
    };
    confidence: "high" | "medium" | "low";
  };

  shipping_rhythm: {
    score: number;
    signals: {
      burstiness_score: number; // -1 to 1
      avg_episode_size: number;
      avg_gap_between_episodes_hours: number;
      rhythm_label: "bursty" | "steady" | "sporadic";
    };
    confidence: "high" | "medium" | "low";
  };
}
```

---

## Phase 3: Worker Updates

### 3.1 New Data Fetching

```typescript
// github.ts additions

export async function fetchPullRequests(opts: {
  owner: string;
  repo: string;
  token: string;
  maxPRs?: number;
}): Promise<PRMetadata[]>;

export async function fetchRepoLanguages(opts: {
  owner: string;
  repo: string;
  token: string;
}): Promise<Record<string, number>>;

export async function fetchCommitPRs(opts: {
  owner: string;
  repo: string;
  sha: string;
  token: string;
}): Promise<number[]>; // PR numbers
```

### 3.2 Episode Detection Algorithm

```typescript
// core/episodes.ts

const EPISODE_GAP_HOURS = 4; // commits > 4h apart = new episode

export function detectWorkEpisodes(
  commits: CommitEvent[],
  commitToPR: Map<string, number>
): WorkEpisode[] {
  // 1. Sort commits by time
  // 2. Group into episodes by gap threshold
  // 3. For each episode:
  //    - Count commits, size, categories
  //    - Detect if ends with hardening (test/ci/docs)
  //    - Count churn files (same file multiple times)
  //    - Extract subsystems from file paths
  // 4. Return episodes with computed metrics
}
```

### 3.3 Subsystem Detection

```typescript
// core/subsystems.ts

const SUBSYSTEM_PATTERNS = [
  { pattern: /^src\/components\//, name: "components" },
  { pattern: /^src\/api\/|^api\//, name: "api" },
  { pattern: /^src\/lib\/|^lib\//, name: "lib" },
  { pattern: /^tests?\/|\.test\.|\.spec\./, name: "tests" },
  { pattern: /^\.github\/|\.gitlab-ci|Jenkinsfile/, name: "ci" },
  { pattern: /^docs?\/|README|\.md$/, name: "docs" },
  { pattern: /^config\/|\.config\.|tsconfig|package\.json/, name: "config" },
  { pattern: /^src\/pages\/|^pages\/|^app\//, name: "pages" },
  { pattern: /^src\/hooks\/|^hooks\//, name: "hooks" },
  { pattern: /^src\/store\/|^store\/|redux|zustand/, name: "state" },
  { pattern: /^migrations?\/|^supabase\/|^prisma\//, name: "db" },
  { pattern: /^infra\/|^terraform\/|^k8s\/|^docker/, name: "infra" },
];

export function detectSubsystems(filePaths: string[]): string[];
```

### 3.4 Churn Detection

```typescript
// core/churn.ts

export function detectChurn(
  commits: CommitEvent[],
  fileChanges: Map<string, string[]> // sha -> files
): ChurnMetrics {
  // 1. For each file, find all commits that touched it
  // 2. Detect "oscillation" - file in many consecutive commits
  // 3. Detect 24h repeated touches
  // 4. Compute early churn concentration (first 20% of commits)
}
```

---

## Phase 4: Updated Worker Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKER PIPELINE v2                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Claim job                                                   │
│     │                                                           │
│  2. Fetch commits (existing)                                    │
│     │                                                           │
│  3. NEW: Fetch PRs + languages + commit-PR mapping              │
│     │                                                           │
│  4. Filter automation commits (existing)                        │
│     │                                                           │
│  5. NEW: Detect work episodes                                   │
│     │                                                           │
│  6. NEW: Compute vibe dimensions                                │
│     │                                                           │
│  7. Compute persona (updated with new signals)                  │
│     │                                                           │
│  8. Write results                                               │
│     - analysis_metrics (existing)                               │
│     - analysis_reports (existing)                               │
│     - analysis_insights (updated with vibe_dimensions)          │
│     - NEW: pull_requests                                        │
│     - NEW: work_episodes                                        │
│     - NEW: repo_languages                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: UI Updates

### 5.1 New Vibe Card Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR VIBE                                                      │
│                                                                 │
│  ████████████████████████████████████                           │
│  Vibe Prototyper                                                │
│  "You ship big slices, then iterate via quick fix loops         │
│   and follow with config/test stabilization."                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AUTOMATION        GUARDRAILS       ITERATION                   │
│  ████████░░ 78     ██████░░░░ 54    █████████░ 89               │
│  Agent-heavy       Moderate         High churn                  │
│                                                                 │
│  PLANNING          SURFACE          RHYTHM                      │
│  ███░░░░░░░ 32     ███████░░░ 67    ████████░░ 76               │
│  Exploratory       Wide reach       Bursty                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  YOUR WORKFLOW SHAPE                                            │
│                                                                 │
│  "You typically ship in bursts of 6-12 commits across           │
│   3 subsystems, followed by a quick fix loop. Tests             │
│   usually appear after the main slice lands."                   │
│                                                                 │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐                      │
│  │Slice │ → │ Fix  │ → │ Fix  │ → │Harden│                      │
│  │ 8    │   │  2   │   │  1   │   │ test │                      │
│  └──────┘   └──────┘   └──────┘   └──────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Workflow Shape Visualization

Show the typical "episode shape" as a visual sequence:
- Big slice → fix → fix → hardening
- Or: Plan → slice → test → ship
- Or: Steady incremental flow

---

## Personas (v1) - Rules-Based Mapping

Personas are defined by **threshold rules** on the axes.

---

### Persona 1: Prompt Sprinter

```
Automation Heaviness:    >= 70  ✓
Guardrail Strength:      <  40  ✓
Iteration Loop:          >= 65  ✓
Planning Signal:         <  40  ✓
```

**Narrative:** Ships fast, iterates quickly, stabilizes later.

---

### Persona 2: Guardrailed Viber

```
Automation Heaviness:    >= 65  ✓
Guardrail Strength:      >= 65  ✓
Iteration Loop:          40-70  (medium)
```

**Narrative:** Uses agents heavily but keeps tests/CI close.

---

### Persona 3: Spec-First Director

```
Planning Signal:         >= 70  ✓
Guardrail Strength:      >= 55  ✓
Automation Heaviness:    40-70  (medium)
```

**Narrative:** Directs AI work with structure and checklists.

---

### Persona 4: Vertical Slice Shipper

```
Surface Area:            >= 70  ✓
Automation Heaviness:    >= 60  ✓
Planning Signal:         40-70  (medium)
Guardrail Strength:      40-70  (medium)
```

**Narrative:** Builds end-to-end slices that touch many parts.

---

### Persona 5: Fix-Loop Hacker

```
Iteration Loop:          >= 80  ✓
Shipping Rhythm:         >= 65  (bursty)
Guardrail Strength:      <  60  (low-medium)
```

**Narrative:** Lives in rapid feedback loops.

---

### Persona 6: Toolsmith Viber

```
Planning Signal:         40-70  (medium)
Guardrail Strength:      40-70  (medium)
+ High ci/build/chore commit density
+ Presence of CLI/package/release indicators
```

**Narrative:** Builds developer tooling and automation.

---

### Persona 7: Infra Weaver

```
Surface Area:            skewed to infra path groups
Guardrail Strength:      >= 60  ✓
Planning Signal:         >= 50  ✓
+ Languages indicate IaC (HCL, YAML heavy)
```

**Narrative:** Vibes in pipelines, deployment, infra glue.

---

## Confidence Scoring (v1)

Based on data coverage and signal strength.

| Level | Criteria |
|-------|----------|
| **High** | >= 200 commits OR >= 20 PRs, persona thresholds satisfied with >= 15 point margins |
| **Medium** | >= 80 commits OR >= 8 PRs, margins >= 10 |
| **Low** | Below that, or conflicting axes |

Always show confidence as a label and explain why.

---

## Implementation Order (Vercel + Supabase + Worker Stack)

### Phase 0.5: Fast Vibe Upgrade (No New Endpoints!)

Ship meaningful vibe identity using **existing commit data only**.

**What we can compute now:**
- Work episodes + churn + subsystem breadth from existing commit fields
- Axes A (partial), C, E, F from commits alone
- Basic persona matching

**New core modules:**
```typescript
// packages/core/src/episodes.ts
export function detectWorkEpisodes(commits: CommitEvent[]): WorkEpisode[];

// packages/core/src/subsystems.ts
export function detectSubsystems(filePaths: string[]): string[];

// packages/core/src/vibe-axes.ts
export function computeVibeAxes(
  commits: CommitEvent[],
  episodes: WorkEpisode[]
): PartialVibeAxes; // A, C, E, F only

// packages/core/src/personas.ts
export function detectVibePersona(axes: VibeAxes): PersonaMatch;
```

**Deliverable:** New persona cards + axis bars in UI, better than current "commit analytics"

---

### Phase 1: PR + Languages Ingestion

**1.1 Extend Worker Ingestion** (`apps/worker/src/github.ts`)

```typescript
// New functions to add:
export async function fetchPullRequestList(opts): Promise<PRListItem[]>;
export async function fetchPullRequestDetail(opts): Promise<PRDetail>;
export async function fetchRepoLanguages(opts): Promise<Record<string, number>>;
export async function fetchReleases(opts): Promise<Release[]>; // optional
```

**1.2 New Database Tables** (`supabase/migrations/`)

```sql
-- 0009_add_pr_and_languages.sql
CREATE TABLE pull_requests (...);
CREATE TABLE repo_languages (...);
CREATE INDEX idx_prs_repo ON pull_requests(repo_id);
```

**1.3 Update Worker Pipeline** (`apps/worker/src/index.ts`)

```typescript
// After fetching commits:
const prs = await fetchPullRequestList({ ... });
const prDetails = await mapWithConcurrency(prs, 3, fetchPullRequestDetail);
const languages = await fetchRepoLanguages({ ... });

// Store them
await supabase.from("pull_requests").upsert(prDetails);
await supabase.from("repo_languages").upsert({ repo_id, languages_json: languages });
```

---

### Sprint 2: Work Episode Detection

**2.1 New Core Module** (`packages/core/src/episodes.ts`)

```typescript
export interface WorkEpisode {
  index: number;
  commits: CommitEvent[];
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  gapBeforeMinutes: number | null;

  // Computed
  categoryBreakdown: Record<BuildCategory, number>;
  endsWithHardening: boolean;
  fixRatio: number;
  churnFiles: string[];
  subsystems: string[];
}

export function detectWorkEpisodes(
  commits: CommitEvent[],
  gapThresholdHours: number = 4
): WorkEpisode[];
```

**2.2 Subsystem Detection** (`packages/core/src/subsystems.ts`)

```typescript
export function detectSubsystems(filePaths: string[]): string[];
export function categorizeFilePath(path: string): string; // "api", "ui", "tests", etc.
```

**2.3 Store Episodes** (extend `analysis_metrics` or new table)

```typescript
// In worker:
const episodes = detectWorkEpisodes(events);
await supabase.from("analysis_metrics").update({
  work_episodes_json: episodes,
}).eq("job_id", jobId);
```

---

### Sprint 3: Vibe Dimension Computation

**3.1 New Core Module** (`packages/core/src/vibe-dimensions.ts`)

```typescript
export interface VibeDimensions {
  automation: DimensionScore;
  guardrails: DimensionScore;
  iteration: DimensionScore;
  planning: DimensionScore;
  surface: DimensionScore;
  rhythm: DimensionScore;
}

interface DimensionScore {
  score: number; // 0-100
  confidence: "high" | "medium" | "low";
  signals: Record<string, number | boolean | string>;
  evidence: string[]; // commit/PR SHAs
}

export function computeVibeDimensions(
  commits: CommitEvent[],
  episodes: WorkEpisode[],
  prs: PRMetadata[],
  languages: Record<string, number>
): VibeDimensions;
```

**3.2 Persona Cluster Matching** (`packages/core/src/persona-clusters.ts`)

```typescript
export const PERSONA_PROFILES: PersonaProfile[] = [
  {
    id: "prompt-sprinter",
    label: "Prompt Sprinter",
    description: "Ships fast with AI assistance, iterates rapidly, worries about tests later",
    thresholds: {
      automation: { min: 75, weight: 1.5 },
      iteration: { min: 80, weight: 1.5 },
      guardrails: { max: 50, weight: 1.0 },
      // ...
    }
  },
  // ... other personas
];

export function matchPersonaFromDimensions(
  dimensions: VibeDimensions
): PersonaMatch;
```

**3.3 Update Insights Structure**

```typescript
// In analysis_insights.insights_json:
{
  // Existing fields...
  vibe_dimensions: VibeDimensions,
  workflow_shape: {
    typical_episode: "slice → fix → fix → harden",
    avg_episode_commits: 8,
    common_patterns: ["big-slice-then-iterate", "quick-remedy-loops"]
  }
}
```

---

### Sprint 4: UI + LLM Narrative

**4.1 New UI Components** (`apps/web/src/components/vibe/`)

```
VibeCard.tsx           - Main persona display
DimensionBar.tsx       - Single dimension bar with score
DimensionGrid.tsx      - 6-dimension radar/bar grid
WorkflowShape.tsx      - Visual episode sequence
ShareCard.tsx          - Updated share card
```

**4.2 LLM Narrative Generation** (optional, can be done later)

Worker calls LLM only for:
```typescript
interface LLMNarrativeRequest {
  dimensions: VibeDimensions;
  persona: PersonaMatch;
  topSignals: string[]; // "95% of PRs are squash merged", etc.
}

// LLM generates:
interface LLMNarrativeResponse {
  headline: string;      // "You ship like a Prompt Sprinter"
  explanation: string;   // Natural language evidence summary
  shareCopy: string;     // Twitter-ready text
}
```

**4.3 Share Card Updates**

- Show dimension bars visually
- Gradient based on persona colors
- Workflow shape mini-visualization

---

### Sprint 5: Polish + Cross-Repo (Future)

- Compare dimensions across repos
- "Your vibe shifted" delta tracking
- Leaderboards/benchmarks (anonymous)
- Team vibe aggregation

---

## File Structure After Implementation

```
packages/core/src/
├── index.ts                 # Re-exports
├── crypto.ts                # Existing
├── metrics.ts               # Existing computeAnalysisMetrics
├── vibe-type.ts             # Existing assignVibeType (deprecated?)
├── episodes.ts              # NEW: detectWorkEpisodes
├── subsystems.ts            # NEW: detectSubsystems
├── churn.ts                 # NEW: detectChurn
├── vibe-dimensions.ts       # NEW: computeVibeDimensions
├── persona-clusters.ts      # NEW: matchPersonaFromDimensions
└── automation-filter.ts     # Existing isAutomationCommit (extracted)

apps/worker/src/
├── index.ts                 # Updated pipeline
├── github.ts                # Updated with PR/language fetchers
└── types.ts                 # Shared types

apps/web/src/
├── components/
│   └── vibe/
│       ├── VibeCard.tsx
│       ├── DimensionBar.tsx
│       ├── DimensionGrid.tsx
│       ├── WorkflowShape.tsx
│       └── ShareCard.tsx
└── app/analysis/[jobId]/
    └── AnalysisClient.tsx   # Updated to use new components
```

---

## Storage Schema (Supabase)

### New Tables

```sql
-- Repo-level metadata (languages, etc)
CREATE TABLE analysis_repo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  languages_json JSONB NOT NULL,
  default_branch TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id)
);

-- PR metadata
CREATE TABLE analysis_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  prs_json JSONB NOT NULL,  -- Array of compact PR objects
  pr_count INTEGER NOT NULL,
  coverage_window TEXT,      -- e.g., "last 100 PRs"
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id)
);
```

### Extended analysis_insights

```sql
ALTER TABLE analysis_insights ADD COLUMN IF NOT EXISTS
  axes_json JSONB;           -- { automation: 72, guardrails: 45, ... }

ALTER TABLE analysis_insights ADD COLUMN IF NOT EXISTS
  persona_v2_json JSONB;     -- { id, label, confidence, evidence_refs }

ALTER TABLE analysis_insights ADD COLUMN IF NOT EXISTS
  insight_cards_json JSONB;  -- Render-ready Wrapped cards
```

### PR Object Schema (Compact)

```typescript
interface CompactPR {
  number: number;
  title: string;
  body: string | null;
  created_at: string;
  merged_at: string | null;
  state: "open" | "closed";

  // Size signals
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;

  // Parsed signals
  has_linked_issues: boolean;
  has_checklist: boolean;
  merge_method: "merge" | "squash" | "rebase" | null;
}
```

---

## Rate Limiting Strategy

### GitHub API Limits
- 5,000 requests/hour for authenticated users
- Need to stay well under to not block other operations

### Strategy

| Endpoint | Limit | Caching |
|----------|-------|---------|
| Commits | Already doing | N/A |
| PR list | Last 100 PRs | ETag headers |
| PR detail | Per PR (avoid if possible) | ETag headers |
| Languages | 1 per repo | Long cache (rarely changes) |
| Releases | Optional, last 20 | ETag headers |

### Implementation

```typescript
// Use If-None-Match for caching
const headers: HeadersInit = { Authorization: `Bearer ${token}` };
if (etag) headers["If-None-Match"] = etag;

const res = await fetch(url, { headers });
if (res.status === 304) return cached; // Not modified

// Store new ETag
const newEtag = res.headers.get("ETag");
```

### Avoiding Expensive Endpoints

- **Skip:** `/pulls/{n}/commits` - use PR commit count instead
- **Skip:** `/pulls/{n}/files` - use changed_files count instead
- **Skip:** `/commits/{sha}/pulls` mapping - infer from merge_commit_sha

---

## Privacy Notes

All data sources are **metadata only**:

| Data | Privacy | Notes |
|------|---------|-------|
| PR titles/bodies | User-written | Already public for public repos |
| File paths | Structure only | No contents |
| Languages | Aggregate bytes | No code |
| Commit messages | User-written | Already public |
| Collaboration counts | Counts only | No names/emails exposed |

**Never stored:** File contents, diffs, code snippets.
