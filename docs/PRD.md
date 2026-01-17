# PRD: Bolokono

**Product name:** Bolokono
**Author:** Abou Kone
**Status:** Draft v4 (Monorepo architecture)
**Audience:** Product, Engineering (human + AI agents)

---

## 1. Product Story

### Problem

Modern software is increasingly built with AI assistance, but it is still made by hand through thousands of small decisions captured in git history.

Existing tools measure code quality, velocity, or repo health, but none answer a more fundamental question:

> How do you actually work when you build software?

That answer exists implicitly in commits, timing, sequencing, and iteration patterns, but is not surfaced in a way that developers can understand, reflect on, or compare across projects.

### Opportunity

By analyzing repository history, we can reveal the craftsmanship inside the work: how builders assemble systems over time, what they prioritize, and how their execution habits repeat across projects.

---

## 2. Naming and Meaning

### Why Bolokono

Bolokono comes from Dioula:

- **Bolo** = hand, handwork, manual craft
- **Kɔnɔ** (written kono) = inside, within

**Bolokono means:**

> inside the handwork
> what's happening within the craft

This product does not analyze ideas, plans, or intent.
It analyzes what the hands actually did, as recorded in git history.

**Bolokono is observational, not judgmental.**

---

## 3. Product Goals

### Primary goals

- Reveal how software is built through observable work patterns
- Make craftsmanship visible using evidence from git history
- Support private repositories safely behind authentication
- Enable deep exploration without exposing raw code by default

### Non-goals

- Evaluating developer skill or performance
- Static code quality analysis
- Claiming definitive AI usage detection
- Replacing IDE or code review tooling

---

## 4. Core Concepts

### Bolokono Profile

A Bolokono profile is a structured description of how someone works, derived from:

- Build order and sequencing
- Commit behavior and rhythm
- Iteration and fix patterns
- Consistency across repositories

It answers:

- What tends to come first?
- How work is broken down
- How systems evolve over time

### Principle

> **Metrics first. Narrative second.**

LLMs never read raw repositories.
They summarize computed facts and cite evidence.

---

## 5. User Personas

### Primary

- Solo builders
- Indie hackers
- Startup engineers
- Technical founders using AI tools

### Secondary

- Engineering managers
- Open-source maintainers

---

## 6. User Journey

### Happy Path

1. User lands on homepage
2. User signs in with GitHub
3. User sees repository selection screen
4. User selects one or more repositories
5. Analysis jobs are queued (user sees progress indicator)
6. User is notified when analysis completes
7. User explores:
   - Bolokono overview (type + summary)
   - Build timeline (visual sequence)
   - Evidence-backed insights (metrics + cited commits)
8. User optionally analyzes more repos
9. User views aggregated patterns across repos

### Edge Path: Insufficient Data

1. User selects a repo with < 10 commits
2. System shows warning before analysis
3. If user proceeds, report shows "Insufficient data" state with available metrics but no Bolokono type assigned

### Edge Path: Analysis Failure

1. Analysis job fails (API error, timeout, etc.)
2. User sees error state with retry option
3. Failed jobs are logged for debugging

### Edge Path: Disconnection

1. User clicks "Disconnect repo"
2. Confirmation modal explains what will be deleted
3. On confirm: analysis data deleted, repo record soft-deleted
4. GitHub token remains valid for other repos

---

## 7. Feature Scope by Phase

### Phase 0: Foundation

**Goal:** Establish a secure, analyzable system.

**Includes:**

- [x] Authentication (GitHub OAuth via Supabase)
- [ ] GitHub repository listing and selection
- [ ] Database schema with RLS
- [ ] Repository sync (metadata only)
- [ ] Analysis job queue and state machine
- [ ] Edge Function analyzer (commit metadata extraction)
- [ ] Metrics computation and persistence
- [ ] Minimal Bolokono profile generation
- [ ] Basic report UI

**Deliverable:**

- One private repo analyzed end-to-end
- One Bolokono profile rendered with:
  - At least 5 computed metrics
  - Build category timeline
  - One assigned Bolokono type with evidence

**Exit criteria:**

