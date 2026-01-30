# Implementation Tracker: Profile Aggregation

## Context
This tracker accompanies `docs/PRD-profile-aggregation.md`. It captures the discrete implementation tasks needed to move from per-repo personas to a single aggregated user profile that sharpens as more repos are analyzed.

## Tracker

### P1. Database Schema
**Task:** Create `user_profiles` and `user_profile_history` tables with RLS policies.
**Deliverables:**
- [x] Migration file `0009_add_user_profiles.sql` created
- [x] Migration applied to Supabase
- [x] RLS policies verified (users see only their own profile)
- [x] Indexes created for performance
**Blocks:** P2, P3

### P2. Core Aggregation Logic
**Task:** Add `aggregateUserProfile()` and supporting functions to `@vibe-coding-profiler/core`.
**Deliverables:**
- [x] `RepoInsightSummary` interface defined
- [x] `AggregatedProfile` interface defined
- [x] `aggregateUserProfile(repoInsights[])` implemented
- [x] `computeWeightedAxes()` helper implemented (weighted by commit count)
- [x] `buildProfileCards()` generates profile-level insight cards
- [ ] Unit tests for aggregation logic
- [x] Functions exported from `@vibe-coding-profiler/core`
**Depends on:** P1
**Blocks:** P3, P4

### P3. Worker Integration
**Task:** Update Inngest function to re-aggregate user profile after each job completes.
**Deliverables:**
- [x] New step `update-user-profile` added to `analyze-repo` function
- [x] Fetches all completed jobs for user
- [x] Fetches vibe insights for each job
- [x] Calls `aggregateUserProfile()` with all repo insights
- [x] Upserts result to `user_profiles` table
- [x] Inserts snapshot to `user_profile_history` table
- [x] Handles edge cases (first job, disconnected repos)
**Depends on:** P1, P2
**Blocks:** P4, P5

### P4. Profile Page (`/profile`)
**Task:** Create the user's aggregated profile page.
**Deliverables:**
- [x] Server component fetches from `user_profiles`
- [x] Hero section with aggregated persona + confidence
- [x] 6-axis grid showing aggregated scores
- [x] Repo breakdown table (per-repo mini-personas)
- [x] Cross-repo insight narrative
- [ ] Share profile button (deferred to P7)
- [x] "Add another repo" CTA
- [x] Empty state for users with no completed jobs
**Depends on:** P3

### P5. Dashboard Integration
**Task:** Update homepage dashboard to show aggregated profile summary.
**Deliverables:**
- [x] Fetch `user_profiles` for authenticated users
- [x] Replace per-repo persona with aggregated persona
- [x] Show "Based on X repos · Y commits" context
- [x] Link to `/profile` page
- [x] Graceful fallback when no profile exists yet
**Depends on:** P3

### P6. Individual Report Context
**Task:** Update `/analysis/[jobId]` to show how this repo feeds into the profile.
**Deliverables:**
- [x] "This repo contributes to your profile" banner
- [ ] Comparison: "On this repo vs your overall profile" (optional, deferred)
- [x] Link to `/profile` page
**Depends on:** P4

### P7. Profile History & Delta
**Task:** Show how the profile has evolved over time.
**Deliverables:**
- [ ] Timeline component on `/profile` showing persona changes
- [ ] "Your persona shifted from X to Y after adding repo Z" insight
- [ ] Profile history accessible (collapsible or separate view)
**Depends on:** P4, P3

### P8. Testing & Polish
**Task:** Ensure aggregation is accurate and UI is polished.
**Deliverables:**
- [ ] Integration test: analyze 3 repos, verify profile aggregates correctly
- [ ] Edge case: user disconnects a repo, profile re-aggregates
- [ ] Edge case: single repo user sees appropriate messaging
- [x] Type-check passes across all packages
- [ ] Manual QA of profile flow
**Depends on:** P4, P5, P6

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| P1. Database Schema | ✅ Complete | Migration applied |
| P2. Core Aggregation Logic | ✅ Complete | Unit tests deferred |
| P3. Worker Integration | ✅ Complete | Step runs after each job |
| P4. Profile Page | ✅ Complete | `/profile` live |
| P5. Dashboard Integration | ✅ Complete | Shows aggregated persona |
| P6. Individual Report Context | ✅ Complete | Banner added |
| P7. Profile History & Delta | ⬜ Not Started | Nice-to-have |
| P8. Testing & Polish | 🟡 In Progress | Type-check passes |

## Notes

- Priority order: P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8
- P4 and P5 can be parallelized once P3 is done
- P7 is a nice-to-have, can be deferred
- Core functionality (P1-P6) is complete and working
