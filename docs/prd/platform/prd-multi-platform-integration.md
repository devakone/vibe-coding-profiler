# PRD: Multi-Platform Repository Integration

**Status:** Draft (Revised)
**Author:** Claude
**Date:** 2026-01-22
**Revision:** 2.0 - Simplified architecture aligned with existing patterns

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
- Token refresh automation (re-auth on expiry is acceptable for v1)
- Account merging (manual support process for v1)

---

## Architecture Principles

### 1. Extend, Don't Duplicate

The existing `github_accounts` table already stores OAuth tokens. Instead of creating a new `platforms` table, we rename and extend the existing table.

### 2. Derive, Don't Denormalize

Rather than adding `display_username` columns to `users`, we derive display info from platform connections via views/queries.

### 3. Unify Routes

Single dynamic routes handle all providers instead of separate files per platform.

### 4. Composition Over Inheritance

Minimal interfaces with focused responsibilities instead of large monolithic platform clients.

---

## Risks and Tradeoffs

| Decision | Benefit | Tradeoff |
|---|---|---|
| Reuse `github_accounts` as `platform_connections` | Smaller migration surface, fewer new tables | Requires careful backfill and unique constraints to prevent duplicate external accounts |
| Unified OAuth routes (`/api/auth/[provider]`) | Fewer files and consistent flow | More conditional logic per provider, harder to isolate provider-specific quirks |
| Unified repo sync endpoint | Single sync surface for UI and worker | Needs robust platform dispatching and better error attribution per provider |
| Derive display identity from platform connection | No duplicated profile fields | Requires joins for common UI paths, may add query complexity |
| Minimal platform interfaces | Easier to implement incrementally | Some provider-specific features may not fit without adding new interfaces |
| Bitbucket diffstat for file paths | Preserves metrics parity | Additional API calls per commit and potential rate-limit pressure |

## Data Model Changes

### Migration 1: Rename and Extend `github_accounts`

```sql
-- Rename table
ALTER TABLE github_accounts RENAME TO platform_connections;

-- Add platform discriminator (existing rows are GitHub)
ALTER TABLE platform_connections
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));

-- Add platform-specific user info
ALTER TABLE platform_connections
  ADD COLUMN platform_user_id TEXT,
  ADD COLUMN platform_username TEXT,
  ADD COLUMN platform_email TEXT,
  ADD COLUMN platform_avatar_url TEXT;

-- Add token refresh support (GitLab/Bitbucket use refresh tokens)
ALTER TABLE platform_connections
  ADD COLUMN refresh_token_encrypted TEXT,
  ADD COLUMN token_expires_at TIMESTAMPTZ;

-- Add primary/disconnect tracking
ALTER TABLE platform_connections
  ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN disconnected_at TIMESTAMPTZ;

-- Update unique constraints
ALTER TABLE platform_connections
  DROP CONSTRAINT IF EXISTS github_accounts_user_id_key;

ALTER TABLE platform_connections
  ADD CONSTRAINT platform_connections_user_platform_unique
  UNIQUE (user_id, platform);

ALTER TABLE platform_connections
  ADD CONSTRAINT platform_connections_platform_user_unique
  UNIQUE (platform, platform_user_id);

-- Only one primary platform per user
CREATE UNIQUE INDEX platform_connections_one_primary_idx
  ON platform_connections (user_id)
  WHERE is_primary = true AND disconnected_at IS NULL;

-- RLS policies (update existing)
DROP POLICY IF EXISTS "Users can view own github_accounts" ON platform_connections;
DROP POLICY IF EXISTS "Users can insert own github_accounts" ON platform_connections;
DROP POLICY IF EXISTS "Users can update own github_accounts" ON platform_connections;

CREATE POLICY "Users can view own platforms"
  ON platform_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platforms"
  ON platform_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platforms"
  ON platform_connections FOR UPDATE
  USING (auth.uid() = user_id);
```

### Migration 2: Backfill Existing GitHub Data

```sql
-- Backfill platform user info from users table
UPDATE platform_connections pc
SET
  platform_user_id = u.github_id,
  platform_username = u.github_username,
  platform_email = u.email,
  platform_avatar_url = u.avatar_url,
  is_primary = true
FROM users u
WHERE pc.user_id = u.id
  AND pc.platform = 'github';
```

### Migration 3: Add Platform to Repos

