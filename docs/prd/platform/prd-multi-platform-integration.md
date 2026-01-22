# PRD: Multi-Platform Repository Integration

**Status:** Draft
**Author:** Claude
**Date:** 2026-01-18
**Implementer:** AI Agent (Claude Code)

---

## Implementation Notes for AI Agent

This PRD is designed to be implemented by an AI coding agent. Key principles:

1. **Follow the phase order strictly** - Each phase builds on the previous
2. **Run tests after each step** - Verify before moving to next step
3. **Check TypeScript compilation** - Run `npx tsc --noEmit` after code changes
4. **Use existing patterns** - Match the codebase's existing code style and patterns
5. **Ask for clarification** - If requirements are ambiguous, ask the user
6. **Create migrations incrementally** - One migration file per logical change
7. **Preserve backwards compatibility** - Existing GitHub users must continue working

### Codebase Context

```
/apps/web/                    # Next.js web application
  src/app/                    # App router pages
  src/lib/                    # Shared utilities
    supabase/                 # Supabase client utilities
    admin.ts                  # Admin utilities
    theme.ts                  # UI theme constants
  src/components/             # Reusable UI components

/packages/core/               # Shared business logic
  src/                        # Core analysis logic
    vibe.ts                   # Persona computation
    metrics.ts                # Metrics calculation

/supabase/
  migrations/                 # SQL migration files (numbered)

/apps/worker/                 # Background job processor
```

### Before Starting Each Phase

1. Read existing related files to understand current patterns
2. Check `supabase/migrations/` for the latest migration number
3. Verify the dev server runs: `cd apps/web && npm run dev`
4. Verify TypeScript compiles: `npx tsc --noEmit`

---

## Overview

Vibe Coding Profile currently supports GitHub as the sole platform for authentication and repository analysis. This PRD outlines the integration of **GitLab** and **Bitbucket** as additional platforms, enabling users to:

1. Sign in via OAuth using any of the three platforms
2. Connect additional platforms as repo sources (independent of login)
3. Analyze repos from all connected platforms
4. Maintain a single, unified VCP aggregated across all platforms

---

## Goals

| Goal | Description |
|------|-------------|
| **Broader reach** | Support developers who primarily use GitLab or Bitbucket |
| **Unified identity** | One Unified VCP per user, regardless of where their code lives |
| **Flexible connections** | Users can connect/disconnect platforms independently of their login method |
| **Consistent UX** | Same analysis flow and profile experience across all platforms |

### Non-Goals (v1)

- Self-hosted GitLab/Bitbucket instances (future consideration)
- Azure DevOps, Gitea, or other platforms
- Cross-platform PR/merge request analysis (commits only for v1)

---

## User Stories

### Authentication

1. **As a new user**, I can sign up using GitHub, GitLab, or Bitbucket OAuth so I can use my preferred platform.

2. **As an existing user**, I can link additional OAuth providers to my account so I have multiple login options.

3. **As a user**, I have one primary platform connection that serves as my account identity (username, avatar, email fallback).

### Repo Sources

4. **As a user**, I can connect GitLab or Bitbucket as additional repo sources, even if I signed in with GitHub.

5. **As a user**, I can browse and select repos from any connected platform to analyze.

6. **As a user**, I can disconnect a platform's repo source without affecting my ability to log in (if I have another method).

7. **As a user**, I can see which platform each connected repo belongs to.

### Unified Profile

8. **As a user**, my Unified VCP aggregates commits from all analyzed repos across all platforms.

9. **As a user**, I can see per-repo breakdowns by platform in my analysis history.

10. **As a user**, disconnecting a platform removes its repos from my profile (with option to keep historical data).

---

## Platform Comparison

| Capability | GitHub | GitLab | Bitbucket |
|------------|--------|--------|-----------|
| OAuth 2.0 | Yes | Yes | Yes |
| List user repos | `GET /user/repos` | `GET /projects` | `GET /repositories/{workspace}` |
| List org/group repos | `GET /orgs/{org}/repos` | `GET /groups/{id}/projects` | `GET /repositories/{workspace}` |
| Commit list | `GET /repos/{owner}/{repo}/commits` | `GET /projects/{id}/repository/commits` | `GET /repositories/{workspace}/{repo}/commits` |
| Commit detail | `GET /repos/{owner}/{repo}/commits/{sha}` | `GET /projects/{id}/repository/commits/{sha}` | `GET /repositories/{workspace}/{repo}/commit/{sha}` |
| Rate limits | 5,000/hr (authed) | 2,000/hr | 1,000/hr |
| Webhook support | Yes | Yes | Yes |

