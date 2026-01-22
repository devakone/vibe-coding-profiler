# Implementation Tracker: Information Architecture Restructure

**PRD Reference:** `docs/prd/ux/information-architecture-restructure.md`  
**Status:** In Progress  
**Last Updated:** 2026-01-22

---

## Overview

This tracker covers all implementation work for the Information Architecture Restructure, including:
- Navigation and route changes
- VCP component unification
- ShareCard redesign (metrics, tagline, vertical format)
- Notification system

---

## Phase Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FOUNDATIONAL (Sequential)                          │
│                                                                              │
│  F1: VCP Primitives ──► F2: VCP Composite Blocks ──► F3: Shared Utilities   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PARALLEL WORKSTREAMS                              │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  P1: ShareCard  │  │ P2: Navigation  │  │ P3: VCP Display Unification │  │
│  │   Redesign      │  │   & Routes      │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                                   │
│  │ P4: Notification│  │ P5: Vertical    │                                   │
│  │    System       │  │   Stories Card  │                                   │
│  └─────────────────┘  └─────────────────┘                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FINALIZATION                                    │
│                                                                              │
│  X1: Migration & Redirects ──► X2: Polish & Testing ──► X3: Documentation   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Foundational Phases (Sequential)

### F1. VCP Primitives

**Status:** `[x] Complete`  
**Depends on:** None  
**Blocks:** F2, P1, P3

| Task | Status | File(s) |
|------|--------|---------|
| Create `components/vcp/primitives/` directory | `[x]` | — |
| Implement `VCPCard` | `[x]` | `primitives/VCPCard.tsx` |
| Implement `VCPSection` | `[x]` | `primitives/VCPSection.tsx` |
| Implement `VCPSectionTitle` | `[x]` | `primitives/VCPSectionTitle.tsx` |
| Implement `VCPStatCard` | `[x]` | `primitives/VCPStatCard.tsx` |
| Implement `VCPProgressBar` | `[x]` | `primitives/VCPProgressBar.tsx` |
| Implement `VCPBadge` | `[x]` | `primitives/VCPBadge.tsx` |
| Implement `VCPCollapsible` | `[x]` | `primitives/VCPCollapsible.tsx` |
| Implement `VCPInsightBox` | `[x]` | `primitives/VCPInsightBox.tsx` |
| Create shared types | `[x]` | `vcp/types.ts` |
| Create constants (AXIS_METADATA, etc.) | `[x]` | `vcp/constants.ts` |
| Create barrel export | `[x]` | `primitives/index.ts` |

**Success Criteria:**
- [x] All primitives render correctly in isolation
- [x] Types are properly exported
- [x] Consistent styling matches PRD specifications

---

### F2. VCP Composite Blocks

**Status:** `[x] Complete`  
**Depends on:** F1  
**Blocks:** P1, P3

| Task | Status | File(s) |
|------|--------|---------|
| Create `components/vcp/blocks/` directory | `[x]` | — |
| Implement `VCPIdentityHeader` | `[x]` | `blocks/VCPIdentityHeader.tsx` |
| Implement `VCPAxesGrid` | `[x]` | `blocks/VCPAxesGrid.tsx` |
| Implement `VCPStatsGrid` | `[x]` | `blocks/VCPStatsGrid.tsx` |
| Implement `VCPNarrativeSection` | `[x]` | `blocks/VCPNarrativeSection.tsx` |
| Implement `VCPMatchedSignals` | `[x]` | `blocks/VCPMatchedSignals.tsx` |
| Implement `VCPMethodologyLink` | `[x]` | `blocks/VCPMethodologyLink.tsx` |
| Implement `VCPVersionHistory` | `[x]` | `blocks/VCPVersionHistory.tsx` |
| Implement `VCPFooter` | `[x]` | `blocks/VCPFooter.tsx` |
| Create barrel export | `[x]` | `blocks/index.ts` |

**Success Criteria:**
- [x] Blocks compose primitives correctly
- [x] `VCPVersionHistory` works for both Unified and Repo variants
- [x] All blocks accept proper TypeScript interfaces

---

### F3. Shared Utilities

**Status:** `[x] Complete`  
**Depends on:** None (can run parallel with F1/F2)  
**Blocks:** P1, P5