```sql
-- Add platform to repos (default github for existing)
ALTER TABLE repos
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));

-- Rename github_id for clarity
ALTER TABLE repos RENAME COLUMN github_id TO platform_repo_id;

-- Add platform-specific fields
ALTER TABLE repos ADD COLUMN platform_owner TEXT;
ALTER TABLE repos ADD COLUMN platform_project_id TEXT;

-- Index for platform queries
CREATE INDEX repos_platform_idx ON repos(platform);

-- Update unique constraint
ALTER TABLE repos DROP CONSTRAINT IF EXISTS repos_github_id_key;
ALTER TABLE repos ADD CONSTRAINT repos_platform_repo_unique
  UNIQUE (platform, platform_repo_id);
```

### Migration 4: Add Platform to Analysis Jobs

```sql
ALTER TABLE analysis_jobs
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'github'
  CHECK (platform IN ('github', 'gitlab', 'bitbucket'));
```

### Helper View: User Display Info

```sql
-- Convenience view for display info (no migration needed, create in app)
CREATE OR REPLACE VIEW user_display_info AS
SELECT
  u.id as user_id,
  u.email,
  pc.platform as primary_platform,
  COALESCE(pc.platform_username, u.github_username) as display_username,
  COALESCE(pc.platform_avatar_url, u.avatar_url) as display_avatar_url
FROM users u
LEFT JOIN platform_connections pc
  ON pc.user_id = u.id
  AND pc.is_primary = true
  AND pc.disconnected_at IS NULL;
```

---

## Platform Comparison

| Capability | GitHub | GitLab | Bitbucket |
|------------|--------|--------|-----------|
| OAuth 2.0 | Yes | Yes | Yes |
| List user repos | `GET /user/repos` | `GET /projects` | `GET /repositories/{workspace}` |
| Commit list | `GET /repos/{o}/{r}/commits` | `GET /projects/{id}/repository/commits` | `GET /repositories/{w}/{r}/commits` |
| Commit stats | In commit detail | In commit detail | Separate diffstat endpoint |
| Rate limits | 5,000/hr | 2,000/hr | 1,000/hr |
| Token refresh | No (long-lived) | Yes (~2hr) | Yes (~2hr) |

### OAuth Scopes Required

| Platform | Scopes | Purpose |
|----------|--------|---------|
| GitHub | `read:org repo` | Read orgs and repos (existing) |
| GitLab | `read_user read_api` | User profile and API access |
| Bitbucket | `account repository` | User profile and repo access |

---

## Commit Data Mapping

The analysis pipeline requires `CommitEvent` fields. Each platform maps differently:

| Field | GitHub | GitLab | Bitbucket |
|-------|--------|--------|-----------|
| `sha` | `sha` | `id` | `hash` |
| `message` | `commit.message` | `message` | `message` |
| `author_date` | `commit.author.date` | `authored_date` | `date` |
| `committer_date` | `commit.committer.date` | `committed_date` | `date` |
| `author_email` | `commit.author.email` | `author_email` | Parse from `author.raw` |
| `parents` | `parents[].sha` | `parent_ids[]` | `parents[].hash` |
| `additions` | `stats.additions` | `stats.additions` | diffstat sum |
| `deletions` | `stats.deletions` | `stats.deletions` | diffstat sum |
| `files_changed` | `files.length` | diff entry count | diffstat entry count |
| `file_paths` | `files[].filename` | diff `new_path`/`old_path` | diffstat `new.path`/`old.path` |

---

## API Design

### Unified OAuth Routes

```
GET  /api/auth/[provider]           # Initiate OAuth (github|gitlab|bitbucket)
GET  /api/auth/[provider]/callback  # Handle OAuth callback
```

### Platform Management

```
GET  /api/platforms                     # List user's connected platforms
POST /api/platforms/[platform]/connect  # Connect platform (when logged in)
POST /api/platforms/[platform]/disconnect
POST /api/platforms/[platform]/set-primary
```

**Primary identity rules**
- Exactly one connected platform is primary at any time.
- Users can switch primary platforms, but cannot disconnect their last primary connection.

### Unified Repo Sync

```
POST /api/repos/sync    # Body: { platform: "gitlab" }
```

### Existing Endpoints (unchanged)

```
POST /api/repos/connect      # Body includes platform
POST /api/repos/disconnect
POST /api/analysis/start     # Platform inferred from repo
GET  /api/profile            # Unified profile (all platforms)
```

---

## UI Changes