### OAuth Scopes Required

**GitHub:**
- `read:user` - User profile
- `user:email` - Email addresses
- `repo` - Private repo access (or `public_repo` for public only)
- `read:org` - Org membership

**GitLab:**
- `read_user` - User profile
- `read_api` - API access
- `read_repository` - Repo access

**Bitbucket:**
- `account` - User profile
- `repository` - Repo access
- `pullrequest` - PR metadata (optional, for future)

---

## Data Model Changes

### New: `platforms` table

Stores OAuth connections per user per platform.

```sql
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Platform identifier
  platform TEXT NOT NULL CHECK (platform IN ('github', 'gitlab', 'bitbucket')),

  -- Platform-specific user info
  platform_user_id TEXT NOT NULL,        -- e.g., GitHub user ID, GitLab user ID
  platform_username TEXT,                 -- e.g., "devakone"
  platform_email TEXT,
  platform_avatar_url TEXT,

  -- OAuth credentials (encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],                          -- Granted scopes

  -- Connection state
  is_primary BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE (user_id, platform),
  UNIQUE (platform, platform_user_id)
);

-- Only one primary platform per user
CREATE UNIQUE INDEX platforms_one_primary
  ON platforms (user_id)
  WHERE is_primary = true AND disconnected_at IS NULL;
```

### Modified: `users` table

Remove GitHub-specific columns, reference primary platform instead.

```sql
-- Remove these columns (migrate data first):
-- github_id, github_username, avatar_url, github_access_token_encrypted, github_scopes

-- Add:
ALTER TABLE users ADD COLUMN primary_platform_id UUID REFERENCES platforms(id);

-- Computed/denormalized for convenience (updated via trigger):
ALTER TABLE users ADD COLUMN display_username TEXT;
ALTER TABLE users ADD COLUMN display_avatar_url TEXT;
```

### Modified: `repos` table

Add platform field and platform-specific identifiers.

```sql
ALTER TABLE repos ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));

-- Rename github_id to platform_repo_id for clarity
ALTER TABLE repos RENAME COLUMN github_id TO platform_repo_id;

-- Add platform-specific fields
ALTER TABLE repos ADD COLUMN platform_owner TEXT;      -- org/group/workspace
ALTER TABLE repos ADD COLUMN platform_project_id TEXT; -- GitLab project ID, etc.

-- Update unique constraint
ALTER TABLE repos DROP CONSTRAINT repos_github_id_key;
ALTER TABLE repos ADD CONSTRAINT repos_platform_unique
  UNIQUE (platform, platform_repo_id);
```

### Modified: `user_repos` table

Add reference to which platform connection was used.

```sql
ALTER TABLE user_repos ADD COLUMN platform_id UUID REFERENCES platforms(id);
```

### Modified: `analysis_jobs` table

Track which platform the analyzed repo belongs to.

```sql
ALTER TABLE analysis_jobs ADD COLUMN platform TEXT NOT NULL DEFAULT 'github';
```

---

## API Design

### OAuth Endpoints

```
GET  /api/auth/[platform]/login      # Initiate OAuth flow
GET  /api/auth/[platform]/callback   # Handle OAuth callback
POST /api/auth/[platform]/disconnect # Disconnect platform (not delete)
POST /api/auth/[platform]/reconnect  # Re-auth existing connection
```

Where `[platform]` is `github`, `gitlab`, or `bitbucket`.

### Platform Management

```
GET  /api/platforms                  # List user's connected platforms
POST /api/platforms/[platform]/connect    # Connect new platform (when already logged in)
POST /api/platforms/[platform]/disconnect # Disconnect platform
POST /api/platforms/[platform]/set-primary # Change primary platform
```

### Repo Sync (per platform)

```
POST /api/[platform]/sync-repos      # Fetch repos from platform
GET  /api/repos?platform=gitlab      # Filter repos by platform
```

### Unified Endpoints (unchanged)

```
POST /api/repos/connect              # Connect repo (includes platform in body)
POST /api/repos/disconnect           # Disconnect repo
POST /api/analysis/start             # Start analysis (platform inferred from repo)
GET  /api/profile                    # Unified profile (all platforms)
```

---

## Authentication Flow

### New User Sign-Up

```
1. User clicks "Sign in with GitLab"
2. Redirect to GitLab OAuth
3. Callback receives auth code
4. Exchange for access token
5. Fetch GitLab user profile
6. Create `users` row (email from GitLab)
7. Create `platforms` row (is_primary = true)
8. Set users.primary_platform_id
9. Redirect to /repos
```

