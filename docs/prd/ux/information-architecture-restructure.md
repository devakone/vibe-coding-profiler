# PRD: Information Architecture Restructure

**Status:** Draft
**Author:** Claude (AI Assistant)
**Date:** 2026-01-21
**Version:** 1.0

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
- Modifying the analysis/job processing logic
- Redesigning the Unified VCP (home page) layout
- Changing the share card system

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
