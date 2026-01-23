# Implementation Tracker: Multi-Platform Integration

## Context
This tracker accompanies `docs/prd/platform/prd-multi-platform-integration.md`. It captures the discrete implementation tasks needed to add GitLab and Bitbucket as additional repository platforms alongside GitHub.

## Tracker

### P1. Platform Client Abstraction
**Task:** Create platform abstraction layer in `@vibed/core` without breaking existing functionality.
**Deliverables:**
- [ ] Platform types created (`packages/core/src/platforms/types.ts`)
- [ ] GitHub client extracted from existing code
- [ ] GitLab client implemented (including file_paths via diff endpoint)
- [ ] Bitbucket client implemented (including file_paths via diffstat endpoint)
- [ ] Factory and exports created (`packages/core/src/platforms/index.ts`)
- [ ] Unit tests for all platform clients
**Success Criteria:** `npm run type-check` and `npm run test` pass; existing analysis works; all clients return `filePaths` in `NormalizedCommit`
**Blocks:** P3, P5, P6

### P2. Database Schema Evolution
**Task:** Migrate to multi-platform schema while preserving existing data.
**Deliverables:**
- [x] Migration: rename `github_accounts` → `platform_connections`
- [x] Migration: add platform columns (platform, platform_user_id, platform_username, platform_email, platform_avatar_url)
- [x] Migration: add token refresh columns (refresh_token_encrypted, token_expires_at)
- [x] Migration: add tracking columns (is_primary, disconnected_at)
- [x] Migration: add unique constraint `(user_id, platform)` - one connection per platform per user
- [x] Migration: add unique constraint `(platform, platform_user_id)` - prevent same external account linking to multiple users
- [x] Migration: add unique index for one primary per user
- [x] Migration: backfill existing GitHub data (including platform_email from users.email)
- [x] Migration: add platform to repos table
- [x] Migration: add platform to analysis_jobs table
- [x] TypeScript types regenerated (`npm run supabase:gen-types`)
- [x] Existing queries updated (`githubToken.ts` → `platformToken.ts`)
**Success Criteria:** `npm run supabase:migration:up` succeeds; existing users have platform_connections rows with is_primary=true; login still works; duplicate external accounts rejected
**Depends on:** None
**Blocks:** P3, P4, P5

### P3. Unified OAuth Routes
**Task:** Single OAuth implementation supporting all providers.
**Deliverables:**
- [x] OAuth config created (`apps/web/src/lib/platforms/oauth.ts`)
- [x] Unified OAuth initiate route (`/api/auth/[provider]/route.ts`)
- [x] Unified OAuth callback route (`/api/auth/[provider]/callback/route.ts`)
- [x] GitLab/Bitbucket env vars added to `.env.example`
- [x] LoginButton component parameterized by provider
- [x] Login page shows all three providers
**Success Criteria:** Can log in with GitHub, GitLab, and Bitbucket; new users get platform_connections row
**Depends on:** P1, P2
**Blocks:** P4

### P4. Settings UI - Platform Management
**Task:** Users can connect/disconnect platforms and set primary.
**Deliverables:**
- [x] Platforms API routes (`/api/platforms/`)
- [x] Connect/disconnect routes (`/api/platforms/[platform]/`)
- [x] Set-primary route with validation (exactly one primary at all times)
- [x] PlatformConnectionsSection component
- [x] Integrated into RepoSettingsClient
- [x] Platform icons (GitHub, GitLab, Bitbucket)
- [x] Primary identity enforcement: prevent disconnecting last/primary platform
**Success Criteria:** Can see/connect/disconnect platforms; can change primary; cannot disconnect last platform; exactly one platform is primary at all times
**Depends on:** P2, P3
**Blocks:** P5

### P5. Multi-Platform Repo Sync
**Task:** Users can sync and select repos from all connected platforms.
**Deliverables:**
- [ ] Unified sync endpoint (`/api/repos/sync/route.ts`)
- [ ] Repos table queries updated for platform
- [ ] Platform filter tabs in repo picker
- [ ] Platform icons in repo lists
- [ ] Vibes page updated with platform info
**Success Criteria:** Can sync repos from each platform; repos show correct icon; can filter by platform
**Depends on:** P1, P2, P4

### P6. Analysis Integration
**Task:** Worker can analyze repos from any platform.
**Deliverables:**
- [ ] Worker updated to use platform clients
- [ ] Inngest function updated for multi-platform
- [ ] Analysis tested for each platform
- [ ] Unified profile aggregation verified
**Success Criteria:** Can analyze repos from GitHub, GitLab, Bitbucket; unified profile includes all platforms
**Depends on:** P1, P2, P5
**Blocks:** P7

### P7. Polish & Edge Cases
**Task:** Handle errors gracefully and improve UX.
**Deliverables:**
- [ ] Rate limit handling with exponential backoff
- [ ] Token expiry handling (re-auth prompt)
- [ ] Account linking conflict handling
- [ ] Loading states and error messages
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified
**Success Criteria:** Rate limits handled gracefully; clear error messages; works across browsers
**Depends on:** P3, P4, P5, P6

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| P1. Platform Client Abstraction | 🟡 In Progress | GitHub client complete; GitLab/Bitbucket stubs |
| P2. Database Schema Evolution | ✅ Complete | Migrations applied; types generated |
| P3. Unified OAuth Routes | ✅ Complete | Unified auth flow working |
| P4. Settings UI - Platform Management | ✅ Complete | UI integrated into RepoSettingsClient |
| P5. Multi-Platform Repo Sync | ⬜ Not Started | Platform filter in UI |
| P6. Analysis Integration | ⬜ Not Started | Worker multi-platform support |
| P7. Polish & Edge Cases | ⬜ Not Started | Error handling, UX polish |

## Notes

- Priority order: P1 → P2 → P3 → P4 → P5 → P6 → P7
- P1 and P2 can be parallelized as they have no interdependencies
- P3 requires both P1 and P2 to be complete
- Self-hosted instances deferred to v2
- Token refresh automation deferred to v2
- See PRD "Risks and Tradeoffs" section for architecture decision rationale

---

*Last updated: 2026-01-22*