- User can sign in, select a private repo, wait for analysis, and view a report
- All data is scoped by RLS (user cannot see other users' data)
- Analysis completes in < 60 seconds for repos with < 1000 commits

---

## 8. Technical Architecture

### Architecture Principles

The key constraint shaping this architecture: **don't do repo cloning or heavy git analysis in Vercel serverless functions**. Git cloning exceeds Vercel's memory limits, timeouts, and cold start budget.

Instead:
1. **Vercel Web App**: UI + auth + lightweight API routes (job creation, not execution)
2. **Supabase**: Source of truth + security boundary via RLS
3. **External Worker**: Heavy analysis runs outside the request/response path

### Monorepo Structure

```
bolokono/
├── apps/
│   ├── web/                 # Next.js web app (Vercel)
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities, Supabase client
│   │   └── package.json
│   │
│   └── worker/              # Background job processor (Fly.io/Render)
│       ├── src/
│       │   ├── index.ts     # Job polling loop
│       │   ├── analyzer.ts  # Commit analysis logic
│       │   └── github.ts    # GitHub API client
│       └── package.json
│
├── packages/
│   ├── core/                # Shared analysis logic
│   │   └── src/
│   │       ├── types.ts     # CommitEvent, AnalysisMetrics, etc.
│   │       ├── classify.ts  # Commit classification
│   │       └── metrics.ts   # Metrics computation
│   │
│   └── db/                  # Database utilities
│       └── src/
│           ├── client.ts    # Supabase client factory
│           └── types.ts     # Generated database types
│
├── supabase/
│   ├── migrations/          # SQL migrations
│   ├── functions/           # Edge Functions (optional)
│   └── config.toml
│
└── docs/
    ├── PRD.md
    ├── Agents.md
    └── Workflow.md
```

### Stack

| Layer | Technology | Location |
|-------|------------|----------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui | `apps/web` |
| Backend API | Next.js Route Handlers | `apps/web` |
| Authentication | Supabase Auth with GitHub OAuth provider | Supabase |
| Database | Supabase Postgres with Row Level Security | Supabase |
| Worker | Node.js/TypeScript job processor | `apps/worker` |
| Worker Hosting | Fly.io, Render, or Railway | External |
| Realtime | Supabase Realtime (job status subscriptions) | Supabase |
| LLM | Claude API (server-side only) | `apps/worker` |
| Shared Code | TypeScript packages | `packages/*` |

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                 │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         apps/web (Vercel)                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      Next.js App Router                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │    Pages     │  │    Route     │  │   Supabase SSR   │   │    │
│  │  │  (React UI)  │  │   Handlers   │  │     Client       │   │    │
│  │  └──────────────┘  └───────┬──────┘  └────────┬─────────┘   │    │
│  └────────────────────────────┼──────────────────┼─────────────┘    │
└───────────────────────────────┼──────────────────┼──────────────────┘
                                │                  │
          ┌─────────────────────┼──────────────────┼─────────────────┐
          │                     │                  │                 │
          ▼                     ▼                  ▼                 │
┌──────────────┐    ┌──────────────────────────────────┐             │
│   GitHub     │    │           Supabase               │             │
│    API       │    │  ┌────────┐  ┌───────────────┐   │             │
│  (list repos)│    │  │  Auth  │  │   Postgres    │   │             │
└──────────────┘    │  │        │  │   (+ RLS)     │   │             │
                    │  └────────┘  └───────┬───────┘   │             │
                    │                      │           │             │
                    │              ┌───────▼───────┐   │             │
                    │              │   Realtime    │   │◄────────────┘
                    │              │ (job status)  │   │   (subscribes)
                    └──────────────┴───────────────┴───┘
                                          │
                                          │ polls jobs
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     apps/worker (Fly.io/Render)                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Job Processor                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │  Job Loop   │  │  Analyzer   │  │  Narrative Generator │   │   │
│  │  │ (poll/claim)│─▶│ (metrics)   │─▶│     (Claude API)     │   │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────────┘   │   │
│  └──────────────────────────┼───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
                      ┌─────────────┐
                      │   GitHub    │
                      │    API      │
                      │(fetch commits)
                      └─────────────┘
```

### Data Flow

**1. User connects a repo:**
```
Browser → POST /api/repos/connect → Supabase (insert user_repos)
```

**2. User starts analysis:**
```
Browser → POST /api/analysis/start → Supabase (insert analysis_jobs as 'queued')
```

**3. Worker processes job:**
```
Worker polls analysis_jobs WHERE status = 'queued'
    → Claims job with FOR UPDATE SKIP LOCKED
    → Sets status = 'running'
    → Fetches commits from GitHub API
    → Computes metrics (packages/core)
    → Generates narrative (Claude API)
    → Writes analysis_metrics + analysis_reports
    → Sets status = 'done'
```

**4. UI shows progress:**
```
Browser subscribes to Supabase Realtime on analysis_jobs
    → Sees status change: queued → running → done
    → Fetches report when done
```

### GitHub Token Handling

**Pattern A (MVP - Simple):**
- Store encrypted GitHub token in `github_accounts` table
- RLS: only owner can access
- Encrypt server-side before insert

```sql
CREATE TABLE github_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  github_user_id BIGINT NOT NULL,
  encrypted_token TEXT NOT NULL,  -- Encrypted with server-side key
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only owner can access
CREATE POLICY github_accounts_select ON github_accounts
  FOR SELECT USING (user_id = auth.uid());
```

**Pattern B (More Secure - Future):**
- Don't store long-lived tokens
- Use GitHub OAuth with refresh tokens
- Mint short-lived access tokens on demand

### Worker Job Claiming

Safe concurrent job claiming using PostgreSQL advisory locks:

```sql
-- Function to claim a job atomically
CREATE OR REPLACE FUNCTION claim_analysis_job(p_analyzer_version TEXT)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  SELECT id INTO v_job_id
  FROM analysis_jobs
  WHERE status = 'queued'
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    UPDATE analysis_jobs
    SET status = 'running',
        started_at = now(),
        analyzer_version = p_analyzer_version
    WHERE id = v_job_id;
  END IF;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;
```

### Analysis Phases

**Phase 0-1: GitHub API Only (No Cloning)**
- Fetch commit metadata via GitHub REST API
- Analyze: messages, timestamps, file counts, line stats
- Good for repos up to ~5,000 commits
- Worker is lightweight Node.js

**Phase 2+: Git Cloning (Deep Analysis)**
- Clone repo to ephemeral storage
- Use git log for full history
- Analyze: file paths, churn patterns, hotspots
- Worker needs more resources (Fly.io with volumes)

### API Rate Limiting Strategy

**GitHub API limits:**
- Authenticated requests: 5,000/hour per user token
- We fetch commits in batches of 100 (max per page)
- A 10,000 commit repo = 100 API calls = 2% of hourly budget

**Mitigation:**
- Batch all commit fetches (100 per request)
- Cache repository metadata for 1 hour
- For repos > 5,000 commits: analyze most recent 5,000 with notice to user
- Track remaining rate limit in response headers; pause if < 100 remaining

**Internal rate limits:**
- Max 5 concurrent analysis jobs per user
- Max 20 repos connected per user (Phase 0)
- Max 1 analysis request per repo per 10 minutes

### Next.js Route Map

**Pages:**
- `/` - Landing page
- `/login` - Sign in with GitHub
- `/repos` - Repository picker
- `/repo/[id]` - Repo dashboard
- `/analysis/[jobId]` - Analysis report
- `/profile` - Multi-repo aggregation

**API Routes (server-only):**
- `POST /api/github/sync-repos` - Pull repo list from GitHub, upsert into repos
- `POST /api/analysis/start` - Create analysis_jobs row
- `GET /api/analysis/[id]` - Get job status (can also use Supabase client directly)

**Client reads via Supabase:**
- analysis_jobs status (with Realtime subscription)
- metrics + report JSON
- All protected by RLS

---

## 9. Data Model

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  user_repos  │       │    repos     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──────<│ user_id (FK) │       │ id (PK)      │
│ github_id    │   │   │ repo_id (FK) │>──────│ github_id    │
│ github_user  │   │   │ connected_at │       │ owner        │
│ avatar_url   │   │   │ disconnected │       │ name         │
│ email        │   │   │ settings     │       │ is_private   │
│ created_at   │   │   └──────────────┘       │ default_br   │
│ updated_at   │   │                          │ created_at   │
└──────────────┘   │                          └──────┬───────┘
       │           │                                 │
       │           │   ┌─────────────────────────────┘
       ▼           │   │
┌──────────────┐   │   ▼
│github_account│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
├──────────────┤   │  │ analysis_job │  │analysis_metric│  │analysis_report
│ id (PK)      │   │  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ user_id (FK) │<──┘  │ id (PK)      │─<│ job_id (FK)  │  │ job_id (FK)  │>─┐
│ github_user  │      │ user_id (FK) │  │ metrics      │  │ bolokono_type│  │
│ encrypted_tok│      │ repo_id (FK) │  │ events       │  │ narrative    │  │
│ scopes       │      │ status       │  │ computed_at  │  │ evidence     │  │
│ created_at   │      │ commit_count │  └──────────────┘  │ llm_model    │  │
│ updated_at   │      │ analyzer_ver │                    │ generated_at │  │
└──────────────┘      │ error_message│                    └──────────────┘  │
                      │ started_at   │                                      │
                      │ completed_at │                                      │
                      │ created_at   │◄─────────────────────────────────────┘
                      └──────────────┘
```

### Table Definitions

#### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Internal user ID |
| `github_id` | `bigint` | UNIQUE, NOT NULL | GitHub user ID |
| `github_username` | `text` | NOT NULL | GitHub login handle |
| `avatar_url` | `text` | | GitHub avatar URL |
| `email` | `text` | | Email (from GitHub, may be null) |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

#### `github_accounts`

Stores encrypted GitHub tokens for accessing private repos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | |
| `github_user_id` | `bigint` | NOT NULL | GitHub user ID |
| `encrypted_token` | `text` | NOT NULL | Encrypted with server-side key |
| `scopes` | `text[]` | NOT NULL | OAuth scopes granted |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

**Unique constraint:** `(user_id)` — one GitHub account per user.

**Security:** RLS ensures only the owner can access their token. Token is encrypted at rest using a server-side key (stored in environment variable).

#### `repos`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Internal repo ID |
| `github_id` | `bigint` | UNIQUE, NOT NULL | GitHub repository ID |
| `owner` | `text` | NOT NULL | Repository owner (user or org) |
| `name` | `text` | NOT NULL | Repository name |
| `full_name` | `text` | NOT NULL | `owner/name` combined |
| `is_private` | `boolean` | default `false` | |
| `default_branch` | `text` | default `'main'` | |
| `created_at` | `timestamptz` | default `now()` | |

**Index:** `(owner, name)` for lookups by slug.

#### `user_repos`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | |
| `repo_id` | `uuid` | FK → repos.id, NOT NULL | |
| `connected_at` | `timestamptz` | default `now()` | When user connected this repo |
| `disconnected_at` | `timestamptz` | | Null if still connected |
| `settings_json` | `jsonb` | default `'{}'` | Per-repo user preferences |

**Unique constraint:** `(user_id, repo_id)` — one connection per user-repo pair.

#### `analysis_jobs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | Who requested analysis |
| `repo_id` | `uuid` | FK → repos.id, NOT NULL | Which repo |
| `status` | `text` | NOT NULL, default `'queued'` | See state machine below |
| `commit_count` | `integer` | | Total commits analyzed |
| `analyzer_version` | `text` | NOT NULL | Semver of analyzer code |
| `error_message` | `text` | | Populated on failure |
| `started_at` | `timestamptz` | | When processing began |
| `completed_at` | `timestamptz` | | When processing finished |
| `created_at` | `timestamptz` | default `now()` | |

**Index:** `(user_id, repo_id, created_at DESC)` for "latest job" queries.

#### `analysis_metrics`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `job_id` | `uuid` | FK → analysis_jobs.id, UNIQUE, NOT NULL | One metrics row per job |
| `metrics_json` | `jsonb` | NOT NULL | Computed metrics (see schema below) |
| `events_json` | `jsonb` | NOT NULL | Commit events (see schema below) |
| `computed_at` | `timestamptz` | default `now()` | |

#### `analysis_reports`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `job_id` | `uuid` | FK → analysis_jobs.id, UNIQUE, NOT NULL | One report per job |
| `bolokono_type` | `text` | | Null if insufficient data |
| `narrative_json` | `jsonb` | NOT NULL | Structured narrative (see schema) |
| `evidence_json` | `jsonb` | NOT NULL | Cited commits and metrics |
| `llm_model` | `text` | NOT NULL | Model used for generation |
| `generated_at` | `timestamptz` | default `now()` | |

### Job Status State Machine

```
     ┌─────────┐
     │ queued  │ (initial state)
     └────┬────┘
          │ worker picks up
          ▼
     ┌─────────┐
     │ running │
     └────┬────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌───────┐  ┌─────────┐
│ done  │  │  error  │
└───────┘  └─────────┘
```

**Transitions:**
- `queued` → `running`: Worker claims job
- `running` → `done`: Analysis + report generation complete
- `running` → `error`: Unrecoverable failure (set `error_message`)
- `error` → `queued`: Manual retry (creates new job, not state change)

---

## 10. Row Level Security Policies

### Principle

Users can only access their own data. Repos are accessible if the user has a connection to them.

### Policies

```sql
-- users: users can only read/update their own row
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- github_accounts: users can only access their own GitHub credentials
CREATE POLICY github_accounts_select ON github_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY github_accounts_insert ON github_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY github_accounts_update ON github_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY github_accounts_delete ON github_accounts FOR DELETE USING (user_id = auth.uid());

-- repos: users can see repos they've connected
CREATE POLICY repos_select ON repos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_repos
    WHERE user_repos.repo_id = repos.id
    AND user_repos.user_id = auth.uid()
    AND user_repos.disconnected_at IS NULL
  )
);

-- user_repos: users can only see their own connections
CREATE POLICY user_repos_select ON user_repos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_repos_insert ON user_repos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_repos_update ON user_repos FOR UPDATE USING (user_id = auth.uid());

-- analysis_jobs: users can only see their own jobs
CREATE POLICY jobs_select ON analysis_jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY jobs_insert ON analysis_jobs FOR INSERT WITH CHECK (user_id = auth.uid());

-- analysis_metrics: accessible via job ownership
CREATE POLICY metrics_select ON analysis_metrics FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM analysis_jobs
    WHERE analysis_jobs.id = analysis_metrics.job_id
    AND analysis_jobs.user_id = auth.uid()
  )
);

-- analysis_reports: accessible via job ownership
CREATE POLICY reports_select ON analysis_reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM analysis_jobs
    WHERE analysis_jobs.id = analysis_reports.job_id
    AND analysis_jobs.user_id = auth.uid()
  )
);
```

### Service Role Access

The worker (`apps/worker`) uses the service role key to:
- Claim and update job status
- Insert metrics and reports
- Read GitHub tokens for fetching commits

This bypasses RLS intentionally for background processing. The worker validates job ownership before processing.

---

## 11. Analysis Model

### Minimum Data Requirements

| Threshold | Behavior |
|-----------|----------|
| < 5 commits | Analysis refused with message |
| 5-9 commits | Warning shown; limited metrics; no Bolokono type |
| 10-49 commits | Full metrics; Bolokono type with "low confidence" flag |
| 50+ commits | Full analysis |

### Commit Data Extracted

For each commit, we extract (via GitHub API):

```typescript
interface CommitEvent {
  sha: string;              // Full SHA
  message: string;          // First line only (subject)
  author_date: string;      // ISO timestamp
  committer_date: string;   // ISO timestamp
  author_email: string;     // For identifying user's commits
  files_changed: number;    // Count of files
  additions: number;        // Lines added
  deletions: number;        // Lines removed
  parents: string[];        // Parent SHAs (for merge detection)
}
```

**What we do NOT extract:**
- File contents
- File paths (Phase 0) — added in Phase 1 for category detection
- Full commit body
- Diffs

### Computed Metrics Schema

```typescript
interface AnalysisMetrics {
  // Volume
  total_commits: number;
  total_additions: number;
  total_deletions: number;
  total_files_changed: number;

  // Timing
  first_commit_date: string;
  last_commit_date: string;
  active_days: number;                    // Days with at least 1 commit
  span_days: number;                      // first to last commit

  // Commit size distribution
  commit_size_p50: number;                // Median (additions + deletions)
  commit_size_p90: number;                // 90th percentile
  commit_size_mean: number;
  commit_size_stddev: number;

  // Frequency
  commits_per_active_day_mean: number;
  commits_per_active_day_max: number;

  // Rhythm
  hours_between_commits_p50: number;
  hours_between_commits_p90: number;
  burstiness_score: number;               // See calculation below

  // Message analysis
  message_length_p50: number;             // Character count
  message_length_p90: number;
  conventional_commit_ratio: number;      // 0-1

  // Iteration patterns
  fix_commit_ratio: number;               // Commits matching "fix" pattern
  fixup_sequence_count: number;           // Rapid fix after feature

  // Build sequence (Phase 0: message-based only)
  category_first_occurrence: Record<BuildCategory, number>;  // Percentile
  category_distribution: Record<BuildCategory, number>;      // Count

  // Merge behavior
  merge_commit_ratio: number;

  // Confidence
  data_quality_score: number;             // 0-1 based on commit count
}
```

### Burstiness Score Calculation

Burstiness measures how "bursty" vs "steady" the commit pattern is.

```typescript
function calculateBurstiness(commitTimestamps: Date[]): number {
  if (commitTimestamps.length < 2) return 0;

  // Calculate inter-commit intervals in hours
  const intervals: number[] = [];
  for (let i = 1; i < commitTimestamps.length; i++) {
    const hours = (commitTimestamps[i] - commitTimestamps[i-1]) / (1000 * 60 * 60);
    intervals.push(hours);
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const stddev = Math.sqrt(
    intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / intervals.length
  );

  // Burstiness: (stddev - mean) / (stddev + mean)
  // Range: -1 (perfectly regular) to +1 (highly bursty)
  // 0 = Poisson-like randomness
  return (stddev - mean) / (stddev + mean);
}
```

**Interpretation:**
- `< -0.3`: Very steady/regular cadence
- `-0.3 to 0.3`: Moderate variation
- `> 0.3`: Bursty (clusters of rapid commits with gaps)

### Build Category Classification

#### Categories

| Category | Description |
|----------|-------------|
| `setup` | Project initialization, boilerplate, config |
| `auth` | Authentication, authorization, identity |
| `feature` | New functionality |
| `test` | Tests, test infrastructure |
| `infra` | CI/CD, deployment, infrastructure |
| `docs` | Documentation |
| `refactor` | Code restructuring without behavior change |
| `fix` | Bug fixes |
| `style` | Formatting, linting (no logic change) |
| `chore` | Maintenance, dependencies |
| `unknown` | No category matched |

#### Classification Rules (Priority Order)

Each commit is assigned **exactly one category**. Rules are evaluated top-to-bottom; first match wins.

```typescript
interface ClassificationRule {
  category: BuildCategory;
  patterns: RegExp[];
  priority: number;  // Lower = higher priority
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Priority 1: Conventional commit prefixes (exact)
  { category: 'feat',     patterns: [/^feat(\(.+\))?:/i],     priority: 1 },
  { category: 'fix',      patterns: [/^fix(\(.+\))?:/i],      priority: 1 },
  { category: 'test',     patterns: [/^test(\(.+\))?:/i],     priority: 1 },
  { category: 'docs',     patterns: [/^docs(\(.+\))?:/i],     priority: 1 },
  { category: 'style',    patterns: [/^style(\(.+\))?:/i],    priority: 1 },
  { category: 'refactor', patterns: [/^refactor(\(.+\))?:/i], priority: 1 },
  { category: 'chore',    patterns: [/^chore(\(.+\))?:/i],    priority: 1 },
  { category: 'infra',    patterns: [/^ci(\(.+\))?:/i, /^build(\(.+\))?:/i], priority: 1 },

  // Priority 2: Conventional commit scope overrides
  { category: 'auth',     patterns: [/^\w+\(auth\):/i],       priority: 2 },
  { category: 'setup',    patterns: [/^\w+\(setup\):/i, /^\w+\(init\):/i], priority: 2 },

  // Priority 3: Keyword matching (case-insensitive)
  { category: 'setup',    patterns: [/^initial/i, /^init\b/i, /^bootstrap/i, /^scaffold/i, /\bsetup\b/i, /\bboilerplate\b/i], priority: 3 },
  { category: 'auth',     patterns: [/\bauth/i, /\blogin\b/i, /\blogout\b/i, /\bsign.?in\b/i, /\bsign.?up\b/i, /\bsession\b/i, /\boauth\b/i, /\bjwt\b/i], priority: 3 },
  { category: 'test',     patterns: [/\btest/i, /\bspec\b/i, /\b(add|write|update).*(test|spec)/i], priority: 3 },
  { category: 'fix',      patterns: [/\bfix/i, /\bbug/i, /\bpatch\b/i, /\bhotfix\b/i, /\bresolve\b/i], priority: 3 },
  { category: 'docs',     patterns: [/\breadme\b/i, /\bdoc(s|umentation)?\b/i, /\bchangelog\b/i], priority: 3 },
  { category: 'infra',    patterns: [/\bci\b/i, /\bcd\b/i, /\bdeploy/i, /\bdocker/i, /\bkubernetes\b/i, /\bk8s\b/i, /\bgithub.?action/i, /\bworkflow\b/i, /\binfra/i], priority: 3 },
  { category: 'refactor', patterns: [/\brefactor/i, /\brestructure/i, /\breorganize/i, /\bcleanup\b/i, /\bclean.?up\b/i], priority: 3 },
  { category: 'style',    patterns: [/\blint/i, /\bformat/i, /\bprettier\b/i, /\beslint\b/i], priority: 3 },
  { category: 'chore',    patterns: [/\bchore\b/i, /\bdeps?\b/i, /\bdependenc/i, /\bbump\b/i, /\bupgrade\b/i, /\bupdate\b.*version/i], priority: 3 },

  // Priority 4: Feature as default for substantive commits
  { category: 'feature',  patterns: [/\badd/i, /\bimplement/i, /\bcreate\b/i, /\bnew\b/i, /\bintroduce\b/i], priority: 4 },
];

function classifyCommit(message: string): BuildCategory {
  const subject = message.split('\n')[0].trim();

  // Sort rules by priority
  const sortedRules = [...CLASSIFICATION_RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(subject)) {
        return rule.category;
      }
    }
  }

  return 'unknown';
}
```

#### Handling Special Cases

**Merge commits:**
- Identified by `parents.length > 1`
- Excluded from category classification
- Counted separately in `merge_commit_ratio`

**Fixup/squash commits:**
- Pattern: `^(fixup|squash)!\s`
- Counted but not categorized
- Used for `fixup_sequence_count` metric

**Co-authored commits:**
- Detected via `Co-authored-by:` in message
- Attributed to primary author for this analysis
- Future: may support multi-author tracking

---

## 12. Bolokono Types

### Type Definitions

Each Bolokono type has:
- **Name**: Human-readable label
- **Description**: One-sentence explanation
- **Criteria**: Metric thresholds for assignment
- **Signals**: What patterns indicate this type

```typescript
interface BolokonoType {
  id: string;
  name: string;
  description: string;
  criteria: TypeCriteria;
}

interface TypeCriteria {
  primary: MetricCondition[];    // Must ALL match
  secondary: MetricCondition[];  // At least 2 must match
}

interface MetricCondition {
  metric: keyof AnalysisMetrics;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
}
```

### Initial Type Catalog

#### 1. Foundation-First Craft

> Builds infrastructure and setup before features.

**Criteria:**
- `category_first_occurrence.setup` in bottom 20%
- `category_first_occurrence.infra` in bottom 40%
- `category_distribution.setup` > 10% of commits

**Signals:**
- Early commits focus on project structure
- CI/CD often established before features
- Config files appear in first 25% of timeline

#### 2. Auth-First Craft

> Prioritizes authentication and security early.

**Criteria:**
- `category_first_occurrence.auth` in bottom 25%
- `category_distribution.auth` > 5% of commits

**Signals:**
- Auth commits appear before most feature work
- Security-related patterns appear early

#### 3. Vertical-Slice Craft

> Builds complete features end-to-end before moving on.

**Criteria:**
- `commit_size_p50` > 50 lines
- Low category switching frequency (calculated from sequence)
- `burstiness_score` > 0.2

**Signals:**
- Commits are larger, self-contained
- Categories cluster together in timeline
- Less interleaving of different concerns

#### 4. Incremental Craft

> Builds in small, steady increments.

**Criteria:**
- `commit_size_p50` < 30 lines
- `burstiness_score` < 0
- `commits_per_active_day_mean` > 5

**Signals:**
- Many small commits
- Regular cadence
- Frequent progress

#### 5. Fix-Forward Craft

> Quickly iterates with fixes after initial implementation.

**Criteria:**
- `fix_commit_ratio` > 0.25
- `fixup_sequence_count` > 5
- `hours_between_commits_p50` < 2

**Signals:**
- High ratio of fix commits
- Rapid commit sequences
- "Ship then fix" pattern

#### 6. Test-Driven Craft

> Tests appear early and consistently.

**Criteria:**
- `category_first_occurrence.test` in bottom 30%
- `category_distribution.test` > 15%

**Signals:**
- Test commits throughout timeline
- Tests often precede or accompany features

#### 7. Documentation-Forward Craft

> Documentation is treated as first-class.

**Criteria:**
- `category_first_occurrence.docs` in bottom 50%
- `category_distribution.docs` > 8%

**Signals:**
- README/docs updated regularly
- Documentation not left until end

#### 8. Refactor-Driven Craft

> Regularly restructures code as understanding grows.

**Criteria:**
- `category_distribution.refactor` > 12%
- Refactor commits distributed across timeline (not clustered)

**Signals:**
- Ongoing code improvement
- Not just end-of-project cleanup

### Type Assignment Algorithm

```typescript
function assignBolokonoType(metrics: AnalysisMetrics): {
  type: BolokonoType | null;
  confidence: 'high' | 'medium' | 'low';
  matchedCriteria: string[];
} {
  if (metrics.total_commits < 10) {
    return { type: null, confidence: 'low', matchedCriteria: [] };
  }

  const matches: Array<{
    type: BolokonoType;
    score: number;
    criteria: string[];
  }> = [];

  for (const type of BOLOKONO_TYPES) {
    const primaryMatches = type.criteria.primary.filter(c => evaluateCondition(c, metrics));
    const secondaryMatches = type.criteria.secondary.filter(c => evaluateCondition(c, metrics));

    // Must match ALL primary criteria
    if (primaryMatches.length !== type.criteria.primary.length) continue;

    // Must match at least 2 secondary criteria
    if (secondaryMatches.length < 2) continue;

    const score = primaryMatches.length * 2 + secondaryMatches.length;
    matches.push({
      type,
      score,
      criteria: [...primaryMatches, ...secondaryMatches].map(c => c.metric)
    });
  }

  if (matches.length === 0) {
    return { type: null, confidence: 'low', matchedCriteria: [] };
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  const best = matches[0];
  const confidence = metrics.total_commits >= 50 ? 'high' : 'medium';

  return {
    type: best.type,
    confidence,
    matchedCriteria: best.criteria
  };
}
```

### Handling No Match

If no type matches:
- Report shows "Unique Craft" with available metrics
- Narrative focuses on observable patterns without type label
- This is not a failure state—some work patterns don't fit archetypes

---

## 13. Narrative Generation

### Principles

1. **Metrics first**: Every claim must cite a specific metric
2. **Evidence required**: Every insight must reference specific commits
3. **No speculation**: Never infer intent, skill, or quality
4. **Neutral tone**: Observational, not evaluative

### LLM Configuration

```typescript
interface NarrativeGenerationConfig {
  model: 'claude-3-5-sonnet-20241022';  // Or latest
  max_tokens: 1500;
  temperature: 0.3;  // Low for consistency
  system_prompt: NARRATIVE_SYSTEM_PROMPT;
}
```

### System Prompt

```
You are generating a Bolokono profile narrative. A Bolokono profile describes
how someone builds software based on observable patterns in their git history.

RULES:
1. Every statement must cite a specific metric value
2. Every insight must reference at least one specific commit SHA
3. Never speculate about:
   - Why the developer made choices
   - The developer's skill level
   - Code quality
   - Whether AI was used
4. Use neutral, observational language
5. Focus on patterns, not judgments

FORMAT:
Return a JSON object matching this schema:
{
  "summary": "2-3 sentence overview citing key metrics",
  "sections": [
    {
      "title": "Section name",
      "content": "Observation with metric citations",
      "evidence": ["sha1", "sha2"]
    }
  ],
  "highlights": [
    {
      "metric": "metric_name",
      "value": "formatted value",
      "interpretation": "neutral observation"
    }
  ]
}
```

### Input to LLM

```typescript
interface NarrativeInput {
  bolokono_type: string | null;
  metrics: AnalysisMetrics;
  sample_commits: CommitSample[];  // 10-20 representative commits
  matched_criteria: string[];
}

interface CommitSample {
  sha: string;
  message: string;  // Subject line only
  category: BuildCategory;
  timestamp: string;
  size: number;  // additions + deletions
}
```

### Output Validation

Before storing, validate that:
1. All cited SHAs exist in the analyzed commits
2. All cited metrics exist in the metrics object
3. No banned phrases appear (skill, talent, quality, AI, etc.)

```typescript
const BANNED_PHRASES = [
  /skill(ed|ful)?/i,
  /talent/i,
  /quality of (code|work)/i,
  /AI (generated|assisted|written)/i,
  /good (developer|engineer|coder)/i,
  /bad (developer|engineer|coder)/i,
  /junior|senior/i,
  /experience level/i,
];

function validateNarrative(narrative: NarrativeOutput, commits: CommitEvent[], metrics: AnalysisMetrics): ValidationResult {
  const errors: string[] = [];

  // Check SHA references
  const commitShas = new Set(commits.map(c => c.sha));
  for (const section of narrative.sections) {
    for (const sha of section.evidence) {
      if (!commitShas.has(sha)) {
        errors.push(`Invalid SHA reference: ${sha}`);
      }
    }
  }

  // Check banned phrases
  const fullText = JSON.stringify(narrative);
  for (const pattern of BANNED_PHRASES) {
    if (pattern.test(fullText)) {
      errors.push(`Banned phrase detected: ${pattern}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Failure Handling

If narrative generation fails validation:
1. Log failure with details
2. Retry once with stricter prompt
3. If still fails: store metrics without narrative
4. UI shows metrics with "Narrative unavailable" message

---

## 14. Security and Privacy

### Data Classification

| Data Type | Sensitivity | Storage | Retention |
|-----------|-------------|---------|-----------|
| GitHub user ID | Low | Permanent | Account lifetime |
| GitHub token | High | Encrypted at rest | Until revoked |
| Repo metadata | Medium | Permanent | Until disconnected |
| Commit metadata | Medium | Permanent | Until disconnected |
| Commit messages | Medium | Permanent | Until disconnected |
| Computed metrics | Low | Permanent | Until disconnected |
| Narratives | Low | Permanent | Until disconnected |

### GitHub Token Handling

```typescript
// Token is stored in Supabase Auth provider_token
// Never stored in application tables
// Accessed only via auth.getSession()

async function getGitHubToken(supabase: SupabaseClient): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.provider_token ?? null;
}
```

### Commit Message Sanitization

Before storing commit messages, we:
1. Truncate to first line (subject only)
2. Truncate to 200 characters max
3. Do NOT sanitize content (user controls what they commit)

**Warning displayed to users:**
> "Bolokono analyzes your commit messages. If your commits contain sensitive information (ticket IDs, customer names, internal project names), this will be stored and potentially displayed in your profile."

### Deletion Flow

When user disconnects a repo:

```sql
-- Soft-delete the connection
UPDATE user_repos
SET disconnected_at = now()
WHERE user_id = $1 AND repo_id = $2;

-- Hard-delete analysis data
DELETE FROM analysis_reports WHERE job_id IN (
  SELECT id FROM analysis_jobs WHERE user_id = $1 AND repo_id = $2
);
DELETE FROM analysis_metrics WHERE job_id IN (
  SELECT id FROM analysis_jobs WHERE user_id = $1 AND repo_id = $2
);
DELETE FROM analysis_jobs WHERE user_id = $1 AND repo_id = $2;

-- If no other users have this repo connected, delete repo
DELETE FROM repos WHERE id = $2 AND NOT EXISTS (
  SELECT 1 FROM user_repos WHERE repo_id = $2 AND disconnected_at IS NULL
);
```

### Full Account Deletion

User can delete their entire account:
1. All user_repos marked disconnected
2. All analysis data deleted
3. User row deleted
4. GitHub OAuth token revoked via API

---

## 15. UI States

### Global States

| State | Trigger | Display |
|-------|---------|---------|
| Loading | Initial page load | Skeleton components |
| Empty | No repos connected | "Connect your first repository" CTA |
| Error | API failure | Error message with retry button |
| Authenticated | Valid session | Normal UI |
| Unauthenticated | No session | Redirect to login |

### Repository List States

| State | Trigger | Display |
|-------|---------|---------|
| Loading repos | Fetching from GitHub | Skeleton list |
| No repos | User has no GitHub repos | Message + link to create repo |
| Has repos | Repos available | Selectable list with status badges |

### Analysis Job States

| State | Display |
|-------|---------|
| Queued | "Waiting to start..." with position in queue |
| Running | Progress indicator with stage (Fetching commits... Analyzing... Generating report...) |
| Done | "View Report" button |
| Error | Error message with retry button |

### Report States

| State | Display |
|-------|---------|
| Full report | Type badge, narrative, metrics, timeline |
| Low confidence | Yellow "Low confidence" badge, metrics only |
| Insufficient data | "Not enough commits" message with threshold info |
| No type match | "Unique Craft" with metrics and patterns |
| Narrative failed | Metrics and timeline without narrative section |

---

## 16. Success Metrics

### Quantitative

| Metric | Target (Phase 0) | Measurement |
|--------|------------------|-------------|
| Analysis completion rate | > 95% | Completed jobs / total jobs |
| Analysis p95 latency | < 60s | For repos < 1000 commits |
| Report generation success | > 90% | Reports with narrative / completed jobs |
| User return rate (7 day) | > 30% | Users who return within 7 days |

### Qualitative

| Signal | Measurement Method |
|--------|-------------------|
| Profile resonance | User feedback (future: thumbs up/down) |
| Trust in privacy | Disconnect rate, deletion rate |
| Evidence clarity | Support tickets about confusing reports |

---

## 17. Implementation Plan

### Phase 0: Foundation (Sequential)

Each task depends on the previous.

#### Task 0.1: Project Setup ✓

- [x] Initialize monorepo with Turborepo
- [x] Set up `apps/web` (Next.js with TypeScript, Tailwind)
- [x] Set up `apps/worker` scaffold
- [x] Set up `packages/core` (shared types and analysis logic)
- [x] Set up `packages/db` (Supabase client and types)
- [x] Configure environment variables pattern

**Output:** Monorepo structure with apps and packages.

#### Task 0.2: Supabase Setup

- [x] Create Supabase project (production)
- [x] Set up local development with Supabase CLI
- [ ] Create initial migration with full schema
- [ ] Implement RLS policies
- [ ] Create `claim_analysis_job` function
- [ ] Test RLS policies with different user contexts

**Output:** Database with schema, RLS, and job claiming function.

#### Task 0.3: Authentication

- [ ] Configure GitHub OAuth provider in Supabase
- [ ] Create GitHub OAuth app (for additional scopes)
- [ ] Implement Supabase Auth in `apps/web`
- [ ] Create sign-in page
- [ ] Create auth callback handler
- [ ] Store GitHub token in `github_accounts` (encrypted)
- [ ] Create protected route middleware

**Output:** User can sign in with GitHub, token stored securely.

#### Task 0.4: Repository Sync

- [ ] Create GitHub API client in `apps/web`
- [ ] Implement `POST /api/github/sync-repos` endpoint
- [ ] Create repo selection UI
- [ ] Implement repo connection flow (`user_repos`)
- [ ] Implement repo disconnection with data cleanup

**Output:** User can see their repos and connect/disconnect them.

#### Task 0.5: Analysis Job System

- [ ] Create `POST /api/analysis/start` endpoint
- [ ] Set up Supabase Realtime subscription for job status
- [ ] Create job status UI component with live updates
- [ ] Implement basic worker loop in `apps/worker`
- [ ] Test job claiming with `FOR UPDATE SKIP LOCKED`

**Output:** Jobs can be queued and status tracked in real-time.

#### Task 0.6: Commit Analysis (Worker)

- [ ] Implement GitHub API client in `apps/worker`
- [ ] Implement commit fetching (paginated, batched)
- [ ] Implement commit classification (`packages/core`)
- [ ] Implement metrics computation (`packages/core`)
- [ ] Store metrics in `analysis_metrics`
- [ ] Handle rate limits gracefully
- [ ] Handle large repos (> 5000 commits notice)

**Output:** Worker fetches commits and computes metrics.

#### Task 0.7: Report Generation (Worker)

- [ ] Implement Bolokono type matching (`packages/core`)
- [ ] Create Claude API client in `apps/worker`
- [ ] Implement narrative generation with structured output
- [ ] Implement narrative validation (banned phrases, SHA checks)
- [ ] Store reports in `analysis_reports`
- [ ] Handle generation failures gracefully

**Output:** Worker generates and stores reports.

#### Task 0.8: Report UI

- [ ] Create report page layout in `apps/web`
- [ ] Implement Bolokono type display with badge
- [ ] Implement metrics cards (key stats)
- [ ] Implement narrative sections with evidence
- [ ] Create build timeline visualization
- [ ] Handle loading/error/insufficient-data states

**Output:** User can view their Bolokono profile.

### Phase 0 Exit Criteria

- [ ] End-to-end flow works for private repo
- [ ] All RLS policies enforced
- [ ] Worker processes jobs correctly
- [ ] Analysis completes in < 60s for < 1000 commits
- [ ] Report displays type, metrics, and narrative
- [ ] User can disconnect repo and data is deleted

---

## 18. Future Phases (Overview)

### Phase 1A: UI Exploration
- Interactive timeline
- Filterable metrics dashboard
- Commit drill-down

### Phase 1B: Metrics Enrichment
- File path analysis (opt-in)
- Better category detection
- Temporal pattern analysis

### Phase 1C: Narrative Engine
- Multiple narrative styles
- Comparison narratives
- Trend narratives

### Phase 1D: Multi-Repo Aggregation
#### Summary

**Goal:** A single **Vibed Coding Profile** per user that becomes more accurate as more repos are analyzed.

**Non-goal:** A “persona per repository” product. Repo-level personas can exist as *facets*, but the primary experience is the **user-level aggregate profile**.

#### Current State (As Built)

- We run one `analysis_job` per repo run.
- We persist outputs per job (`analysis_metrics`, `analysis_reports`, `analysis_insights`).
- The UI primarily surfaces job-level results (reports/stories), and the “profile” experience is effectively “latest job insight”.

This makes it easy to drill into a repo/run, but it does not deliver the core promise: a single profile that is refined across repos and over time.

#### Target Experience (User Journey)

1. User lands on **Profile** (default destination after login).
2. Profile shows:
   - Current primary persona (label + confidence)
   - “Why” highlights (top signals) + evidence
   - “Profile evolution” timeline (persona changes over time)
   - Repo facets (“In this repo you skewed Architect; in that repo you skewed Validator”)
3. User connects/analyses more repos → profile updates and evolution timeline records the shift.
4. User can deep-dive:
   - Repo-level story (a specific `analysis_job`)
   - Cross-repo comparisons and consistency patterns

#### Definitions

- **Repo Run (Job):** One analysis execution against one repository (existing `analysis_jobs`).
- **Repo Facet Persona:** Persona detected from a single job (existing `analysis_insights.persona_*`).
- **User Profile Persona:** Persona computed from aggregated signals across selected repos/runs (new).
- **Profile Snapshot:** A persisted representation of the user profile at a point in time, with inputs + outputs (new).

#### Functional Requirements

**Profile computation**
- The system computes a **single user profile persona** using deterministic aggregation of job metrics/insights.
- Profile is recomputed when:
  - A job reaches `done` with all required outputs written
  - The user changes which repos are included in their profile (future: toggle include/exclude)

**Profile history**
- The system records changes over time (“persona evolution”).
- The system can show a timeline of snapshots (and optionally a diff explanation).

**Repo facets**
- The user can see per-repo facets (latest successful run per connected repo).

**Privacy**
- Profile is only visible to the owning user by default (RLS).
- Disconnecting a repo removes it from future profile snapshots and optionally triggers recompute.

#### Aggregation Approach (Metrics First)

We preserve the principle: **metrics first, narrative second**.

**V1 (deterministic, recommended):**
- Aggregate *signals* across jobs:
  - Sum/merge the counts that drive persona detection (feature/test/docs/setup/fix/etc.)
  - Weight by job `commit_count` (or analyzed commits) so tiny repos don’t dominate
  - Incorporate confidence weighting (e.g., high=1.0, medium=0.66, low=0.33)
- Run persona classification over the aggregated totals to get:
  - `persona_id`, `persona_label`, `persona_confidence`
  - evidence rollups (top SHAs across repos)

**V0 (MVP bridge, acceptable as a stepping stone):**
- Compute user profile as a weighted vote across the latest facet per repo:
  - weight = `commit_count × confidence_weight`
  - pick persona with highest total weight
- This delivers “single persona” quickly, but does not yet surface deep cross-repo patterns.

#### Data Model Changes (Proposed)

Add new tables for user-level aggregation:

- `profile_snapshots`
  - `id` UUID PK
  - `user_id` UUID FK → `users.id`
  - `computed_at` TIMESTAMPTZ
  - `persona_id` TEXT
  - `persona_label` TEXT
  - `persona_confidence` TEXT
  - `inputs_json` JSONB (selected repos, job ids, weighting params, versions)
  - `profile_json` JSONB (aggregated signals, highlights, evidence pointers)
  - `generator_version` TEXT

- `profile_snapshot_repos`
  - `profile_snapshot_id` UUID FK → `profile_snapshots.id`
  - `repo_id` UUID FK → `repos.id`
  - `job_id` UUID FK → `analysis_jobs.id` (the facet run used)
  - Unique (`profile_snapshot_id`, `repo_id`)

RLS:
- Only the owning user can select/insert/update their snapshots.

#### Backend Changes (Proposed)

- Add a “profile recompute” step triggered after a job completes:
  - Worker (or server-side job) computes next `profile_snapshot`
  - Ensures “Profile is always up to date” without client-side recompute

APIs:
- `GET /api/profile` → current snapshot + included repos facets
- `GET /api/profile/history` → list snapshots for timeline

#### UI Changes (Proposed)

- Make `/` the Profile page (already partially aligned in current UI copy).
- Add explicit navigation item “Profile”.
- Adjust `/analysis` to be “Stories” (job history) with filtering by repo.
- Keep `/repos` as “Sources/Chapters” (connect repos, run analyses) but it should clearly explain how it updates Profile.

#### Gaps From Where We Are Now

**Product/UX gaps**
- No first-class “Profile” screen that aggregates across repos (the current dashboard uses latest persona/run, not an aggregate).
- Repos and Reports/Stories are not explicitly framed as “inputs” vs “outputs” of the Profile.
- No “persona evolution timeline” surfaced to the user.

**Data/compute gaps**
- No persisted user-level profile entity (no `profile_snapshots`).
- No aggregation algorithm implemented (only per-job persona detection).
- No canonical selection rule for “which jobs count” (latest per repo, time window, exclude repos, etc.).

**Reliability gaps**
- Job “done” status can be decoupled from downstream outputs unless enforced (must guarantee profile recompute runs only when outputs exist).

#### Delivery Plan (Phased)

**Milestone 1: Profile v0 (Derived, no new tables)**
- Compute user profile at request time from latest job per repo (weighted vote).
- UI: Profile page shows “Current persona” + per-repo facets.

**Milestone 2: Profile v1 (Persisted snapshots)**
- Add `profile_snapshots` (+ memberships) with RLS.
- Recompute snapshot on each completed job.
- UI: Profile shows timeline of snapshots.

**Milestone 3: Cross-repo patterns**
- Add “consistency scoring” and “cross-repo highlights” to `profile_json`.
- Expand receipts + evidence views across repos.

#### Success Criteria

- After analyzing N repos, user sees exactly one “Current Vibed Profile persona” reflecting aggregate signals.
- Adding a new repo analysis updates the profile and appends to the history timeline.
- User can still open any specific repo run and see the repo facet/persona without losing the main profile thread.

### Phase 1E: Privacy and Trust
- Granular privacy controls
- Audit log
- Data export

### Phase 2: Scale
- External worker for large repos
- Team profiles
- Public profile sharing

---

## Appendix A: API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/signin` | Initiate GitHub OAuth |
| GET | `/auth/callback` | OAuth callback handler |
| POST | `/auth/signout` | Sign out |

### Repositories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/repos` | List user's GitHub repos |
| GET | `/api/repos/connected` | List connected repos |
| POST | `/api/repos/connect` | Connect a repo |
| DELETE | `/api/repos/:id` | Disconnect a repo |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analysis/jobs` | Create analysis job |
| GET | `/api/analysis/jobs/:id` | Get job status |
| GET | `/api/analysis/jobs/:id/report` | Get analysis report |

### User

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user` | Get current user |
| DELETE | `/api/user` | Delete account |

---

## Appendix B: Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GitHub (for server-side operations)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# LLM
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| Bolokono | The product name; means "inside the handwork" in Dioula |
| Bolokono type | A classification of work patterns (e.g., "Auth-First Craft") |
| Bolokono profile | The complete analysis output for a repo or user |
| Build category | Classification of a commit's purpose (setup, auth, feature, etc.) |
| Burstiness | Measure of how clustered vs. regular commit timing is |
| Evidence | Specific commits or metrics cited to support an insight |
| Narrative | LLM-generated text summarizing the Bolokono profile |

---

*End of PRD*