### Existing User - Add Platform

```
1. User is logged in (via GitHub)
2. User clicks "Connect GitLab" in settings
3. Redirect to GitLab OAuth (with state containing user_id)
4. Callback validates state, confirms logged-in user
5. Check if GitLab account already linked to another user
   - If yes: error "This GitLab account is linked to another Vibe Coding Profile account"
   - If no: continue
6. Create `platforms` row (is_primary = false)
7. Redirect back to settings with success
```

### Login with Secondary Platform

```
1. User clicks "Sign in with GitLab"
2. OAuth flow completes
3. Look up platforms row by (platform, platform_user_id)
4. If found: log in as that user
5. If not found: create new user (new account)
```

---

## UI Changes

### Login Page

```
┌─────────────────────────────────────┐
│                                     │
│     Sign in to Vibe Coding Profile         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Continue with GitHub       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Continue with GitLab       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Continue with Bitbucket    │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Settings / Connected Platforms

```
┌─────────────────────────────────────────────────────────┐
│ Connected Platforms                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  GitHub          @devakone           PRIMARY             │
│  ────────────────────────────────────────────────────   │
│  Connected · 12 repos · Last synced Jan 15              │
│                                     [Disconnect]         │
│                                                          │
│  GitLab          @devakone                               │
│  ────────────────────────────────────────────────────   │
│  Connected · 3 repos · Last synced Jan 18               │
│                         [Make Primary] [Disconnect]      │
│                                                          │
│  Bitbucket       Not connected                           │
│  ────────────────────────────────────────────────────   │
│                                     [Connect]            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Repos Page - Platform Tabs/Filter

```
┌─────────────────────────────────────────────────────────┐
│ Your repos                                               │
│                                                          │
│ [All] [GitHub (12)] [GitLab (3)]                        │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🐙 devakone/vibe-coding-profile          [View VCP]       │ │
│ │ GitHub · Private · Updated Jan 18                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🦊 devakone/ml-experiments        [Get vibe]        │ │
│ │ GitLab · Private · Updated Jan 10                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Add Repo - Platform Selector

```
┌─────────────────────────────────────────────────────────┐
│ Add a repo                                               │
│                                                          │
│ Platform: [GitHub ▾]                                     │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Search repos...                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Profile Aggregation

The unified profile computation remains the same, but now sources commits from all platforms:

```typescript
// Pseudocode for aggregation
async function computeUnifiedProfile(userId: string) {
  // Get all completed vibe_insights across all platforms
  const insights = await db.query(`
    SELECT vi.*, aj.platform, r.full_name
    FROM vibe_insights vi
    JOIN analysis_jobs aj ON vi.job_id = aj.id
    JOIN repos r ON aj.repo_id = r.id
    WHERE aj.user_id = $1 AND aj.status = 'done'
  `, [userId]);

  // Aggregate using existing commit-weighted logic
  // Platform is tracked but doesn't affect weighting
  return aggregateVibeInsights(insights);
}
```

### Profile Display

The dashboard shows unified metrics with optional platform breakdown:

```
┌─────────────────────────────────────────────────────────┐
│ Your Unified VCP                                       │
│                                                          │
│ Rapid Risk-Taker                                         │
│ High confidence · 698 commits across 8 repos            │
│                                                          │
│ Sources:                                                 │
│   GitHub: 6 repos · 612 commits                         │
│   GitLab: 2 repos · 86 commits                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Worker Changes

### Platform-Aware Fetching

The analysis worker needs platform-specific API clients:

```typescript
// packages/core/src/platforms/index.ts
export interface PlatformClient {
  listCommits(repo: RepoIdentifier, options: ListOptions): Promise<Commit[]>;
  getCommitDetail(repo: RepoIdentifier, sha: string): Promise<CommitDetail>;
  getCurrentUser(): Promise<PlatformUser>;
  listRepos(): Promise<PlatformRepo[]>;
}

export function createPlatformClient(
  platform: 'github' | 'gitlab' | 'bitbucket',
  accessToken: string
): PlatformClient {
  switch (platform) {
    case 'github': return new GitHubClient(accessToken);
    case 'gitlab': return new GitLabClient(accessToken);
    case 'bitbucket': return new BitbucketClient(accessToken);
  }
}
```

### Normalized Commit Format

All platforms return commits in a normalized format:

```typescript
interface NormalizedCommit {
  sha: string;
  message: string;
  authoredAt: Date;
  committedAt: Date;
  authorName: string;
  authorEmail: string;