| Task | Status | File(s) |
|------|--------|---------|
| Implement `computeStrongestAxis()` | `[x]` | `lib/vcp/metrics.ts` |
| Implement `computeStyleDescriptor()` | `[x]` | `lib/vcp/metrics.ts` |
| Implement `computeRhythmLabel()` | `[x]` | `lib/vcp/metrics.ts` |
| Implement `computePeakLabel()` | `[x]` | `lib/vcp/metrics.ts` |
| Add unit tests for metric functions | `[ ]` | `__tests__/metrics.test.ts` |

**Success Criteria:**
- [x] All metric computation functions work correctly
- [x] Edge cases handled (missing data, null values)
- [ ] Tests pass (tests not yet written)

---

## Parallel Workstreams

### P1. ShareCard Redesign

**Status:** `[x] Complete`  
**Depends on:** F1, F2, F3  
**Blocks:** P5

| Task | Status | File(s) |
|------|--------|---------|
| Update `ShareCardMetric` interface | `[x]` | `components/share/types.ts` |
| Add `tagline` prop to `ShareCardProps` | `[x]` | `components/share/types.ts` |
| Refactor `ShareCard` with new metrics layout | `[x]` | `components/share/ShareCard.tsx` |
| Add tagline row to `ShareCard` | `[x]` | `components/share/ShareCard.tsx` |
| Update footer layout (NEXT_PUBLIC_APP_URL + context) | `[x]` | `ProfileShareSection.tsx`, `AnalysisClient.tsx` |
| Update `ProfileShareSection` metric computation | `[x]` | `components/share/ProfileShareSection.tsx` |
| Update Repo VCP share section metric computation | `[x]` | `app/analysis/[jobId]/AnalysisClient.tsx` |

**Success Criteria:**
- ShareCard displays: Strongest, Style, Rhythm, Peak
- Tagline row renders when provided
- Footer shows hostname from `NEXT_PUBLIC_APP_URL` + repos/commits context

---

### P2. Navigation & Routes

**Status:** `[x] Complete`
**Depends on:** None
**Blocks:** X1

| Task | Status | File(s) |
|------|--------|---------|
| Rename "Reports" to "Vibes" in nav | `[x]` | `app/AppHeader.tsx` |
| Create `/vibes` route | `[x]` | `app/vibes/page.tsx`, `app/vibes/VibesClient.tsx` |
| Create `/vibes/[repoId]` route | `[-]` | Deferred - using expandable table instead |
| Create `/vibes/[repoId]/[jobId]` route | `[-]` | Deferred - linking to existing `/analysis/[jobId]` |
| Create `/settings/repos` route | `[x]` | `app/settings/repos/page.tsx`, `app/settings/repos/RepoSettingsClient.tsx` |
| Move repo connect/disconnect to Settings | `[x]` | `app/settings/repos/RepoSettingsClient.tsx` |
| Implement `VibesTable` component | `[x]` | `app/vibes/VibesClient.tsx` (expandable table) |
| Update navigation labels | `[x]` | `app/AppHeader.tsx` |

**Success Criteria:**
- [x] New routes are functional
- [x] Navigation reflects new terminology (My Vibe, Vibes, Settings)
- [x] Repo management is in Settings

---

### P3. VCP Display Unification

**Status:** `[ ] Not Started`  
**Depends on:** F1, F2  
**Blocks:** X2

| Task | Status | File(s) |
|------|--------|---------|
| Create `components/vcp/unified/` directory | `[ ]` | — |
| Implement `UnifiedVCPCard` | `[ ]` | `unified/UnifiedVCPCard.tsx` |
| Implement `EvolutionSection` | `[ ]` | `unified/EvolutionSection.tsx` |
| Implement `RepoBreakdownSection` | `[ ]` | `unified/RepoBreakdownSection.tsx` |
| Refactor `app/page.tsx` to use new components | `[ ]` | `app/page.tsx` |
| Create `components/vcp/repo/` directory | `[ ]` | — |
| Implement `RepoVCPCard` | `[ ]` | `repo/RepoVCPCard.tsx` |
| Implement `RepoMetricsSection` | `[ ]` | `repo/RepoMetricsSection.tsx` |
| Implement `WorkflowStyleSection` | `[ ]` | `repo/WorkflowStyleSection.tsx` |
| Implement `ProfileContribution` | `[ ]` | `repo/ProfileContribution.tsx` |
| Refactor `AnalysisClient.tsx` to use new components | `[ ]` | `app/analysis/[jobId]/AnalysisClient.tsx` |

