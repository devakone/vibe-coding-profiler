# Implementation Tracker: Information Architecture Restructure

**PRD Reference:** `docs/prd/ux/information-architecture-restructure.md`  
**Status:** Planning  
**Last Updated:** 2026-01-21

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

**Status:** `[ ] Not Started`  
**Depends on:** None  
**Blocks:** F2, P1, P3

| Task | Status | File(s) |
|------|--------|---------|
| Create `components/vcp/primitives/` directory | `[ ]` | — |
| Implement `VCPCard` | `[ ]` | `VCPCard.tsx` |
| Implement `VCPSection` | `[ ]` | `VCPSection.tsx` |
| Implement `VCPSectionTitle` | `[ ]` | `VCPSectionTitle.tsx` |
| Implement `VCPStatCard` | `[ ]` | `VCPStatCard.tsx` |
| Implement `VCPProgressBar` | `[ ]` | `VCPProgressBar.tsx` |
| Implement `VCPBadge` | `[ ]` | `VCPBadge.tsx` |
| Implement `VCPCollapsible` | `[ ]` | `VCPCollapsible.tsx` |
| Implement `VCPInsightBox` | `[ ]` | `VCPInsightBox.tsx` |
| Create shared types | `[ ]` | `types.ts` |
| Create constants (AXIS_METADATA, etc.) | `[ ]` | `constants.ts` |
| Create barrel export | `[ ]` | `index.ts` |

**Success Criteria:**
- All primitives render correctly in isolation
- Types are properly exported
- Consistent styling matches PRD specifications

---

### F2. VCP Composite Blocks

**Status:** `[ ] Not Started`  
**Depends on:** F1  
**Blocks:** P1, P3

| Task | Status | File(s) |
|------|--------|---------|
| Create `components/vcp/blocks/` directory | `[ ]` | — |
| Implement `VCPIdentityHeader` | `[ ]` | `VCPIdentityHeader.tsx` |
| Implement `VCPAxesGrid` | `[ ]` | `VCPAxesGrid.tsx` |
| Implement `VCPStatsGrid` | `[ ]` | `VCPStatsGrid.tsx` |
| Implement `VCPNarrativeSection` | `[ ]` | `VCPNarrativeSection.tsx` |
| Implement `VCPMatchedSignals` | `[ ]` | `VCPMatchedSignals.tsx` |
| Implement `VCPMethodologyLink` | `[ ]` | `VCPMethodologyLink.tsx` |
| Implement `VCPVersionHistory` | `[ ]` | `VCPVersionHistory.tsx` |
| Implement `VCPFooter` | `[ ]` | `VCPFooter.tsx` |
| Create barrel export | `[ ]` | `index.ts` |

**Success Criteria:**
- Blocks compose primitives correctly
- `VCPVersionHistory` works for both Unified and Repo variants
- All blocks accept proper TypeScript interfaces

---

### F3. Shared Utilities

**Status:** `[ ] Not Started`  
**Depends on:** None (can run parallel with F1/F2)  
**Blocks:** P1, P5

| Task | Status | File(s) |
|------|--------|---------|
| Implement `computeStrongestAxis()` | `[ ]` | `lib/vcp/metrics.ts` |
| Implement `computeStyleDescriptor()` | `[ ]` | `lib/vcp/metrics.ts` |
| Implement `computeRhythmLabel()` | `[ ]` | `lib/vcp/metrics.ts` |
| Implement `computePeakLabel()` | `[ ]` | `lib/vcp/metrics.ts` |
| Add unit tests for metric functions | `[ ]` | `__tests__/metrics.test.ts` |

**Success Criteria:**
- All metric computation functions work correctly
- Edge cases handled (missing data, null values)
- Tests pass

---

## Parallel Workstreams

### P1. ShareCard Redesign

**Status:** `[ ] Not Started`  
**Depends on:** F1, F2, F3  
**Blocks:** P5