### Login Page

Extend existing `LoginButton` component with provider support:

```tsx
// apps/web/src/app/login/page.tsx
<div className="flex flex-col gap-3 w-full max-w-xs">
  <LoginButton provider="github" />
  <LoginButton provider="gitlab" />
  <LoginButton provider="bitbucket" />
</div>
```

```tsx
// apps/web/src/app/login/LoginButton.tsx
const PROVIDER_CONFIG = {
  github: { name: 'GitHub', icon: GithubIcon },
  gitlab: { name: 'GitLab', icon: GitlabIcon },
  bitbucket: { name: 'Bitbucket', icon: BitbucketIcon },
};

export function LoginButton({ provider }: { provider: PlatformType }) {
  const config = PROVIDER_CONFIG[provider];
  // ... existing logic, parameterized by provider
}
```

### Settings Page - Extend Repos Tab

Add Platform Connections section to existing `/settings/repos` page:

```
┌─────────────────────────────────────────────────────────────┐
│ Settings / Repos                                             │
│                                                              │
│ [LLM Keys]  [Repos]                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Platform Connections                                         │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🐙 GitHub        @devakone              PRIMARY        │ │
│  │    Connected · 12 repos · Synced Jan 22               │ │
│  │                                                        │ │
│  │ 🦊 GitLab        @devakone                            │ │
│  │    Connected · 3 repos · Synced Jan 20                │ │
│  │                          [Make Primary] [Disconnect]   │ │
│  │                                                        │ │
│  │ 🪣 Bitbucket     Not connected          [Connect]      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│ AI Narratives                                                │
│ ─────────────────────────────────────────────────────────── │
│  [Toggle] Enable AI-generated insights                      │
│                                                              │
│ Connected Repos (15)                                         │
│ ─────────────────────────────────────────────────────────── │
│  Last synced: Jan 22, 2026    [↻ Refresh]                   │
│                                                              │
│  🐙 devakone/vibe-coding-profile     Private    [Remove]    │
│  🐙 devakone/other-project           Public     [Remove]    │
│  🦊 devakone/ml-experiments          Private    [Remove]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Repo Picker - Platform Filter

Add platform filter tabs to repo picker:

```
┌─────────────────────────────────────────────────────────────┐
│ Connect a Repo                                               │
│                                                              │
│ [All (15)]  [🐙 GitHub (12)]  [🦊 GitLab (3)]               │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search repos...                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  🐙 devakone/new-project        Private · TypeScript        │
│  🦊 devakone/ml-model           Private · Python            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Platform Client Architecture

### Core Types

```typescript
// packages/core/src/platforms/types.ts

export type PlatformType = 'github' | 'gitlab' | 'bitbucket';

export interface NormalizedCommit {
  sha: string;
  message: string;
  authoredAt: Date;
  committedAt: Date;
  authorName: string;
  authorEmail: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  filePaths?: string[];
  parents: string[];
  platform: PlatformType;
  platformUrl: string;
}

export interface PlatformRepo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  platform: PlatformType;
}

export interface FetchCommitsOptions {
  since?: Date;
  until?: Date;
  branch?: string;
  perPage?: number;
}
```

### Minimal Interfaces

```typescript
// Focused interfaces for specific tasks
export interface CommitFetcher {
  fetchCommits(
    repoId: string,
    options: FetchCommitsOptions
  ): AsyncGenerator<NormalizedCommit>;
}

export interface RepoLister {
  listRepos(): AsyncGenerator<PlatformRepo>;
}

// Factory functions
export function createCommitFetcher(
  platform: PlatformType,
  token: string
): CommitFetcher;

export function createRepoLister(
  platform: PlatformType,
  token: string
): RepoLister;
```

### Example: GitLab Client

