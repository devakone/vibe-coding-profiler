# Implementation Tracker: Multi-Platform Integration

## Context
This tracker accompanies `docs/prd/platform/prd-multi-platform-integration.md`. It captures the discrete implementation tasks needed to add GitLab and Bitbucket as additional repository platforms alongside GitHub.

## Tracker

### P1. Platform Client Abstraction
**Task:** Create platform abstraction layer in `@vibed/core` without breaking existing functionality.
**Deliverables:**
- [ ] Platform types created (`packages/core/src/platforms/types.ts`)
- [ ] GitHub client extracted from existing code
- [ ] GitLab client implemented
- [ ] Bitbucket client implemented
- [ ] Factory and exports created (`packages/core/src/platforms/index.ts`)
- [ ] Unit tests for all platform clients
**Success Criteria:** `npm run type-check` and `npm run test` pass; existing analysis works
**Blocks:** P3, P5, P6

### P2. Database Schema Evolution
**Task:** Migrate to multi-platform schema while preserving existing data.
**Deliverables:**
- [ ] Migration: rename `github_accounts` → `platform_connections`
- [ ] Migration: add platform columns (platform, platform_user_id, etc.)
- [ ] Migration: backfill existing GitHub data
- [ ] Migration: add platform to repos table
- [ ] Migration: add platform to analysis_jobs table
- [ ] TypeScript types regenerated (`npm run supabase:gen-types`)
- [ ] Existing queries updated (`githubToken.ts` → `platformToken.ts`)
**Success Criteria:** `npm run supabase:migration:up` succeeds; existing users have platform_connections rows; login still works
**Depends on:** None
**Blocks:** P3, P4, P5

### P3. Unified OAuth Routes
**Task:** Single OAuth implementation supporting all providers.
**Deliverables:**
- [ ] OAuth config created (`apps/web/src/lib/platforms/oauth.ts`)
- [ ] Unified OAuth initiate route (`/api/auth/[provider]/route.ts`)
- [ ] Unified OAuth callback route (`/api/auth/[provider]/callback/route.ts`)
- [ ] GitLab/Bitbucket env vars added to `.env.example`
- [ ] LoginButton component parameterized by provider
- [ ] Login page shows all three providers
**Success Criteria:** Can log in with GitHub, GitLab, and Bitbucket; new users get platform_connections row
**Depends on:** P1, P2
**Blocks:** P4

### P4. Settings UI - Platform Management
**Task:** Users can connect/disconnect platforms and set primary.
**Deliverables:**
- [ ] Platforms API routes (`/api/platforms/`)
- [ ] Connect/disconnect routes (`/api/platforms/[platform]/`)
- [ ] PlatformConnectionsSection component
- [ ] Integrated into RepoSettingsClient
- [ ] Platform icons (GitHub, GitLab, Bitbucket)
**Success Criteria:** Can see/connect/disconnect platforms; can change primary; cannot disconnect last platform
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
| P1. Platform Client Abstraction | ⬜ Not Started | Foundation for multi-platform |
| P2. Database Schema Evolution | ⬜ Not Started | Rename/extend existing tables |
| P3. Unified OAuth Routes | ⬜ Not Started | Single dynamic route |
| P4. Settings UI - Platform Management | ⬜ Not Started | Extend /settings/repos |
| P5. Multi-Platform Repo Sync | ⬜ Not Started | Platform filter in UI |
| P6. Analysis Integration | ⬜ Not Started | Worker multi-platform support |
| P7. Polish & Edge Cases | ⬜ Not Started | Error handling, UX polish |

## Notes

- Priority order: P1 → P2 → P3 → P4 → P5 → P6 → P7
- P1 and P2 can be parallelized as they have no interdependencies
- P3 requires both P1 and P2 to be complete
- Self-hosted instances deferred to v2
- Token refresh automation deferred to v2

---

*Last updated: 2026-01-22*