  // Stats (may require additional API call)
  additions?: number;
  deletions?: number;
  filesChanged?: number;

  // Parent SHAs for merge detection
  parents: string[];

  // Platform metadata
  platform: 'github' | 'gitlab' | 'bitbucket';
  platformCommitUrl: string;
}
```

---

## Implementation Plan (AI Agent Instructions)

Each phase has explicit steps. Complete all steps in order. Mark each step done before proceeding.

---

### Phase 1: Database Schema

**Goal:** Create new tables and migrate existing GitHub data without breaking current functionality.

#### Step 1.1: Create platforms table migration

**File to create:** `supabase/migrations/XXXX_create_platforms_table.sql`

```sql
-- Create platforms table for multi-provider OAuth
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('github', 'gitlab', 'bitbucket')),

  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  platform_email TEXT,
  platform_avatar_url TEXT,

  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],

  is_primary BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, platform),
  UNIQUE (platform, platform_user_id)
);

-- Only one primary platform per user
CREATE UNIQUE INDEX platforms_one_primary_idx
  ON platforms (user_id)
  WHERE is_primary = true AND disconnected_at IS NULL;

-- RLS policies
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platforms"
  ON platforms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platforms"
  ON platforms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platforms"
  ON platforms FOR UPDATE
  USING (auth.uid() = user_id);
```

**Verification:**
```bash
cd /path/to/project && npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54422/postgres" -c "\d platforms"
```

#### Step 1.2: Migrate existing GitHub data to platforms table

**File to create:** `supabase/migrations/XXXX_migrate_github_to_platforms.sql`

```sql
-- Migrate existing GitHub connections to platforms table
INSERT INTO platforms (
  user_id,
  platform,
  platform_user_id,
  platform_username,
  platform_email,
  platform_avatar_url,
  access_token_encrypted,
  scopes,
  is_primary,
  connected_at
)
SELECT
  id AS user_id,
  'github' AS platform,
  github_id AS platform_user_id,
  github_username AS platform_username,
  email AS platform_email,
  avatar_url AS platform_avatar_url,
  github_access_token_encrypted AS access_token_encrypted,
  github_scopes AS scopes,
  true AS is_primary,
  created_at AS connected_at
FROM users
WHERE github_id IS NOT NULL
  AND github_access_token_encrypted IS NOT NULL;

-- Add primary_platform_id to users
ALTER TABLE users ADD COLUMN primary_platform_id UUID REFERENCES platforms(id);

-- Update users with their primary platform
UPDATE users u
SET primary_platform_id = p.id
FROM platforms p
WHERE p.user_id = u.id AND p.is_primary = true;
```

**Verification:**
```sql
SELECT COUNT(*) FROM platforms WHERE platform = 'github';
SELECT COUNT(*) FROM users WHERE primary_platform_id IS NOT NULL;
```

#### Step 1.3: Add platform column to repos table

**File to create:** `supabase/migrations/XXXX_add_platform_to_repos.sql`

```sql
-- Add platform to repos (default github for existing)
ALTER TABLE repos ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));

-- Rename github_id to platform_repo_id for clarity
ALTER TABLE repos RENAME COLUMN github_id TO platform_repo_id;