```typescript
// packages/core/src/platforms/gitlab.ts

export class GitLabClient implements CommitFetcher, RepoLister {
  private baseUrl = 'https://gitlab.com/api/v4';

  constructor(private token: string) {}

  async *listRepos(): AsyncGenerator<PlatformRepo> {
    let page = 1;
    while (true) {
      const res = await this.fetch(
        `/projects?membership=true&per_page=100&page=${page}`
      );
      const projects = await res.json();

      if (projects.length === 0) break;

      for (const p of projects) {
        yield {
          id: String(p.id),
          name: p.name,
          fullName: p.path_with_namespace,
          owner: p.namespace.path,
          isPrivate: p.visibility !== 'public',
          defaultBranch: p.default_branch,
          platform: 'gitlab',
        };
      }

      const nextPage = res.headers.get('x-next-page');
      if (!nextPage) break;
      page = parseInt(nextPage);
    }
  }

  async *fetchCommits(
    projectId: string,
    options: FetchCommitsOptions
  ): AsyncGenerator<NormalizedCommit> {
    const params = new URLSearchParams({ per_page: '100' });
    if (options.since) params.set('since', options.since.toISOString());
    if (options.until) params.set('until', options.until.toISOString());

    let page = 1;
    while (true) {
      params.set('page', String(page));
      const res = await this.fetch(
        `/projects/${encodeURIComponent(projectId)}/repository/commits?${params}`
      );
      const commits = await res.json();

      if (commits.length === 0) break;

      for (const c of commits) {
        yield {
          sha: c.id,
          message: c.message,
          authoredAt: new Date(c.authored_date),
          committedAt: new Date(c.committed_date),
          authorName: c.author_name,
          authorEmail: c.author_email || '',
          parents: c.parent_ids || [],
          platform: 'gitlab',
          platformUrl: c.web_url,
        };
      }

      const nextPage = res.headers.get('x-next-page');
      if (!nextPage) break;
      page = parseInt(nextPage);
    }
  }

  private fetch(path: string, init?: RequestInit) {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...init?.headers,
      },
    });
  }
}
```

---

## Implementation Phases

### Phase 1: Platform Client Abstraction (No DB Changes)

**Goal:** Create platform abstraction layer without breaking existing functionality.

| Step | Task | Files |
|------|------|-------|
| 1.1 | Create platform types | `packages/core/src/platforms/types.ts` |
| 1.2 | Extract GitHub client from existing code | `packages/core/src/platforms/github.ts` |
| 1.3 | Create GitLab client | `packages/core/src/platforms/gitlab.ts` |
| 1.4 | Create Bitbucket client | `packages/core/src/platforms/bitbucket.ts` |
| 1.5 | Create factory and exports | `packages/core/src/platforms/index.ts` |
| 1.6 | Add unit tests | `packages/core/src/platforms/__tests__/` |

**Verification:**
- `npm run type-check` passes
- `npm run test` passes in packages/core
- Existing analysis still works (uses GitHub directly for now)

---

### Phase 2: Database Schema Evolution

**Goal:** Migrate to multi-platform schema while preserving existing data.

| Step | Task | Files |
|------|------|-------|
| 2.1 | Create migration: rename github_accounts | `supabase/migrations/XXXX_rename_to_platform_connections.sql` |
| 2.2 | Create migration: add platform columns | `supabase/migrations/XXXX_add_platform_columns.sql` |
| 2.3 | Create migration: backfill GitHub data | `supabase/migrations/XXXX_backfill_github_platforms.sql` |
| 2.4 | Create migration: add platform to repos | `supabase/migrations/XXXX_add_platform_to_repos.sql` |
| 2.5 | Create migration: add platform to jobs | `supabase/migrations/XXXX_add_platform_to_jobs.sql` |
| 2.6 | Regenerate TypeScript types | `npm run supabase:gen-types` |
| 2.7 | Update existing queries | `apps/web/src/lib/githubToken.ts` → `platformToken.ts` |

**Verification:**
- `npm run supabase:migration:up` succeeds
- Existing GitHub users have rows in platform_connections
- `is_primary = true` for all existing users
- Existing login/sync still works

---

### Phase 3: Unified OAuth Routes

**Goal:** Single OAuth implementation supporting all providers.

| Step | Task | Files |
|------|------|-------|
| 3.1 | Create OAuth config | `apps/web/src/lib/platforms/oauth.ts` |
| 3.2 | Create unified OAuth initiate route | `apps/web/src/app/api/auth/[provider]/route.ts` |
| 3.3 | Create unified OAuth callback route | `apps/web/src/app/api/auth/[provider]/callback/route.ts` |
| 3.4 | Add GitLab/Bitbucket env vars | `apps/web/.env.example` |
| 3.5 | Update LoginButton component | `apps/web/src/app/login/LoginButton.tsx` |
| 3.6 | Update login page | `apps/web/src/app/login/page.tsx` |

**Verification:**
- Can log in with GitHub (existing flow)
- Can log in with GitLab (new)
- Can log in with Bitbucket (new)
- New users get platform_connections row with is_primary=true

