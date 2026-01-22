# PRD: Information Architecture Restructure

**Status:** Draft
**Author:** Claude (AI Assistant)
**Date:** 2026-01-21
**Version:** 1.1

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current State](#2-current-state)
3. [Proposed Changes](#3-proposed-changes)
4. [Terminology Alignment](#4-terminology-alignment)
5. [Migration & Backwards Compatibility](#5-migration--backwards-compatibility)
6. [Component Changes](#6-component-changes)
7. [Data Requirements](#7-data-requirements)
8. [Open Questions](#8-open-questions)
9. [Success Metrics](#9-success-metrics)
10. [Implementation Phases](#10-implementation-phases)

**Appendices:**
- [Appendix A: Wireframes](#appendix-a-wireframes) — Navigation and page layouts
- [Appendix B: VCP Component System](#appendix-b-vcp-component-system) — Unified component architecture
- [Appendix C: ShareCard Metrics Redesign](#appendix-c-sharecard-metrics-redesign) — New metrics proposal
- [Appendix D: VCP Component Architecture](#appendix-d-vcp-component-architecture) — Component specifications
- [Appendix E: Implementation Phases (Components)](#appendix-e-implementation-phases-components) — Component build order
- [Appendix F: Wireframe - Unified VCP](#appendix-f-wireframe---unified-vcp-component-breakdown) — Component breakdown

---

## 1. Overview

### 1.1 Problem Statement

The current information architecture has several issues:

1. **Naming confusion**: "Reports" is a misnomer - these are analyses that generate Vibe Coding Profiles (VCPs), not reports
2. **Flat organization**: All VCPs displayed as a flat grid regardless of which repo they belong to
3. **Page overlap**: The Repos and Reports pages have overlapping concerns and cross-related functionality
4. **Jobs as a page**: The Jobs tab takes up prime real estate for transient data that would be better served as notifications
5. **Inconsistent VCP display**: Repo VCPs and Unified VCPs use different display patterns and terminology

### 1.2 Goals

- Simplify the navigation by consolidating related functionality
- Organize VCP history by repository for better discoverability
- Convert jobs from a page/tab to a notification system
- Unify the display and terminology of Repo VCPs and Unified VCPs
- Move repo management (connect/disconnect) to Settings where it belongs

### 1.3 Non-Goals

- Changing the underlying data model or database schema
- Modifying the analysis/job processing logic or persona detection algorithm
- Changing the share image generation system

---

## 2. Current State

### 2.1 Current Navigation (Authenticated)

```
My VCP | Repos | Reports | Settings | Methodology | Security
```

### 2.2 Current Page Responsibilities

| Page | URL | Responsibilities |
|------|-----|------------------|
| My VCP | `/` | Display Unified VCP, share profile, view versions |
| Repos | `/repos` | Connect/disconnect repos, start analysis, LLM opt-in |
| Reports | `/analysis` | Tab 1: View completed VCPs as flat grid. Tab 2: View jobs list |
| Report Detail | `/analysis/[jobId]` | View single Repo VCP with full detail |
| Settings | `/settings/*` | LLM keys configuration |

### 2.3 Current User Flows

**Adding a repo and viewing its VCP:**
```
Repos → Connect repo → Start analysis → Reports (Jobs tab) →
Poll for completion → Reports (Reports tab) → Find card → View detail
```

**Viewing VCP history for a specific repo:**
```
Reports → Scroll through flat list → Find cards for target repo →
Click each to compare versions
```

---

## 3. Proposed Changes

### 3.1 New Navigation

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo] Vibe Coding Profile                                      │
│                                                                  │
│  My Vibe | Vibes | Settings | Methodology | Security    🔔 [Out] │
└──────────────────────────────────────────────────────────────────┘
```

| Old | New | Notes |
|-----|-----|-------|
| My VCP | **My Vibe** | Consistent branding |
| Repos | *Removed* | Merged into Settings |
| Reports | **Vibes** | VCP history organized by repo |
| Settings | **Settings** | Now includes repo management |
| — | **🔔 (Bell icon)** | Notification dropdown for jobs |

### 3.2 New Route Structure

```
/                           → Unified VCP (My Vibe) - unchanged
/vibes                      → VCP table organized by repo
/vibes/[repoId]             → (Optional) Repo detail page with VCP history
/vibes/[repoId]/[jobId]     → Individual VCP detail (was /analysis/[jobId])
/settings/repos             → Repo management (connect, disconnect, sync)
/settings/llm-keys          → LLM keys - unchanged
/analysis/*                 → Redirect to /vibes/* for backwards compatibility
/repos                      → Redirect to /settings/repos
```

### 3.3 New Page Responsibilities

#### 3.3.1 My Vibe (`/`)
**No changes to functionality.**

Terminology update:
- "My VCP" → "My Vibe" in navigation

#### 3.3.2 Vibes (`/vibes`)

**Purpose:** View all VCPs organized by repository

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Your Vibes                                    [+ Add Repo →]   │
│                                                                  │
│  Filter: [All ▼]  Sort: [Recent ▼]                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ▶ user/repo-alpha                                           ││
│  │   Latest: Prompt Sprinter (94% confidence) · Jan 20, 2026   ││
│  │   3 versions · 847 commits analyzed                         ││
│  │                                              [View Latest]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ▼ user/repo-beta                                            ││
│  │   Latest: Orchestrator (87% confidence) · Jan 18, 2026      ││
│  │   ┌─────────────────────────────────────────────────────┐   ││
│  │   │ Version │ Date       │ Persona         │ Commits │  │   ││
│  │   │ v3      │ Jan 18     │ Orchestrator    │ 234     │ 👁 │   ││
│  │   │ v2      │ Jan 10     │ Orchestrator    │ 198     │ 👁 │   ││
│  │   │ v1      │ Dec 28     │ Rapid Risk Taker│ 156     │ 👁 │   ││
│  │   └─────────────────────────────────────────────────────┘   ││
│  │                                   [Re-run Analysis]         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ▶ user/repo-gamma                                           ││
│  │   Not analyzed yet                                          ││
│  │                                              [Get Vibe]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Expandable rows showing VCP version history per repo
- Quick actions: View latest, Re-run analysis, Get Vibe (for unanalyzed)
- "Add Repo" link navigates to `/settings/repos`
- Filter by: All, Analyzed only, Not analyzed
- Sort by: Recent analysis, Repo name, Commit count

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                      No repos connected yet                      │
│                                                                  │
│        Connect a GitHub repository to discover your              │
│                    Vibe Coding Profile                           │
│                                                                  │
│                    [Connect a Repo →]                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3.3 VCP Detail (`/vibes/[repoId]/[jobId]`)

**Purpose:** View individual Repo VCP (same as current `/analysis/[jobId]`)

**Changes:**
- URL structure change only
- Breadcrumb: `Vibes > repo-name > v3`
- Version selector shows all versions for THIS repo (already exists)

#### 3.3.4 Settings - Repos (`/settings/repos`)

**Purpose:** Manage connected repositories

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                        │
│                                                                  │
│  [LLM Keys]  [Repos]  [Preferences]                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Connected Repositories                                          │
│  ─────────────────────                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  🔗 Connect from GitHub                                     ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │ 🔍 Search your repositories...                      │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  │                                                             ││
│  │  Available:                                                 ││
│  │  ○ user/new-project                          [Connect]     ││
│  │  ○ user/another-repo                         [Connect]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Your Repos (3)                          Last synced: 2 min ago │
│  ─────────────────                              [↻ Sync Now]    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ user/repo-alpha        Analyzed (3 versions)   [Remove]   │  │
│  │ user/repo-beta         Analyzed (2 versions)   [Remove]   │  │
│  │ user/repo-gamma        Not analyzed            [Remove]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  LLM Narratives                                                  │
│  ──────────────                                                  │
│  [✓] Enable AI-generated narratives for my analyses              │
│      Requires LLM API key configuration                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Connect new repos from GitHub (moved from `/repos`)
- Disconnect repos (with confirmation: "This will remove repo from your Unified Vibe")
- GitHub sync status and manual sync button
- LLM opt-in toggle (moved from `/repos`)

### 3.4 Notification System (Jobs)

**Purpose:** Replace Jobs tab with header notification dropdown

**Location:** Bell icon in header, right side before Sign Out

**States:**

1. **No activity:**
   ```
   🔔 (no badge)
   ```

2. **Jobs running:**
   ```
   🔔 (pulsing dot)

   Dropdown:
   ┌─────────────────────────────────────┐
   │  Activity                           │
   ├─────────────────────────────────────┤
   │  ⏳ Analyzing user/repo-alpha...    │
   │     Started 30s ago                 │
   ├─────────────────────────────────────┤
   │  ✓ user/repo-beta complete          │
   │     Prompt Sprinter · 2 min ago     │
   │                         [View →]    │
   └─────────────────────────────────────┘
   ```

3. **New results (unread):**
   ```
   🔔 (badge with count: 2)

   Dropdown:
   ┌─────────────────────────────────────┐
   │  Activity              [Mark read]  │
   ├─────────────────────────────────────┤
   │  🆕 user/repo-alpha complete        │
   │     Orchestrator · Just now         │
   │                         [View →]    │
   ├─────────────────────────────────────┤
   │  🆕 user/repo-beta complete         │
   │     Prompt Sprinter · 5 min ago     │
   │                         [View →]    │
   ├─────────────────────────────────────┤
   │  ✓ user/repo-gamma complete         │
   │     Reflective Balancer · 1 hr ago  │
   └─────────────────────────────────────┘
   ```

4. **Error state:**
   ```
   🔔 (red badge)

   Dropdown:
   ┌─────────────────────────────────────┐
   │  Activity                           │
   ├─────────────────────────────────────┤
   │  ⚠️ user/repo-alpha failed          │
   │     Not enough commits · 5 min ago  │
   │                       [Retry →]     │
   └─────────────────────────────────────┘
   ```

**Behavior:**
- Polls for job updates (existing JobsContext can be reused)
- Clicking "View" navigates to `/vibes/[repoId]/[jobId]`
- "Mark read" clears unread badges
- Shows last 10 activities, older ones auto-dismiss
- Persists unread state in localStorage (or context as currently done)

---

## 4. Terminology Alignment

### 4.1 Global Terminology

| Old Term | New Term | Usage |
|----------|----------|-------|
| My VCP | My Vibe | Navigation, page title |
| Report | Vibe / VCP | When referring to an analysis result |
| Reports page | Vibes page | Navigation |
| Repo VCP | Repo Vibe | Individual repo analysis |
| Unified VCP | My Vibe / Unified Vibe | Aggregated profile |
| Get vibe | Get Vibe | Action to start analysis |
| View report | View Vibe | Action to view result |

### 4.2 Display Consistency

Both Repo Vibe and Unified Vibe share cards should use:
- Same persona color palette
- Same axes visualization (radar chart or bars)
- Same metrics terminology
- Same share card structure (with variant flag for context)

---

## 5. Migration & Backwards Compatibility

### 5.1 URL Redirects

| Old URL | New URL | Type |
|---------|---------|------|
| `/repos` | `/settings/repos` | 301 Permanent |
| `/analysis` | `/vibes` | 301 Permanent |
| `/analysis/[jobId]` | `/vibes/[repoId]/[jobId]` | 301 Permanent (requires lookup) |

### 5.2 Migration Steps

1. Create new routes (`/vibes`, `/settings/repos`)
2. Build new components (VibesTable, NotificationDropdown)
3. Move repo management UI to Settings
4. Update navigation
5. Add redirects for old routes
6. Remove old pages after redirect period

---

## 6. Component Changes

### 6.1 New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `VibesTable` | `/vibes` | Expandable table of repos with VCP history |
| `VibesTableRow` | `/vibes` | Single repo row with expand/collapse |
| `NotificationDropdown` | `AppHeader` | Jobs notification system |
| `NotificationItem` | `AppHeader` | Single notification entry |
| `RepoSettings` | `/settings/repos` | Repo management panel |

### 6.2 Modified Components

| Component | Changes |
|-----------|---------|
| `AppHeader` | New nav items, add notification bell |
| `SettingsLayout` | Add "Repos" tab |
| `JobsContext` | Adapt for notification system (may need unread persistence) |

### 6.3 Deprecated Components

| Component | Replacement |
|-----------|-------------|
| `ReposClient` | Split into `RepoSettings` + `VibesTable` |
| `AnalysisListClient` | Replaced by `VibesTable` |
| Jobs tab in `/analysis` | Replaced by `NotificationDropdown` |

---

## 7. Data Requirements

### 7.1 New API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/vibes` | List repos with their VCP history (grouped) |
| `GET /api/vibes/[repoId]` | Get VCP history for specific repo |

### 7.2 Modified API Endpoints

| Endpoint | Changes |
|----------|---------|
| `GET /api/analysis/[jobId]` | Add `repoId` to response for URL construction |

### 7.3 No Database Changes Required

The existing schema supports this restructure. We're changing how data is queried and displayed, not the underlying model.

---

## 8. Open Questions

1. **Repo detail page:** Should `/vibes/[repoId]` exist as a dedicated page, or is the expandable row sufficient?
   - Recommendation: Start with expandable row only, add dedicated page if needed

2. **Notification persistence:** Should unread state persist across sessions (localStorage/DB) or reset on refresh?
   - Recommendation: localStorage for simplicity, upgrade to DB if users request

3. **Admin jobs view:** Keep `/admin/jobs` as-is for system-wide monitoring?
   - Recommendation: Yes, admin view serves different purpose (system health)

4. **URL structure for VCP detail:** Use `jobId` or introduce `versionNumber`?
   - Current: `/vibes/[repoId]/[jobId]`
   - Alternative: `/vibes/[repoId]/v3`
   - Recommendation: Keep jobId for simplicity, display as "v3" in UI

---

## 9. Success Metrics

- Reduced navigation clicks to view repo's VCP history (currently 3+ → target 2)
- Reduced confusion about "Reports" terminology (qualitative feedback)
- Faster discovery of new analysis results via notifications
- Cleaner separation of concerns (view vs. manage)

---

## 10. Implementation Phases

### Phase 1: Foundation
- Create `/vibes` route with VibesTable component
- Create `/settings/repos` with repo management UI
- Update navigation labels

### Phase 2: Notifications
- Build NotificationDropdown component
- Integrate with JobsContext
- Remove Jobs tab from old Reports page

### Phase 3: Migration
- Add URL redirects
- Update all internal links
- Deprecate old routes

### Phase 4: Polish
- Terminology audit across all UI
- VCP display consistency review
- Documentation update

---

## Appendix A: Wireframes

### A.1 New Navigation
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ● Vibe Coding Profile    My Vibe  Vibes  Settings  Methodology  Security │
│                                                                    🔔 [Sign out] │
└──────────────────────────────────────────────────────────────────────────┘
```

### A.2 Notification Dropdown (Expanded)
```
                                                    ┌──────────────────────┐
                                                    │ Activity    [Clear]  │
                                                    ├──────────────────────┤
                                                    │ ⏳ repo-alpha        │
                                                    │    Analyzing...      │
                                                    ├──────────────────────┤
                                                    │ 🆕 repo-beta         │
                                                    │    Prompt Sprinter   │
                                                    │    2 min ago  [View] │
                                                    ├──────────────────────┤
                                                    │ ✓ repo-gamma         │
                                                    │    Orchestrator      │
                                                    │    1 hr ago   [View] │
                                                    └──────────────────────┘
```

### A.3 Vibes Table (Collapsed)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Your Vibes                                              [+ Add Repo →]  │
├─────────────────────────────────────────────────────────────────────────┤
│ ▶ user/repo-alpha    Prompt Sprinter (94%)    3 versions    [View]     │
│ ▶ user/repo-beta     Orchestrator (87%)       2 versions    [View]     │
│ ▶ user/repo-gamma    Not analyzed             —             [Get Vibe] │
└─────────────────────────────────────────────────────────────────────────┘
```

### A.4 Vibes Table (Expanded Row)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ▼ user/repo-alpha    Prompt Sprinter (94%)    3 versions               │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ Version │ Date       │ Persona          │ Confidence │ Commits │  │
│   ├─────────┼────────────┼──────────────────┼────────────┼─────────┤  │
│   │ v3      │ Jan 20     │ Prompt Sprinter  │ 94%        │ 847     │👁 │
│   │ v2      │ Jan 15     │ Orchestrator     │ 88%        │ 723     │👁 │
│   │ v1      │ Jan 10     │ Orchestrator     │ 85%        │ 612     │👁 │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                      [Re-run Analysis] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: VCP Component System

This appendix defines a unified component system for displaying Vibe Coding Profiles (VCPs) consistently across both Repo VCP and Unified VCP views.

### B.1 Problem Statement

The current VCP display has inconsistencies between Repo VCP (`/analysis/[jobId]`) and Unified VCP (`/` homepage):

| Issue | Repo VCP | Unified VCP |
|-------|----------|-------------|
| Card radius | `rounded-[2rem]` | `rounded-[2.5rem]` |
| Shadow | `shadow-sm` | Strong custom shadow |
| Section padding | `p-8` | `p-8 sm:p-10` |
| Title tracking | `tracking-[0.25em]` | `tracking-[0.4em]` |
| Insight display | White card with narrative | Purple left-border box |
| Axes display | Not shown in detail card | Full 6-axis grid |

Additionally, the ShareCard metrics for Unified VCP show repetitive data (repos, commits, clarity) that doesn't differentiate the user's vibe coding style.

### B.2 Goals

1. **Unified visual language**: Same styling patterns across both VCP variants
2. **Compelling ShareCard metrics**: Surface vibe-specific data that creates curiosity
3. **Component reusability**: Extract shared components to reduce duplication
4. **Maintainability**: Change once, update everywhere

### B.3 Non-Goals

- Changing the underlying vibe analysis logic
- Modifying the persona detection algorithm
- Redesigning the share image generation system

---

## Appendix C: ShareCard Metrics Redesign

### C.1 Current State

**Unified VCP ShareCard Metrics:**
| Position | Label | Value | Issue |
|----------|-------|-------|-------|
| 1 | Repos | `3` | Repeated in footer |
| 2 | Commits | `1,245` | Repeated in footer |
| 3 | Clarity | `85%` | Useful but not differentiating |
| 4 | [Top Axis] | `78` | Good, but needs context |

**Repo VCP ShareCard Metrics:**
| Position | Label | Value |
|----------|-------|-------|
| 1 | Longest Streak | `7 days` |
| 2 | Peak Window | `Afternoons` |
| 3 | Commit Style | `Slicer` |
| 4 | Feature / Fix | `2.3 : 1` |

### C.2 Problem Analysis

The Unified VCP metrics fail to:
- **Differentiate**: Anyone can have X repos and Y commits
- **Create curiosity**: "Repos: 3" doesn't make others want their own VCP
- **Show the vibe**: VCP's value is the *how* not the *how much*

### C.3 Proposed Metrics

**Option A: Top Axes Focus (Recommended)**

| Position | Label | Example Value | Source |
|----------|-------|---------------|--------|
| 1 | **Strongest** | `Automation 78` | Highest scoring axis |
| 2 | **Style** | `High Guardrails` | Notable axis characteristic |
| 3 | **Consistency** | `Steady` or `2 Shifts` | Persona stability over time |
| 4 | **Match** | `85%` | Persona match score |

**Rationale:**
- Shows what makes the user unique (strongest signal)
- Creates curiosity ("What's my strongest signal?")
- Adds evolution story (consistency/shifts)
- Keeps one quality indicator (match score)

**Option B: Signature Traits**

| Position | Label | Example Value |
|----------|-------|---------------|
| 1 | **Dominant** | `Automation` |
| 2 | **Rhythm** | `Bursty` / `Steady` |
| 3 | **Loops** | `High` / `Low` |
| 4 | **Signals** | `4 rules` |

**Option C: Hybrid**

| Position | Label | Example Value |
|----------|-------|---------------|
| 1 | **Top Signal** | `Automation 78` |
| 2 | **2nd Signal** | `Guardrails 65` |
| 3 | **Clarity** | `85%` |
| 4 | **Match** | `High` |

### C.4 Recommendation

**Implement Option A** with the following changes:

1. **Metric 1 - Strongest Axis**: `{AxisName} {Score}`
   - Computed from: `Object.entries(axes).sort((a, b) => b[1].score - a[1].score)[0]`
   
2. **Metric 2 - Style Descriptor**: Human-readable trait
   - Derived from axis levels and combinations
   - Examples: "High Guardrails", "Fast Shipper", "Wide Scope", "Deep Planner"
   
3. **Metric 3 - Consistency**: Persona stability
   - `"Steady"` if no shifts in last 5 analyses
   - `"N Shifts"` if persona changed N times
   - `"New"` if < 2 analyses
   
4. **Metric 4 - Match Score**: Persona confidence as percentage
   - Use `persona.score` (0-100)

### C.5 Footer Changes

Move repos/commits to footer context:
- **Unified**: `vibed.dev` | `3 repos · 1,245 commits`
- **Repo**: `vibed.dev` | `245 commits · 12 active days`

---

## Appendix D: VCP Component Architecture

### D.1 Component Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Layer 3: Page Components                      │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐ │
│  │   UnifiedVCPCard.tsx    │    │       RepoVCPCard.tsx           │ │
│  │   EvolutionSection.tsx  │    │       RepoMetricsSection.tsx    │ │
│  │   RepoBreakdown.tsx     │    │       WorkflowStyleSection.tsx  │ │
│  └─────────────────────────┘    └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                      Layer 2: Composite Blocks                       │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│  │ VCPIdentityHeader│ │   VCPAxesGrid    │ │  VCPNarrativeSection │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│  │   VCPStatsGrid   │ │ VCPMatchedSignals│ │  VCPMethodologyLink  │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐                          │
│  │ VCPVersionHistory│ │    VCPFooter     │                          │
│  └──────────────────┘ └──────────────────┘                          │
├─────────────────────────────────────────────────────────────────────┤
│                       Layer 1: Primitives                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐│
│  │  VCPCard   │ │ VCPSection │ │VCPStatCard │ │  VCPProgressBar    ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘│
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐│
│  │  VCPBadge  │ │VCPCollapse │ │VCPInsightBox│ │ VCPSectionTitle   ││
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### D.2 Directory Structure

```
apps/web/src/components/vcp/
├── index.ts                     # Public exports
├── types.ts                     # Shared type definitions
├── constants.ts                 # Axis metadata, style constants
│
├── primitives/
│   ├── VCPCard.tsx              # Base card container
│   ├── VCPSection.tsx           # Section with border and padding
│   ├── VCPSectionTitle.tsx      # Uppercase tracking label
│   ├── VCPStatCard.tsx          # Single stat display
│   ├── VCPProgressBar.tsx       # Horizontal progress bar
│   ├── VCPBadge.tsx             # Rounded pill badge
│   ├── VCPCollapsible.tsx       # Details/summary wrapper
│   └── VCPInsightBox.tsx        # Purple left-border box
│
├── blocks/
│   ├── VCPIdentityHeader.tsx    # Persona name + tagline + badges
│   ├── VCPAxesGrid.tsx          # 6 axis cards with bars
│   ├── VCPStatsGrid.tsx         # Flexible stat grid
│   ├── VCPNarrativeSection.tsx  # Headline + paragraphs
│   ├── VCPMatchedSignals.tsx    # Tags for matched rules
│   ├── VCPMethodologyLink.tsx   # Collapsible explanation
│   ├── VCPVersionHistory.tsx    # Unified version/snapshot selector
│   └── VCPFooter.tsx            # Last updated + actions
│
├── unified/
│   ├── UnifiedVCPCard.tsx       # Full unified profile
│   ├── EvolutionSection.tsx     # Shifts, dominant vibe
│   └── RepoBreakdownSection.tsx # Per-repo contribution
│
└── repo/
    ├── RepoVCPCard.tsx          # Full repo analysis
    ├── RepoMetricsSection.tsx   # Streak, peak, focus, etc.
    ├── WorkflowStyleSection.tsx # Artifact traceability
    └── ProfileContribution.tsx  # Unified VCP impact
```

### D.3 Component Specifications

#### D.3.1 VCPCard (Base Container)

```tsx
interface VCPCardProps {
  children: ReactNode;
  variant?: "default" | "gradient";
  className?: string;
}
```

**Unified Styling:**
- Border radius: `rounded-[2.5rem]`
- Border: `border border-black/5`
- Background: `bg-white`
- Shadow: `shadow-[0_30px_120px_rgba(2,6,23,0.08)]`
- Gradient variant adds: `bg-gradient-to-br from-violet-500/8 via-indigo-500/5 to-violet-500/8`

#### D.3.2 VCPSection

```tsx
interface VCPSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  noBorder?: boolean;
  actions?: ReactNode;
}
```

**Unified Styling:**
- Padding: `p-8 sm:p-10`
- Border (unless noBorder): `border-t border-black/5`
- Title: `text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500`

#### D.3.3 VCPIdentityHeader

```tsx
interface VCPIdentityHeaderProps {
  variant: "unified" | "repo";
  label: string;                    // "Your Unified VCP" or "Your Repo VCP"
  personaName: string;
  personaTagline?: string;
  confidence: string;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  actions?: ReactNode;
}
```

**Usage:**
- Unified: Shows repos, commits, clarity in stats
- Repo: Shows commits, active days in stats

#### D.3.4 VCPAxesGrid

```tsx
interface VCPAxesGridProps {
  axes: Record<string, { score: number; level: string; why: string[] }>;
  showDescriptions?: boolean;
  columns?: 2 | 3;
}
```

**Shared Axis Metadata:**
```tsx
const AXIS_METADATA = {
  automation_heaviness: {
    name: "Automation",
    description: "How much AI-generated code you accept",
  },
  guardrail_strength: {
    name: "Guardrails", 
    description: "Testing, linting, and safety measures",
  },
  iteration_loop_intensity: {
    name: "Iteration",
    description: "Rapid cycles of prompting and fixing",
  },
  planning_signal: {
    name: "Planning",
    description: "Thoughtful setup before execution",
  },
  surface_area_per_change: {
    name: "Surface Area",
    description: "Size and scope of each change",
  },
  shipping_rhythm: {
    name: "Rhythm",
    description: "How frequently you ship changes",
  },
} as const;
```

#### D.3.5 VCPInsightBox

```tsx
interface VCPInsightBoxProps {
  headline: string;
  paragraphs?: string[];
  highlights?: string[];
  isAIGenerated?: boolean;
  llmModel?: string;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}
```

**Unified Styling:**
- Container: `rounded-xl border-l-4 border-l-violet-500 bg-violet-50 px-5 py-4`
- Used in both Unified (insight section) and Repo (narrative section)

#### D.3.6 VCPStatsGrid

```tsx
interface VCPStatsGridProps {
  stats: Array<{
    label: string;
    value: string;
    subtitle?: string;
  }>;
  columns?: 3 | 4 | 5;
  variant?: "centered" | "left-aligned";
}
```

**Usage:**
- Unified Evolution: 3 columns (Repo VCPs, Vibe Shifts, Dominant)
- Repo Metrics: 5 columns (Streak, Peak, Focus, Build/Fix, Scope)

#### D.3.7 VCPMethodologyLink

```tsx
interface VCPMethodologyLinkProps {
  matchedRules?: string[];
  matchedCriteria?: string[];
  caveats?: string[];
  showAxisLegend?: boolean;
}
```

**Shared Features:**
- Collapsible "How we got this" section
- Tags for matched signals
- Caveats list
- Link to `/methodology`

#### D.3.8 VCPVersionHistory (Unified Version Selector)

```tsx
interface VCPVersionHistoryProps {
  variant: "unified" | "repo";
  
  // Current state
  currentId: string;                    // Current profile ID or job ID
  currentUpdatedAt: string | null;
  
  // Data source (one of these should be provided)
  versions?: VCPVersionEntry[];         // Pre-loaded versions
  fetchVersions?: () => Promise<VCPVersionEntry[]>;  // Lazy load function
  
  // Behavior
  onVersionSelect: (version: VCPVersionEntry) => void;
  showPreview?: boolean;                // Show inline preview when selected
  defaultExpanded?: boolean;
  
  // Optional overrides
  title?: string;                       // Default: "Profile History" or "Version History"
  emptyMessage?: string;
}

interface VCPVersionEntry {
  id: string;                           // Profile history ID or job ID
  version?: number;                     // v1, v2, v3 (for display)
  createdAt: string;
  
  // Persona info
  personaId: string;
  personaName: string;
  personaTagline?: string;
  confidence?: string;
  
  // Stats (context-dependent)
  totalCommits: number;
  totalRepos?: number;                  // Unified only
  
  // Metadata
  triggerInfo?: string;                 // "Triggered by: repo-name" or "Latest"
  llmModel?: string | null;
  llmKeySource?: string | null;
  
  // For repo variant
  repoName?: string;
}
```

**Current Implementations Being Unified:**

| Aspect | Unified VCP (ProfileVersionSelector) | Repo VCP (inline select) |
|--------|--------------------------------------|--------------------------|
| Location | Separate component below ShareCard | Inline in AnalysisClient |
| Trigger | Click to expand collapsible | Always visible if > 1 version |
| Data source | `/api/profile/history` | `repoHistory` from props |
| Navigation | Shows preview inline | Navigates to `/analysis/[jobId]` |
| Styling | Collapsible panel | Simple select dropdown |

**Unified Behavior:**

1. **Collapsed State** (default for both):
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │  📋 Version History                      Last updated: Jan 21  │
   │                                                              ▼ │
   └─────────────────────────────────────────────────────────────────┘
   ```

2. **Expanded State** (on click):
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │  📋 Version History                      Last updated: Jan 21  │
   │                                                              ▲ │
   ├─────────────────────────────────────────────────────────────────┤
   │                                                                 │
   │  ┌─────────────────────────────────────────────────────────────┐│
   │  │ ● v3  Jan 21  Prompt Sprinter    94%   847 commits  (current)││
   │  └─────────────────────────────────────────────────────────────┘│
   │  ┌─────────────────────────────────────────────────────────────┐│
   │  │ ○ v2  Jan 15  Orchestrator       88%   723 commits         ││
   │  └─────────────────────────────────────────────────────────────┘│
   │  ┌─────────────────────────────────────────────────────────────┐│
   │  │ ○ v1  Jan 10  Orchestrator       85%   612 commits         ││
   │  └─────────────────────────────────────────────────────────────┘│
   │                                                                 │
   │  3 versions saved                                               │
   └─────────────────────────────────────────────────────────────────┘
   ```

3. **Version Card (when selected for preview)**:
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │  Prompt Sprinter                                    [AI: Claude]│
   │  "You build to think — code is your sketchpad."                 │
   │                                                                 │
   │  3 repos · 847 commits · Triggered by: repo-alpha               │
   │                                                                 │
   │  Version 3 — Jan 21, 2026 2:34 PM                               │
   └─────────────────────────────────────────────────────────────────┘
   ```

**Unified vs Repo Differences:**

| Feature | Unified Variant | Repo Variant |
|---------|-----------------|--------------|
| Title | "Profile History" | "Version History" |
| Stats shown | `{repos} repos · {commits} commits` | `{commits} commits` |
| Trigger info | "Triggered by: {repoName}" | Not shown |
| On select | Shows preview inline | Navigates to version URL |
| Empty state | "No history available yet." | Not shown (hidden if < 2) |
| LLM badge | Shows model name | Shows model name |

**Navigation Behavior:**

- **Unified**: Selecting a version shows inline preview. User can compare versions without leaving page.
- **Repo**: Selecting a version navigates to `/vibes/[repoId]/[jobId]` (or legacy `/analysis/[jobId]`)

**Shared Styling:**

```tsx
// Container
"rounded-2xl border border-black/5 bg-zinc-50 p-4"

// Header button
"flex w-full items-center justify-between text-left"

// Title
"text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500"

// Version row (unselected)
"rounded-xl border border-black/5 bg-white p-3 cursor-pointer hover:bg-zinc-50 transition"

// Version row (selected/current)
"rounded-xl border-2 border-violet-500 bg-violet-50/50 p-3"

// Persona name
"text-sm font-semibold text-zinc-900"

// Date/meta
"text-xs text-zinc-400"

// Stats
"text-xs text-zinc-600"

// LLM badge
"rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700"
```

### D.4 Shared Utilities

```tsx
// lib/vcp-utils.ts

export const AXIS_METADATA: Record<string, { name: string; description: string }>;
export const AXIS_LEGEND: Record<string, string>;

export function formatConfidence(confidence: string): string;
export function formatAxisScore(score: number): string;
export function getConfidenceColor(confidence: string): string;
export function computeStyleDescriptor(axes: VibeAxes): string;
export function computeConsistencyLabel(history: string[]): string;
```

### D.5 Style Unification Decisions

| Property | Current (Mixed) | Unified Standard |
|----------|-----------------|------------------|
| Card radius | `2rem` / `2.5rem` | `rounded-[2.5rem]` |
| Shadow | Various | `shadow-[0_30px_120px_rgba(2,6,23,0.08)]` |
| Section padding | `p-8` / `p-8 sm:p-10` | `p-8 sm:p-10` |
| Title tracking | `0.25em` / `0.4em` | `tracking-[0.3em]` |
| Insight style | White / Purple border | Purple left-border |
| Progress bar | Various | `from-violet-500 to-indigo-500` |

---

## Appendix E: Implementation Phases (Components)

### E.1 Phase 1: Primitives
1. Create `components/vcp/primitives/` directory
2. Implement: `VCPCard`, `VCPSection`, `VCPSectionTitle`, `VCPStatCard`
3. Implement: `VCPProgressBar`, `VCPBadge`, `VCPCollapsible`, `VCPInsightBox`
4. Create `types.ts` and `constants.ts`

### E.2 Phase 2: Composite Blocks
1. Create `components/vcp/blocks/` directory
2. Implement: `VCPIdentityHeader`, `VCPAxesGrid`, `VCPStatsGrid`
3. Implement: `VCPNarrativeSection`, `VCPMatchedSignals`, `VCPMethodologyLink`
4. Implement: `VCPVersionHistory` (shared version/snapshot selector)
5. Implement: `VCPFooter`

### E.3 Phase 3: Unified VCP Refactor
1. Create `components/vcp/unified/` directory
2. Implement: `UnifiedVCPCard`, `EvolutionSection`, `RepoBreakdownSection`
3. Refactor `page.tsx` to use new components
4. Update `ProfileShareSection` with new metrics

### E.4 Phase 4: Repo VCP Refactor
1. Create `components/vcp/repo/` directory
2. Implement: `RepoVCPCard`, `RepoMetricsSection`, `WorkflowStyleSection`
3. Implement: `ProfileContribution`
4. Refactor `AnalysisClient.tsx` to use new components

### E.5 Phase 5: Polish
1. Visual parity testing
2. Remove duplicated code from original files
3. Update exports in `index.ts`
4. Documentation

---

## Appendix F: Wireframe - Unified VCP (Component Breakdown)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                    ShareCard (existing)                              │ │
│ │  ┌ Metrics: Strongest | Style | Consistency | Match ┐               │ │
│ │  └ Footer: vibed.dev | 3 repos · 1,245 commits      ┘               │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ ┌─────────────────── VCPCard ───────────────────────────────────────────┐│
│ │ ┌──────────────── VCPSection (noBorder) ────────────────────────────┐ ││
│ │ │                   VCPIdentityHeader                                │ ││
│ │ │  "Your Unified VCP"                            [Add repo] [View]  │ ││
│ │ │  Prompt Sprinter                                                   │ ││
│ │ │  "You build to think — code is your sketchpad."                   │ ││
│ │ │  [high confidence] · 3 repos · 1,245 commits · 85% clarity        │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ │                                                                        ││
│ │ ┌──────────────── VCPSection ───────────────────────────────────────┐ ││
│ │ │                   VCPInsightBox                                    │ ││
│ │ │  █ INSIGHT                                        [AI-generated]  │ ││
│ │ │  █ "Across 3 repos, you show consistent prototyper patterns..."   │ ││
│ │ │  █ • Highlight 1                                                  │ ││
│ │ │  █ • Highlight 2                                                  │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ │                                                                        ││
│ │ ┌──────────────── VCPSection ───────────────────────────────────────┐ ││
│ │ │  YOUR AXES                                                         │ ││
│ │ │  ┌─────────────────── VCPAxesGrid ──────────────────────────────┐ │ ││
│ │ │  │ [Automation 78] [Guardrails 45] [Iteration 82]               │ │ ││
│ │ │  │ [Planning 38]   [Surface 65]    [Rhythm 71]                  │ │ ││
│ │ │  └──────────────────────────────────────────────────────────────┘ │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ │                                                                        ││
│ │ ┌──────────────── VCPSection ───────────────────────────────────────┐ ││
│ │ │  EVOLUTION                                                         │ ││
│ │ │  ┌─────────────────── VCPStatsGrid ─────────────────────────────┐ │ ││
│ │ │  │ [Repo VCPs: 5]    [Vibe Shifts: Steady]    [Dominant: Prompt]│ │ ││
│ │ │  └──────────────────────────────────────────────────────────────┘ │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ │                                                                        ││
│ │ ┌──────────────── VCPSection ───────────────────────────────────────┐ ││
│ │ │  REPO BREAKDOWN                                                    │ ││
│ │ │  ┌─────────────── RepoBreakdownSection ─────────────────────────┐ │ ││
│ │ │  │ repo-alpha ████████████████████ 60%  Prompt Sprinter         │ │ ││
│ │ │  │ repo-beta  █████████ 25%             Orchestrator            │ │ ││
│ │ │  │ repo-gamma █████ 15%                 Reflective Balancer     │ │ ││
│ │ │  └──────────────────────────────────────────────────────────────┘ │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ │                                                                        ││
│ │ ┌──────────────── VCPSection ───────────────────────────────────────┐ ││
│ │ │  ▶ HOW WE GOT THIS (VCPMethodologyLink)                           │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ │                                                                        ││
│ │ ┌──────────────── VCPFooter ────────────────────────────────────────┐ ││
│ │ │  Last updated Jan 21, 2026              [Add repo] [View Vibes]   │ ││
│ │ └────────────────────────────────────────────────────────────────────┘ ││
│ └────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```