-- Add index for platform queries
CREATE INDEX repos_platform_idx ON repos(platform);
```

#### Step 1.4: Add platform to analysis_jobs

**File to create:** `supabase/migrations/XXXX_add_platform_to_jobs.sql`

```sql
ALTER TABLE analysis_jobs ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));
```

**Acceptance Criteria - Phase 1:**
- [ ] All migrations apply without error: `npx supabase db reset`
- [ ] Existing GitHub users have rows in `platforms` table
- [ ] `users.primary_platform_id` is populated for all existing users
- [ ] `repos.platform` defaults to 'github'
- [ ] RLS policies allow users to see only their own platforms

---

### Phase 2: Refactor GitHub to Use New Schema

**Goal:** Update all GitHub code to use the `platforms` table. Existing functionality must work identically.

#### Step 2.1: Create platform utilities

**File to create:** `apps/web/src/lib/platforms.ts`

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformType = "github" | "gitlab" | "bitbucket";

export interface PlatformConnection {
  id: string;
  platform: PlatformType;
  platformUserId: string;
  platformUsername: string | null;
  platformEmail: string | null;
  platformAvatarUrl: string | null;
  isPrimary: boolean;
  connectedAt: string;
  disconnectedAt: string | null;
  lastSyncedAt: string | null;
}

export async function getUserPlatforms(userId: string): Promise<PlatformConnection[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("platforms")
    .select("*")
    .eq("user_id", userId)
    .is("disconnected_at", null)
    .order("is_primary", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    platform: row.platform as PlatformType,
    platformUserId: row.platform_user_id,
    platformUsername: row.platform_username,
    platformEmail: row.platform_email,
    platformAvatarUrl: row.platform_avatar_url,
    isPrimary: row.is_primary,
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    lastSyncedAt: row.last_synced_at,
  }));
}

export async function getPrimaryPlatform(userId: string): Promise<PlatformConnection | null> {
  const platforms = await getUserPlatforms(userId);
  return platforms.find((p) => p.isPrimary) ?? platforms[0] ?? null;
}

export async function getPlatformToken(
  userId: string,
  platform: PlatformType
): Promise<string | null> {
  // Use service client since tokens are encrypted
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("platforms")
    .select("access_token_encrypted")
    .eq("user_id", userId)
    .eq("platform", platform)
    .is("disconnected_at", null)
    .single();

  if (!data?.access_token_encrypted) return null;

  // Decrypt token (use existing encryption utility)
  const { decryptToken } = await import("@/lib/encryption");
  return decryptToken(data.access_token_encrypted);
}
```

#### Step 2.2: Update GitHub OAuth callback

**File to modify:** `apps/web/src/app/api/auth/callback/route.ts`

Update to write to `platforms` table instead of `users` table for GitHub credentials.

**Key changes:**
1. After successful OAuth, upsert into `platforms` table
2. Set `is_primary = true` for new users
3. Update `users.primary_platform_id` reference
4. Keep `users` table for auth identity, remove GitHub-specific columns usage

#### Step 2.3: Update GitHub sync-repos API

**File to modify:** `apps/web/src/app/api/github/sync-repos/route.ts`

**Key changes:**
1. Get token from `platforms` table via `getPlatformToken()`
2. Keep rest of logic the same

#### Step 2.4: Update worker to read from platforms

**File to modify:** `apps/worker/src/` (relevant files)

**Key changes:**
1. Get GitHub token from `platforms` table
2. Ensure analysis jobs work with new schema

**Acceptance Criteria - Phase 2:**
- [ ] Existing users can still log in via GitHub
- [ ] Repo sync works using token from `platforms` table
- [ ] Analysis jobs complete successfully
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] No references to `users.github_access_token_encrypted` in active code paths

---

### Phase 3: Add GitLab Integration

**Goal:** Full GitLab support for OAuth login and repo analysis.

#### Step 3.1: Add GitLab OAuth environment variables

**File to update:** `apps/web/.env.example`

```env
# GitLab OAuth
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
GITLAB_REDIRECT_URI=http://localhost:3000/api/auth/gitlab/callback
```

#### Step 3.2: Create GitLab OAuth routes

**File to create:** `apps/web/src/app/api/auth/gitlab/route.ts`

```typescript
import { redirect } from "next/navigation";

export async function GET() {
  const clientId = process.env.GITLAB_CLIENT_ID;
  const redirectUri = process.env.GITLAB_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response("GitLab OAuth not configured", { status: 500 });
  }

  const state = crypto.randomUUID();
  // TODO: Store state in session/cookie for CSRF protection

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read_user read_api read_repository",
    state,
  });

  redirect(`https://gitlab.com/oauth/authorize?${params}`);
}
```

**File to create:** `apps/web/src/app/api/auth/gitlab/callback/route.ts`

```typescript
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    redirect("/login?error=no_code");
  }

  // Exchange code for token
  const tokenRes = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITLAB_CLIENT_ID,
      client_secret: process.env.GITLAB_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.GITLAB_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    redirect("/login?error=token_exchange_failed");
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;

  // Fetch GitLab user
  const userRes = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    redirect("/login?error=user_fetch_failed");
  }

  const gitlabUser = await userRes.json();

  // Create or update user and platform connection
  // ... (follow pattern from GitHub callback)

  redirect("/repos");
}
```

#### Step 3.3: Create GitLab platform client

**File to create:** `packages/core/src/platforms/gitlab.ts`

```typescript
import { PlatformClient, NormalizedCommit, PlatformRepo } from "./types";

export class GitLabClient implements PlatformClient {
  constructor(private accessToken: string) {}