---

### Phase 4: Settings UI - Platform Management

**Goal:** Users can connect/disconnect platforms and set primary.

| Step | Task | Files |
|------|------|-------|
| 4.1 | Create platforms API routes | `apps/web/src/app/api/platforms/route.ts` |
| 4.2 | Create connect/disconnect routes | `apps/web/src/app/api/platforms/[platform]/` |
| 4.3 | Create PlatformConnectionsSection component | `apps/web/src/components/settings/PlatformConnectionsSection.tsx` |
| 4.4 | Integrate into RepoSettingsClient | `apps/web/src/app/settings/repos/RepoSettingsClient.tsx` |
| 4.5 | Add platform icons | `apps/web/src/components/icons/` |

**Verification:**
- Can see connected platforms in settings
- Can connect additional platforms
- Can disconnect non-primary platforms
- Can change primary platform
- Cannot disconnect last/only platform

---

### Phase 5: Multi-Platform Repo Sync

**Goal:** Users can sync and select repos from all connected platforms.

| Step | Task | Files |
|------|------|-------|
| 5.1 | Create unified sync endpoint | `apps/web/src/app/api/repos/sync/route.ts` |
| 5.2 | Update repos table queries | `apps/web/src/app/api/repos/` |
| 5.3 | Add platform filter to repo picker | `apps/web/src/app/settings/repos/RepoSettingsClient.tsx` |
| 5.4 | Add platform icons to repo lists | Various components |
| 5.5 | Update Vibes page with platform info | `apps/web/src/app/vibes/VibesClient.tsx` |

**Verification:**
- Can sync repos from each platform
- Repos show correct platform icon
- Can filter repos by platform
- Can connect repos from any platform

---

### Phase 6: Analysis Integration

**Goal:** Worker can analyze repos from any platform.

| Step | Task | Files |
|------|------|-------|
| 6.1 | Update worker to use platform clients | `apps/worker/src/` |
| 6.2 | Update Inngest function | `apps/web/src/inngest/functions/analyze-repo.ts` |
| 6.3 | Test analysis for each platform | Manual testing |
| 6.4 | Verify unified profile aggregation | Manual testing |

**Verification:**
- Can analyze GitHub repos (existing)
- Can analyze GitLab repos
- Can analyze Bitbucket repos
- Unified profile aggregates all platforms
- Platform shown in repo VCP header

---

### Phase 7: Polish & Edge Cases

**Goal:** Handle errors gracefully and improve UX.

| Step | Task | Files |
|------|------|-------|
| 7.1 | Add rate limit handling with backoff | `packages/core/src/platforms/` |
| 7.2 | Handle token expiry (re-auth prompt) | `apps/web/src/lib/platforms/` |
| 7.3 | Handle account linking conflicts | OAuth callback |
| 7.4 | Add loading states and error messages | UI components |
| 7.5 | Cross-browser testing | Manual |
| 7.6 | Mobile responsiveness | Manual |

**Verification:**
- Rate limits handled gracefully
- Expired tokens prompt re-auth
- Clear error messages for all failure modes
- Works on Chrome, Firefox, Safari
- Mobile-friendly

---

## File Structure

```
apps/web/src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [provider]/
│   │   │       ├── route.ts              # OAuth initiate
│   │   │       └── callback/route.ts     # OAuth callback
│   │   ├── platforms/
│   │   │   ├── route.ts                  # List platforms
│   │   │   └── [platform]/
│   │   │       ├── connect/route.ts
│   │   │       ├── disconnect/route.ts
│   │   │       └── set-primary/route.ts
│   │   └── repos/
│   │       ├── sync/route.ts             # Unified sync
│   │       ├── connect/route.ts          # Existing
│   │       └── disconnect/route.ts       # Existing
│   ├── login/
│   │   ├── page.tsx                      # Multi-provider buttons
│   │   └── LoginButton.tsx               # Parameterized by provider
│   └── settings/
│       └── repos/
│           └── RepoSettingsClient.tsx    # + PlatformConnections section
│
├── components/
│   ├── icons/
│   │   ├── GithubIcon.tsx
│   │   ├── GitlabIcon.tsx
│   │   └── BitbucketIcon.tsx
│   └── settings/
│       └── PlatformConnectionsSection.tsx
│
└── lib/
    └── platforms/
        ├── oauth.ts                      # OAuth configs
        ├── token.ts                      # Token management
        └── types.ts                      # Shared types

packages/core/src/
└── platforms/
    ├── types.ts                          # Interfaces
    ├── github.ts                         # GitHub client
    ├── gitlab.ts                         # GitLab client
    ├── bitbucket.ts                      # Bitbucket client
    ├── index.ts                          # Factory exports
    └── __tests__/
        ├── github.test.ts
        ├── gitlab.test.ts
        └── bitbucket.test.ts

supabase/migrations/
├── XXXX_rename_to_platform_connections.sql
├── XXXX_add_platform_columns.sql
├── XXXX_backfill_github_platforms.sql
├── XXXX_add_platform_to_repos.sql
└── XXXX_add_platform_to_jobs.sql
```