| Task | Status | File(s) |
|------|--------|---------|
| Update `ShareCardMetric` interface | `[ ]` | `components/share/types.ts` |
| Add `tagline` prop to `ShareCardProps` | `[ ]` | `components/share/types.ts` |
| Refactor `ShareCard` with new metrics layout | `[ ]` | `components/share/ShareCard.tsx` |
| Add tagline row to `ShareCard` | `[ ]` | `components/share/ShareCard.tsx` |
| Update footer layout (vibed.dev + context) | `[ ]` | `components/share/ShareCard.tsx` |
| Update `ProfileShareSection` metric computation | `[ ]` | `components/share/ProfileShareSection.tsx` |
| Update Repo VCP share section metric computation | `[ ]` | `app/analysis/[jobId]/AnalysisClient.tsx` |

**Success Criteria:**
- ShareCard displays: Strongest, Style, Rhythm, Peak
- Tagline row renders when provided
- Footer shows repos/commits context

---

### P2. Navigation & Routes

**Status:** `[ ] Not Started`  
**Depends on:** None  
**Blocks:** X1

| Task | Status | File(s) |
|------|--------|---------|
| Rename "Reports" to "Vibes" in nav | `[ ]` | `components/nav/...` |
| Create `/vibes` route | `[ ]` | `app/vibes/page.tsx` |
| Create `/vibes/[repoId]` route | `[ ]` | `app/vibes/[repoId]/page.tsx` |
| Create `/vibes/[repoId]/[jobId]` route | `[ ]` | `app/vibes/[repoId]/[jobId]/page.tsx` |
| Create `/settings/repos` route | `[ ]` | `app/settings/repos/page.tsx` |
| Move repo connect/disconnect to Settings | `[ ]` | `app/settings/repos/page.tsx` |
| Implement `VibesTable` component | `[ ]` | `components/vibes/VibesTable.tsx` |
| Update navigation labels | `[ ]` | `components/nav/...` |

**Success Criteria:**
- New routes are functional
- Navigation reflects new terminology
- Repo management is in Settings

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

**Status:** `[ ] Not Started`  
**Depends on:** None  
**Blocks:** X2

| Task | Status | File(s) |
|------|--------|---------|
| Create `NotificationDropdown` component | `[ ]` | `components/notifications/NotificationDropdown.tsx` |
| Create notification badge component | `[ ]` | `components/notifications/NotificationBadge.tsx` |
| Integrate with `JobsContext` | `[ ]` | `components/notifications/...` |
| Add to navigation header | `[ ]` | `components/nav/...` |
| Implement "Clear all" functionality | `[ ]` | `components/notifications/...` |
| Remove Jobs tab from Reports page | `[ ]` | `app/reports/...` |

**Success Criteria:**
- Notifications show in-progress and completed jobs
- Badge shows unread count
- Clicking notification navigates to VCP

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
| F1: VCP Primitives | 12 | 0 | `[ ] Not Started` |
| F2: VCP Composite Blocks | 10 | 0 | `[ ] Not Started` |
| F3: Shared Utilities | 5 | 0 | `[ ] Not Started` |
| P1: ShareCard Redesign | 7 | 0 | `[ ] Not Started` |
| P2: Navigation & Routes | 8 | 0 | `[ ] Not Started` |
| P3: VCP Display Unification | 11 | 0 | `[ ] Not Started` |
| P4: Notification System | 6 | 0 | `[ ] Not Started` |
| P5: Vertical Stories ShareCard | 7 | 0 | `[ ] Not Started` |
| P6: LLM Tagline Generation | 5 | 0 | `[ ] Not Started` |
| X1: Migration & Redirects | 5 | 0 | `[ ] Not Started` |
| X2: Polish & Testing | 7 | 0 | `[ ] Not Started` |
| X3: Documentation | 5 | 0 | `[ ] Not Started` |
| **Total** | **88** | **0** | **0%** |

---

## Notes

- F1/F2/F3 are foundational and must complete before parallel workstreams
- P1-P6 can run in parallel once dependencies are met
- P6 (LLM Tagline) is a backend task that can start early
- X1/X2/X3 are finalization steps after parallel work completes