  private async fetch(path: string, options?: RequestInit) {
    const res = await fetch(`https://gitlab.com/api/v4${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`GitLab API error: ${res.status}`);
    }
    return res.json();
  }

  async listRepos(): Promise<PlatformRepo[]> {
    const projects = await this.fetch("/projects?membership=true&per_page=100");
    return projects.map((p: any) => ({
      id: String(p.id),
      name: p.name,
      fullName: p.path_with_namespace,
      owner: p.namespace.path,
      isPrivate: p.visibility !== "public",
      defaultBranch: p.default_branch,
      platform: "gitlab" as const,
    }));
  }

  async listCommits(
    projectId: string,
    options: { since?: string; until?: string; perPage?: number }
  ): Promise<NormalizedCommit[]> {
    const params = new URLSearchParams();
    if (options.since) params.set("since", options.since);
    if (options.until) params.set("until", options.until);
    params.set("per_page", String(options.perPage ?? 100));

    const commits = await this.fetch(
      `/projects/${encodeURIComponent(projectId)}/repository/commits?${params}`
    );

    return commits.map((c: any) => ({
      sha: c.id,
      message: c.message,
      authoredAt: new Date(c.authored_date),
      committedAt: new Date(c.committed_date),
      authorName: c.author_name,
      authorEmail: c.author_email,
      parents: c.parent_ids ?? [],
      platform: "gitlab" as const,
      platformCommitUrl: c.web_url,
    }));
  }

  async getCommitDetail(projectId: string, sha: string) {
    const commit = await this.fetch(
      `/projects/${encodeURIComponent(projectId)}/repository/commits/${sha}`
    );

    // GitLab includes stats in commit response
    return {
      sha: commit.id,
      message: commit.message,
      authoredAt: new Date(commit.authored_date),
      committedAt: new Date(commit.committed_date),
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      additions: commit.stats?.additions,
      deletions: commit.stats?.deletions,
      filesChanged: commit.stats?.total,
      parents: commit.parent_ids ?? [],
      platform: "gitlab" as const,
      platformCommitUrl: commit.web_url,
    };
  }
}
```

#### Step 3.4: Create GitLab sync-repos API

**File to create:** `apps/web/src/app/api/gitlab/sync-repos/route.ts`

Follow the same pattern as `apps/web/src/app/api/github/sync-repos/route.ts` but use `GitLabClient`.

#### Step 3.5: Update login page UI

**File to modify:** `apps/web/src/app/login/page.tsx`

Add GitLab login button alongside GitHub.

#### Step 3.6: Create settings page for platform management

**File to create:** `apps/web/src/app/settings/platforms/page.tsx`

Display connected platforms with connect/disconnect options.

**Acceptance Criteria - Phase 3:**
- [ ] Can sign up/login via GitLab OAuth
- [ ] GitLab repos appear in repo picker
- [ ] Can analyze a GitLab repo
- [ ] Analysis results show in unified profile
- [ ] Can disconnect GitLab without affecting GitHub login

---

### Phase 4: Add Bitbucket Integration

**Goal:** Full Bitbucket support following the GitLab pattern.

#### Step 4.1: Add Bitbucket OAuth environment variables

**File to update:** `apps/web/.env.example`

```env
# Bitbucket OAuth
BITBUCKET_CLIENT_ID=
BITBUCKET_CLIENT_SECRET=
BITBUCKET_REDIRECT_URI=http://localhost:3000/api/auth/bitbucket/callback
```

#### Step 4.2: Create Bitbucket OAuth routes

**Files to create:**
- `apps/web/src/app/api/auth/bitbucket/route.ts`
- `apps/web/src/app/api/auth/bitbucket/callback/route.ts`

Follow GitLab pattern. Key differences:
- OAuth URL: `https://bitbucket.org/site/oauth2/authorize`
- Token URL: `https://bitbucket.org/site/oauth2/access_token`
- User URL: `https://api.bitbucket.org/2.0/user`

#### Step 4.3: Create Bitbucket platform client

**File to create:** `packages/core/src/platforms/bitbucket.ts`

Key API differences:
- Base URL: `https://api.bitbucket.org/2.0`
- Repos: `GET /repositories/{workspace}`
- Commits: `GET /repositories/{workspace}/{repo_slug}/commits`
- Pagination uses `next` link in response

#### Step 4.4: Create Bitbucket sync-repos API

**File to create:** `apps/web/src/app/api/bitbucket/sync-repos/route.ts`

#### Step 4.5: Update UI for Bitbucket

Add Bitbucket to login page and settings.

**Acceptance Criteria - Phase 4:**
- [ ] Can sign up/login via Bitbucket OAuth
- [ ] Bitbucket repos appear in repo picker
- [ ] Can analyze a Bitbucket repo
- [ ] Analysis results show in unified profile

---

### Phase 5: Polish and Edge Cases

**Goal:** Handle errors, edge cases, and improve UX.

#### Step 5.1: Token refresh handling

Implement refresh token logic for GitLab and Bitbucket (they use refresh tokens, GitHub doesn't).

#### Step 5.2: Rate limiting

Add per-platform rate limit tracking and backoff.

#### Step 5.3: Account linking conflicts

Handle case where user tries to connect a platform already linked to another account.

#### Step 5.4: Disconnect flow

Implement proper disconnect that:
- Marks platform as disconnected (soft delete)
- Prevents disconnect of last/primary platform if it's the only login method
- Optionally removes repos from profile

#### Step 5.5: Platform indicator in UI

Show platform icons (GitHub/GitLab/Bitbucket) next to repos throughout the app.

**Acceptance Criteria - Phase 5:**
- [ ] Token refresh works for GitLab and Bitbucket
- [ ] Rate limits are respected
- [ ] Clear error messages for all failure modes
- [ ] Cannot disconnect only login method
- [ ] Platform icons visible in repo lists

---

## Testing Checklist

Run these tests after each phase:

```bash
# TypeScript compilation
npx tsc --noEmit

# Database migrations
npx supabase db reset

# Dev server starts
cd apps/web && npm run dev

# Manual tests:
# 1. Log in with GitHub (existing flow)
# 2. Sync repos
# 3. Run analysis
# 4. Check profile shows results
```

After Phase 3+:
```bash
# 5. Log out
# 6. Log in with GitLab
# 7. Connect GitHub as additional source
# 8. Sync repos from both
# 9. Run analysis on repo from each platform
# 10. Check unified profile aggregates both
```

---

## Security Considerations

1. **Token Storage**: All platform tokens encrypted with AES-256-GCM (same as current GitHub tokens)

2. **Account Linking**: Prevent malicious linking by requiring active session when connecting additional platforms

3. **Token Scopes**: Request minimum necessary scopes per platform

4. **Rate Limiting**: Respect per-platform rate limits; implement backoff

5. **Data Isolation**: RLS policies ensure users only see their own data regardless of platform

---

## Success Metrics

| Metric | Target |
|--------|--------|
| GitLab sign-ups | 10% of new users within 3 months |
| Bitbucket sign-ups | 5% of new users within 3 months |
| Multi-platform users | 15% of active users connect 2+ platforms |
| Analysis completion rate | Maintain >95% across all platforms |

---

## Open Questions

1. **Self-hosted instances**: Should we support GitLab self-hosted / Bitbucket Server in v1 or defer?
   - *Recommendation*: Defer to v2. Adds complexity (custom URLs, SSL certs, network access).

2. **Account merging**: What if a user creates two accounts (one via GitHub, one via GitLab) and wants to merge?
   - *Recommendation*: Manual process via support for v1. Build self-service merge in v2.

3. **Platform-specific features**: GitLab has merge requests, Bitbucket has pull requests. Normalize or keep separate?
   - *Recommendation*: Normalize to "merge events" internally. Platform-specific labels in UI.

4. **Commit deduplication**: If same commit exists on multiple platforms (mirror), how to handle?
   - *Recommendation*: Dedupe by SHA within same repo. Cross-repo mirrors are rare edge case.

---

## Appendix: Platform API Reference

### GitLab API

- Base URL: `https://gitlab.com/api/v4`
- Auth: `Authorization: Bearer {token}` or `Private-Token: {token}`
- Pagination: `page` and `per_page` params, `X-Total` header
- [Docs](https://docs.gitlab.com/ee/api/)

### Bitbucket API

- Base URL: `https://api.bitbucket.org/2.0`
- Auth: `Authorization: Bearer {token}`
- Pagination: `page` and `pagelen` params, `next` link in response
- [Docs](https://developer.atlassian.com/cloud/bitbucket/rest/intro/)

### Key Endpoint Mappings

| Action | GitHub | GitLab | Bitbucket |
|--------|--------|--------|-----------|
| Current user | `GET /user` | `GET /user` | `GET /user` |
| User repos | `GET /user/repos` | `GET /projects?membership=true` | `GET /repositories/{workspace}` |
| Repo commits | `GET /repos/{o}/{r}/commits` | `GET /projects/{id}/repository/commits` | `GET /repositories/{w}/{r}/commits` |
| Commit detail | `GET /repos/{o}/{r}/commits/{sha}` | `GET /projects/{id}/repository/commits/{sha}` | `GET /repositories/{w}/{r}/commit/{sha}` |

---

## AI Agent Implementation Patterns

### Pattern 1: Reading Existing Code First

Before creating or modifying any file, always read the existing implementation:

```
1. Read the file you're about to modify
2. Read related files to understand patterns
3. Match the existing code style exactly
4. Use the same import patterns, naming conventions, error handling
```

### Pattern 2: Database Migrations

```
1. Check latest migration number: ls supabase/migrations/
2. Use next sequential number: XXXX_descriptive_name.sql
3. Test migration: npx supabase db reset
4. Verify with psql query
5. Regenerate types if needed: npx supabase gen types typescript --local
```

### Pattern 3: OAuth Implementation

Follow this exact order for each new OAuth provider:

```
1. Add env vars to .env.example (document them)
2. Create /api/auth/[provider]/route.ts (initiate flow)
3. Create /api/auth/[provider]/callback/route.ts (handle callback)
4. Test OAuth flow end-to-end before proceeding
5. Add UI button only after backend works
```

### Pattern 4: Platform Client Abstraction

```typescript
// packages/core/src/platforms/types.ts
export interface PlatformClient {
  listRepos(): Promise<PlatformRepo[]>;
  listCommits(repoId: string, options: ListOptions): Promise<NormalizedCommit[]>;
  getCommitDetail(repoId: string, sha: string): Promise<CommitDetail>;
}

// Factory function
export function createPlatformClient(platform: PlatformType, token: string): PlatformClient {
  switch (platform) {
    case "github": return new GitHubClient(token);
    case "gitlab": return new GitLabClient(token);
    case "bitbucket": return new BitbucketClient(token);
  }
}
```

### Pattern 5: Error Handling

Always handle these cases:

```typescript
// Token errors
if (!token) {
  return { error: "Platform not connected", code: "NO_TOKEN" };
}

// API errors
try {
  const data = await client.listRepos();
} catch (e) {
  if (e.status === 401) {
    // Token expired - mark for refresh or re-auth
  }
  if (e.status === 403) {
    // Insufficient scopes
  }
  if (e.status === 429) {
    // Rate limited - implement backoff
  }
}

// Platform not configured
if (!process.env.GITLAB_CLIENT_ID) {
  return { error: "GitLab integration not configured", code: "NOT_CONFIGURED" };
}
```

### Common Pitfalls to Avoid

1. **Don't hardcode platform-specific logic in shared code**
   - Bad: `if (repo.github_id) { ... }`
   - Good: `if (repo.platform === "github") { ... }`

2. **Don't forget to update TypeScript types after migrations**
   ```bash
   npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
   ```

3. **Don't break existing GitHub users**
   - Always test GitHub flow after each change
   - Migration must populate `platforms` table from existing `users` data

4. **Don't store tokens unencrypted**
   - Use existing `encryptToken`/`decryptToken` utilities
   - Never log tokens

5. **Don't forget RLS policies**
   - Every new table needs RLS enabled
   - Test that users can't see other users' data

6. **Don't skip the state parameter in OAuth**
   - Always generate and validate state for CSRF protection

### File Naming Conventions

```
# API routes (Next.js App Router)
apps/web/src/app/api/auth/[provider]/route.ts      # OAuth initiate
apps/web/src/app/api/auth/[provider]/callback/route.ts  # OAuth callback
apps/web/src/app/api/[provider]/sync-repos/route.ts     # Sync repos

# Platform clients
packages/core/src/platforms/types.ts    # Shared interfaces
packages/core/src/platforms/github.ts   # GitHub client
packages/core/src/platforms/gitlab.ts   # GitLab client
packages/core/src/platforms/bitbucket.ts # Bitbucket client
packages/core/src/platforms/index.ts    # Factory + exports

# Migrations
supabase/migrations/0013_create_platforms_table.sql
supabase/migrations/0014_migrate_github_to_platforms.sql
supabase/migrations/0015_add_platform_to_repos.sql
```

### Verification Commands

Run after each significant change:

```bash
# TypeScript
npx tsc --noEmit

# Database
npx supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54422/postgres" -c "SELECT COUNT(*) FROM platforms;"

# Dev server
cd apps/web && npm run dev

# Specific table check
psql "postgresql://postgres:postgres@127.0.0.1:54422/postgres" -c "\d platforms"
```