---

## Security Considerations

1. **Token Storage**: All platform tokens encrypted with AES-256-GCM (existing pattern)
2. **OAuth State**: CSRF protection via state parameter stored in cookie
3. **Token Scopes**: Request minimum necessary scopes per platform
4. **Account Linking**: Require active session when connecting additional platforms
5. **RLS Policies**: Users can only see their own platform connections
6. **Rate Limiting**: Respect per-platform limits; exponential backoff on 429

---

## Testing Checklist

### After Each Phase

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

### Manual Testing - Phase 3+

1. Log out completely
2. Log in with GitHub → verify works
3. Log out, log in with GitLab → verify creates new account
4. Connect GitHub to GitLab account → verify links
5. Log out, log in with GitHub → verify logs into same account
6. Repeat for Bitbucket

### Manual Testing - Phase 5+

1. Sync repos from GitHub
2. Sync repos from GitLab
3. Verify platform icons appear
4. Filter by platform
5. Connect repo from each platform

### Manual Testing - Phase 6+

1. Run analysis on GitHub repo
2. Run analysis on GitLab repo
3. Run analysis on Bitbucket repo
4. Verify unified profile aggregates all
5. Verify repo VCPs show correct platform

---

## Success Metrics

| Metric | Target |
|--------|--------|
| GitLab sign-ups | 10% of new users within 3 months |
| Bitbucket sign-ups | 5% of new users within 3 months |
| Multi-platform users | 15% connect 2+ platforms |
| Analysis completion rate | Maintain >95% across all platforms |

---

## Open Questions (Deferred to v2)

1. **Self-hosted instances**: GitLab self-hosted / Bitbucket Server
2. **Account merging**: Self-service merge of duplicate accounts
3. **Token refresh**: Automatic background refresh for GitLab/Bitbucket
4. **Platform-specific features**: MR/PR analysis beyond commits

---

## Appendix: OAuth Configuration Reference

```typescript
// apps/web/src/lib/platforms/oauth.ts

export const OAUTH_CONFIGS: Record<PlatformType, OAuthConfig> = {
  github: {
    name: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scopes: ['read:org', 'repo'],
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  },
  gitlab: {
    name: 'GitLab',
    authorizeUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    userUrl: 'https://gitlab.com/api/v4/user',
    scopes: ['read_user', 'read_api'],
    clientIdEnv: 'GITLAB_CLIENT_ID',
    clientSecretEnv: 'GITLAB_CLIENT_SECRET',
  },
  bitbucket: {
    name: 'Bitbucket',
    authorizeUrl: 'https://bitbucket.org/site/oauth2/authorize',
    tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
    userUrl: 'https://api.bitbucket.org/2.0/user',
    scopes: ['account', 'repository'],
    clientIdEnv: 'BITBUCKET_CLIENT_ID',
    clientSecretEnv: 'BITBUCKET_CLIENT_SECRET',
    // Bitbucket uses Basic auth for token exchange
    tokenAuthMethod: 'basic',
  },
};
```

---

## Appendix: API Endpoint Reference

| Platform | User | Repos | Commits | Commit Detail |
|----------|------|-------|---------|---------------|
| GitHub | `GET /user` | `GET /user/repos` | `GET /repos/{o}/{r}/commits` | `GET /repos/{o}/{r}/commits/{sha}` |
| GitLab | `GET /user` | `GET /projects?membership=true` | `GET /projects/{id}/repository/commits` | `GET /projects/{id}/repository/commits/{sha}` |
| Bitbucket | `GET /user` | `GET /repositories/{workspace}` | `GET /repositories/{w}/{r}/commits` | `GET /repositories/{w}/{r}/commit/{sha}` + diffstat |