**Success Criteria:**
- Both VCPs use shared primitives and blocks
- Visual parity with current designs
- Reduced code duplication

---

### P4. Notification System

**Status:** `[x] Complete`  
**Depends on:** None  
**Blocks:** X2

| Task | Status | File(s) |
|------|--------|---------|
| Create `NotificationDropdown` component | `[x]` | `components/notifications/NotificationDropdown.tsx` |
| Create notification badge component | `[x]` | `components/notifications/NotificationBadge.tsx` |
| Integrate with `JobsContext` | `[x]` | `components/notifications/NotificationDropdown.tsx` |
| Add to navigation header | `[x]` | `app/AppHeader.tsx` |
| Implement "Clear all" functionality | `[x]` | `components/notifications/NotificationDropdown.tsx` |
| Remove Jobs tab from Reports page | `[~]` | N/A (Jobs tab doesn't exist as separate component) |

**Success Criteria:**
- [x] Notifications show in-progress and completed jobs
- [x] Badge shows unread count
- [x] Clicking notification navigates to VCP

---

### P5. Vertical Stories ShareCard

**Status:** `[ ] Not Started`  
**Depends on:** P1, F3  
**Blocks:** X2

| Task | Status | File(s) |
|------|--------|---------|
| Create API route for story image generation | `[ ]` | `app/api/share/story/[userId]/route.tsx` |
| Implement vertical layout with `@vercel/og` | `[ ]` | `app/api/share/story/[userId]/route.tsx` |
| Add persona gradient themes | `[ ]` | `lib/share/story-themes.ts` |
| Integrate QR code generation | `[ ]` | `lib/share/qr.ts` |
| Add "Download for Stories" button to UI | `[ ]` | `components/share/ProfileShareSection.tsx` |
| Add "Download for Stories" to Repo VCP | `[ ]` | `app/analysis/[jobId]/AnalysisClient.tsx` |
| Test on various devices/platforms | `[ ]` | — |

**Success Criteria:**
- Generates 1080x1920 PNG image
- QR code links to public profile
- Download works on desktop and mobile
- Renders correctly when shared to Instagram/TikTok

---

### P6. LLM Tagline Generation

**Status:** `[ ] Not Started`  
**Depends on:** None  
**Blocks:** P1

| Task | Status | File(s) |
|------|--------|---------|
| Add tagline prompt to LLM integration | `[ ]` | `packages/core/src/llm/...` |
| Add `tagline` field to analysis result schema | `[ ]` | `packages/db/src/schema.ts` |
| Create migration for tagline column | `[ ]` | `supabase/migrations/...` |
| Generate tagline during VCP analysis | `[ ]` | `lib/analysis/...` |
| Fallback to persona tagline if missing | `[ ]` | `components/share/...` |

**Success Criteria:**
- Tagline generated during analysis
- Max 60 characters
- Matches persona energy
- Stored and retrieved correctly

---

## Finalization Phases (Sequential)

### X1. Migration & Redirects

**Status:** `[ ] Not Started`  
**Depends on:** P2  
**Blocks:** X2

| Task | Status | File(s) |
|------|--------|---------|
| Add redirect: `/reports` → `/vibes` | `[ ]` | `next.config.js` or middleware |
| Add redirect: `/reports/[id]` → `/vibes/.../[id]` | `[ ]` | `next.config.js` or middleware |
| Add redirect: `/repos` → `/settings/repos` | `[ ]` | `next.config.js` or middleware |
| Update all internal links | `[ ]` | Various |
| Update email templates (if any) | `[ ]` | — |

**Success Criteria:**
- Old URLs redirect correctly
- No broken links in the app
- External links (emails, docs) still work

---

### X2. Polish & Testing

**Status:** `[ ] Not Started`  
**Depends on:** P1, P3, P4, P5, X1  
**Blocks:** X3

| Task | Status | File(s) |
|------|--------|---------|
| Visual parity testing (Unified VCP) | `[ ]` | — |
| Visual parity testing (Repo VCP) | `[ ]` | — |
| Remove duplicated/dead code | `[ ]` | Various |
| Update component exports | `[ ]` | `index.ts` files |
| Cross-browser testing | `[ ]` | — |
| Mobile responsiveness testing | `[ ]` | — |
| Accessibility audit | `[ ]` | — |

**Success Criteria:**
- No visual regressions
- All dead code removed
- Works on Chrome, Firefox, Safari
- Mobile-friendly

---

### X3. Documentation

**Status:** `[ ] Not Started`  
**Depends on:** X2  
**Blocks:** None

| Task | Status | File(s) |
|------|--------|---------|
| Update component documentation | `[ ]` | `docs/...` |
| Update route documentation | `[ ]` | `docs/...` |
| Update AGENTS.md if needed | `[ ]` | `AGENTS.md` |
| Archive old PRD sections (if applicable) | `[ ]` | — |
| Mark this tracker as complete | `[ ]` | This file |

**Success Criteria:**
- Documentation reflects new architecture
- Agents.md updated with any new conventions

---

## Summary

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| F1: VCP Primitives | 12 | 12 | `[x] Complete` |
| F2: VCP Composite Blocks | 10 | 10 | `[x] Complete` |
| F3: Shared Utilities | 5 | 4 | `[~] In Progress` |
| P1: ShareCard Redesign | 7 | 7 | `[x] Complete` |
| P2: Navigation & Routes | 8 | 8 | `[x] Complete` |
| P3: VCP Display Unification | 11 | 0 | `[ ] Not Started` |
| P4: Notification System | 6 | 6 | `[x] Complete` |
| P5: Vertical Stories ShareCard | 7 | 0 | `[ ] Not Started` |
| P6: LLM Tagline Generation | 5 | 0 | `[ ] Not Started` |
| X1: Migration & Redirects | 5 | 0 | `[ ] Not Started` |
| X2: Polish & Testing | 7 | 0 | `[ ] Not Started` |
| X3: Documentation | 5 | 0 | `[ ] Not Started` |
| **Total** | **88** | **47** | **53%** |

---

## Notes

- F1/F2/F3 are foundational and must complete before parallel workstreams
- P1-P6 can run in parallel once dependencies are met
- P6 (LLM Tagline) is a backend task that can start early
- X1/X2/X3 are finalization steps after parallel work completes

---

## Changelog

### 2026-01-22
- **F1 Complete:** Implemented all VCP primitives (VCPCard, VCPSection, VCPStatCard, VCPProgressBar, VCPBadge, VCPCollapsible, VCPInsightBox)
- **F2 Complete:** Implemented all composite blocks (VCPIdentityHeader, VCPAxesGrid, VCPStatsGrid, VCPNarrativeSection, VCPMatchedSignals, VCPMethodologyLink, VCPFooter, VCPVersionHistory)
- **F3 In Progress:** Implemented metric utilities (computeStrongestAxis, computeStyleDescriptor, computeRhythmLabel, computePeakLabel, analyzePeakWindow). Unit tests pending.
- **P4 Complete:** Implemented notification system with:
  - `NotificationDropdown` — Bell icon with popover showing job activity
  - `NotificationBadge` — Gradient badge showing unread count
  - Integrated into `AppHeader` (replaces old badge-on-link pattern)
  - "Mark all read" functionality built into dropdown header
  - Shows in-progress jobs with animated indicator, completed jobs with checkmarks
- **P2 Complete:** Implemented navigation and route changes:
  - Created `/vibes` route with `VibesClient` — expandable table showing VCPs organized by repo
  - Created `/settings/repos` route with `RepoSettingsClient` — repo connect/disconnect moved from `/repos`
  - Updated `AppHeader` navigation: "My VCP", "Repo VCPs" (final naming)
  - Added settings tabs (LLM Keys / Repos) for consistent settings navigation
  - Deferred `/vibes/[repoId]` routes — using expandable rows and existing `/analysis/[jobId]` links instead
  - Clicking completed job navigates to VCP and marks as read
- **P1 In Progress:** ShareCard redesign partially implemented:
  - Updated `ShareCardMetric` interface with optional `detail` property
  - Added `tagline?: string | null` prop to `ShareCardProps`
  - Added tagline row rendering in `ShareCard.tsx`
  - Updated `ProfileShareSection` to use `computeShareCardMetrics()` with new metrics (Strongest, Style, Rhythm, Peak)
  - Footer still uses dynamic `shareOrigin`; Repo VCP share section pending update
- **Documentation Updated:** Updated ShareCard metrics documentation in:
  - `docs/prd/ux/share-experience-improvements.md` — Added Appendix B with metrics specification
  - `docs/prd/ux/information-architecture-restructure.md` — Added Section 4.3 for ShareCard metrics
  - Updated mockups to show new metrics layout (Strongest, Style, Rhythm, Peak)
