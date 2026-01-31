# PRD: Share Experience & Metrics Surfacing Improvements

**Status:** Draft
**Author:** AI Assistant (with human direction)
**Priority:** P0 (Core to product value)
**Depends on:** Core analysis pipeline (complete), Profile aggregation (complete)

---

## Problem Statement

Vibe Coding Profile generates rich insights but buries them. The share experience—our primary viral growth mechanism—is hidden behind a collapsible section, and the Unified VCP page has no share functionality at all.

**Current issues:**

1. **Share is hidden on repo analysis page** — buried in a `<details>` section labeled "Share, timeline, and details"
2. **No share on Unified VCP page** — profile aggregation is complete but share is "deferred to P7"
3. **Rich metrics computed but not displayed** — multi-agent signals, tech signals, timing patterns are computed but invisible
4. **LLM narratives unused on profile** — generated and stored but never rendered
5. **Share card is an afterthought** — not the hero experience it should be

**Why this matters:**

The core loop is: Analyze → Discover → Share → Friend sees → Friend analyzes.

If sharing is hard or hidden, the loop breaks. Every friction point in sharing costs us viral growth.

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Share action rate (repo analysis) | Unknown (hidden) | >25% of completed analyses |
| Share action rate (profile) | 0% (no feature) | >15% of profile views |
| Time from analysis complete → share | >60s (hunting for button) | <15s |
| Share card visibility | Below fold, collapsed | Above fold, hero |

---

## Design Principles

### 1. Share is the Product, Not a Feature

The share card isn't something you do after viewing your analysis—it IS the analysis. The card should be designed first, then the rest of the page supports it.

### 2. One Glance, One Story

A share card must tell a complete story in 3 seconds. Persona + 3-4 key metrics + visual identity. No scrolling, no clicking, no reading paragraphs.

### 3. Platform-Native Sharing

Different platforms have different needs:
- Twitter/X: Punchy text + link + optional image
- LinkedIn: Professional framing + insight card
- Instagram: Story-sized visual asset
- Copy link: For Slack, Discord, direct messages

### 4. LLM Enhances, Doesn't Gate

Non-LLM users should get a great experience. LLM adds flavor but isn't required for a compelling share.

---

## Scope

### In Scope

1. **Repo Analysis Page (`/analysis/[jobId]`):**
   - Move share card to hero position (above fold)
   - Surface additional computed metrics
   - Improve LLM vs non-LLM narrative handling

2. **Unified VCP Page (`/` when authenticated):**
   - Add share card for Unified VCP
   - Surface LLM narrative if available
   - Create cohesive single-card story

3. **Share Components:**
   - Extract reusable `<ShareCard>` component
   - Extract reusable `<ShareActions>` component
   - Consistent design language across both pages

4. **Metrics Surfacing:**
   - Multi-agent signals (when detected)
   - Tech signals (top technologies)
   - Enhanced timing patterns

### Out of Scope

- Public profile pages (future feature)
- OG image generation API (future enhancement)
- Team/organization profiles
- Historical profile comparison

---

## Detailed Requirements

### 1. Repo Analysis Page Improvements

#### 1.1 Share Card as Hero

**Current structure:**
```
[Persona Card] → [Metrics Grid] → [Axes] → [Narrative] → [Collapsible: Share, timeline...]
```

**New structure:**
```
[Share Card (hero, full-width, gradient)] → [Share Actions (prominent)] → [Metrics + Axes] → [Narrative] → [Details]
```

**Share Card Design:**

The ShareCard displays **computed metrics** derived from the 6 vibe axes, designed to be engaging and curiosity-inducing:

| Metric | Description | Example Values |
|--------|-------------|----------------|
| **Strongest** | Highest-scoring axis (highLabel + name) | "AI-Heavy Automation", "Structured Planning" |
| **Style** | 2-word descriptor from axis combo | "Fast Builder", "Careful Planner" |
| **Rhythm** | Shipping pattern from bursty/steady | "Bursty", "Steady", "Mixed" |
| **Peak** | Most active time of day | "Mornings", "Afternoons", "Evenings", "Night Owl" |

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [Gradient background: persona colors]                  │    │
│  │                                                         │    │
│  │  MY VIBE CODING STYLE                                   │    │
│  │                                                         │    │
│  │  🎭 The Vibe Prototyper                                │    │
│  │  "You prompt fast, ship fast, and let the code evolve"         │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ [LLM-generated tagline if available]            │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │ AI-Heavy │ │   Fast   │ │  Bursty  │ │Afternoons│   │    │
│  │  │Automaton│ │ Builder  │ │          │ │          │   │    │
│  │  │STRONGEST │ │  STYLE   │ │  RHYTHM  │ │   PEAK   │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │                                                         │    │
│  │  vibed.dev                  3 repos · 1,245 commits    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Copy text] [Copy link] [Download PNG ▾] [Twitter] [LinkedIn]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** These ShareCard metrics are different from the 6 vibe axes displayed in the full VCP detail view. The axes (Automation, Guardrails, Iteration, Planning, Surface, Rhythm) show raw scores; the ShareCard metrics are computed summaries designed for quick scanning and social sharing.

**Requirements:**
- [ ] Share card is the first thing users see after analysis completes
- [ ] Card is designed to look good when screenshotted
- [ ] Share actions are immediately visible, not hidden
- [ ] Download dropdown offers: OG (1200×630), Square (1080×1080), Story (1080×1920)

#### 1.2 Additional Metrics to Surface

Currently displayed: Streak, Peak Day, Focus, Build vs Fix, Scope

**Add these when detected:**

| Metric | When to Show | Display |
|--------|--------------|---------|
| Multi-agent signals | AI co-author count > 0 OR AI trailers detected | "🤖 AI-Assisted: 45% of commits show collaboration patterns" |
| Tech signals | Top 3 tech terms detected | "Your stack: React, TypeScript, Supabase" |
| Night owl / Early bird | Peak hour is before 9am or after 6pm | "🌙 Night Owl: 68% of commits after 6pm" |
| Weekend warrior | >20% of commits on Sat/Sun | "Weekend coder: 24% of your commits" |
| PR workflow style | When artifact traceability data exists | "Orchestrator: High PR coverage, structured workflow" |

**Conditional display logic:**
- Show max 2 additional signals beyond the core 5
- Prioritize signals with strongest values
- Only show if data quality is sufficient

#### 1.3 LLM vs Non-LLM Narrative Handling

**Current state:**
- Shows "Generated with {model}" or "Generated from metrics"
- Regenerate button available
- Error message if LLM fails

**Improved state:**

For LLM narrative:
```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR STORY                                    [AI-generated ✨] │
│                                                                  │
│  "Your commits tell the story of a builder who thinks through   │
│  code. March was intense—23 consecutive days, mostly evenings.  │
│  You started with scaffolding and iterated rapidly..."          │
│                                                                  │
│  [Regenerate]                                                    │
└─────────────────────────────────────────────────────────────────┘
```

For non-LLM narrative:
```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR PATTERNS                                                   │
│                                                                  │
│  Based on 847 commits over 42 active days, you show strong      │
│  Prototyper tendencies. Your longest streak was 23 days in      │
│  March, and you're most productive on Friday afternoons.        │
│                                                                  │
│  [✨ Get AI-enhanced story]  ← Only if user hasn't opted in     │
└─────────────────────────────────────────────────────────────────┘
```

**Requirements:**
- [ ] Visual distinction between LLM and deterministic narratives
- [ ] LLM badge is subtle but present ("AI-generated ✨")
- [ ] Non-LLM users see CTA to opt in (if not already opted in)
- [ ] Both narrative types are valuable and complete

---

### 2. Profile Page Share Card

#### 2.1 Profile Share Card Design

The profile page should have a share card that aggregates across all repos.

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [Gradient background]                                   │    │
│  │                                                         │    │
│  │  MY UNIFIED VCP                                         │    │
│  │                                                         │    │
│  │  🎭 The Vibe Prototyper                                │    │
│  │  "You prompt fast, ship fast, and let the code evolve"         │    │
│  │  High confidence                                        │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │ [LLM-generated tagline if available]            │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │ AI-Heavy │ │   Fast   │ │  Bursty  │ │Afternoons│   │    │
│  │  │Automaton│ │ Builder  │ │          │ │          │   │    │
│  │  │STRONGEST │ │  STYLE   │ │  RHYTHM  │ │   PEAK   │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  │                                                         │    │
│  │  vibed.dev                  5 repos · 2,341 commits    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Copy text] [Copy link] [Download PNG ▾] [Twitter] [LinkedIn]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Requirements:**
- [ ] Profile page has a share card as prominent as repo analysis
- [ ] Card displays new ShareCard metrics: Strongest, Style, Rhythm, Peak
- [ ] Optional LLM-generated tagline row between header and metrics
- [ ] Footer shows `vibed.dev` branding + repo/commit context
- [ ] Same share actions as repo analysis page
- [ ] Card is designed to look good when shared

#### 2.2 Profile Narrative (LLM)

**Current state:** LLM narratives are generated and stored in `user_profiles.narrative_json` but never displayed.

**New state:**

```
┌─────────────────────────────────────────────────────────────────┐
│  INSIGHT                                       [AI-generated ✨] │
│                                                                  │
│  "Across 5 projects, you consistently show Prototyper           │
│  patterns—but with a twist. On acme/dashboard you lean          │
│  heavily into rapid iteration, while on acme/api you show       │
│  more Guardian tendencies. Your style adapts to context."       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**For non-LLM users:**
Use the existing `generateCrossRepoInsight()` function but with improved copy.

**Requirements:**
- [ ] Fetch `narrative_json` from `user_profiles` if it exists
- [ ] Display LLM narrative with badge if available
- [ ] Fall back to deterministic insight if no LLM narrative
- [ ] Offer opt-in CTA for non-LLM users

---

### 3. Reusable Share Components

#### 3.1 `<ShareCard>` Component

A reusable component for both repo analysis and profile pages.

```tsx
interface ShareCardProps {
  variant: 'repo' | 'profile';
  persona: {
    id: string;
    label: string;
    tagline: string;
    confidence: string;
  };
  metrics: Array<{
    label: string;
    value: string;
  }>;
  footer: {
    left: string;  // e.g., "vibecoding.profile"
    right: string; // e.g., "847 commits · 42 days"
  };
  colors: {
    primary: string;
    accent: string;
  };
  avatar?: string;
}
```

**Requirements:**
- [ ] Single component used by both pages
- [ ] Accepts variant prop for minor layout differences
- [ ] Gradient background using persona colors
- [ ] Responsive design (works on mobile)
- [ ] Exportable to PNG/SVG

#### 3.2 `<ShareActions>` Component

Reusable share action bar.

```tsx
interface ShareActionsProps {
  shareUrl: string;
  shareText: string;
  shareTemplate: ShareTemplate;
  onDownload: (format: 'og' | 'square' | 'story') => void;
}
```

**Requirements:**
- [ ] Copy text button with feedback
- [ ] Copy link button with feedback
- [ ] Download dropdown (OG, Square, Story)
- [ ] Social buttons: Twitter, LinkedIn, Facebook, WhatsApp, Reddit
- [ ] Native share (on mobile)
- [ ] Consistent styling across pages

---

### 4. Data Requirements

#### 4.1 Repo Analysis Data

Already available in `AnalysisClient.tsx`:
- `wrapped.streak`, `wrapped.timing`, `wrapped.commits`, `wrapped.chunkiness`
- `shareTemplate` from API
- `metricsJson` with full metrics

**Needs to be added to UI:**
- Multi-agent signals from `insights_json.multi_agent_signals`
- Tech signals from `insights_json.tech_signals`
- Artifact traceability from `insights_json.artifact_traceability`

#### 4.2 Profile Data

Current fetch in `page.tsx`:
```sql
SELECT persona_name, persona_tagline, persona_confidence, 
       total_repos, total_commits, axes_json, repo_personas_json, 
       updated_at, job_ids
FROM user_profiles
WHERE user_id = $1
```

**Needs to be added:**
```sql
SELECT ..., narrative_json, llm_model, llm_key_source
FROM user_profiles
```

---

### 5. Share Template Enhancements

#### 5.1 Profile Share Template

Currently `share_template` only exists for repo analysis. Add profile equivalent.

```typescript
interface ProfileShareTemplate {
  colors: {
    primary: string;
    accent: string;
  };
  headline: string;      // "My Unified VCP"
  personaLabel: string;  // "The Vibe Prototyper"
  tagline: string;       // "You prompt fast, ship fast..."
  confidence: string;    // "High confidence"
  stats: {
    repos: number;
    commits: number;
    clarity: number;
  };
  topAxes: Array<{
    name: string;
    score: number;
  }>;
}
```

#### 5.2 Share Image Generation

Enhance `createShareSvg` to support profile cards:

```typescript
function createShareSvg(
  template: ShareTemplate | ProfileShareTemplate,
  format: ShareFormat,
  variant: 'repo' | 'profile'
): string
```

---

## Implementation Plan

### Phase 1: Share Card Promotion (Repo Analysis)

**Goal:** Make share the hero on repo analysis page

| Task | Effort | Priority |
|------|--------|----------|
| Extract `<ShareCard>` component from inline code | M | P0 |
| Extract `<ShareActions>` component | S | P0 |
| Move share card to top of results | S | P0 |
| Make share actions visible by default (not collapsed) | S | P0 |
| Update page layout hierarchy | M | P0 |

**Deliverable:** Share card is first thing users see on analysis page

### Phase 2: Additional Metrics Surfacing

**Goal:** Show more of the computed insights

| Task | Effort | Priority |
|------|--------|----------|
| Add multi-agent signals display | M | P1 |
| Add tech signals display | S | P1 |
| Add timing personality (night owl, etc.) | S | P1 |
| Conditional display logic | M | P1 |

**Deliverable:** Repo analysis shows 2-3 additional contextual signals

### Phase 3: Profile Share Card

**Goal:** Profile page has share experience parity with repo analysis

| Task | Effort | Priority |
|------|--------|----------|
| Create profile share template type | S | P0 |
| Add share card to profile page | M | P0 |
| Fetch and display LLM narrative | M | P1 |
| Profile share image generation | M | P1 |
| Add share actions to profile | S | P0 |

**Deliverable:** Profile page has shareable card with download/copy/social

### Phase 4: LLM Narrative Polish

**Goal:** Consistent, attractive LLM handling across both pages

| Task | Effort | Priority |
|------|--------|----------|
| Visual differentiation for LLM vs deterministic | S | P1 |
| Opt-in CTA for non-LLM users | S | P2 |
| Improved non-LLM narrative copy | S | P2 |

**Deliverable:** Both LLM and non-LLM users get polished narratives

---

## UI Mockups

### Repo Analysis Page (New Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to profile                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [SHARE CARD - GRADIENT BACKGROUND]                       │  │
│  │                                                           │  │
│  │  MY VIBE CODING STYLE            [avatar if available]   │  │
│  │                                                           │  │
│  │  🎭 The Vibe Prototyper                                  │  │
│  │  "You prompt fast, ship fast, and let the code evolve"           │  │
│  │  78% confidence                                           │  │
│  │                                                           │  │
│  │  [Optional LLM tagline row]                              │  │
│  │                                                           │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │Automaton│ │  Fast   │ │ Bursty  │ │Afternons│        │  │
│  │  │   78    │ │ Builder │ │         │ │         │        │  │
│  │  │STRONGEST│ │  STYLE  │ │  RHYTHM │ │  PEAK   │        │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │  │
│  │                                                           │  │
│  │  vibed.dev                  1 repo · 847 commits         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [📋 Copy] [🔗 Link] [⬇️ Download ▾] [𝕏] [in] [f] [Share] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ADDITIONAL SIGNALS                                              │
│                                                                  │
│  🤖 AI-Assisted: 45% of commits show AI collaboration           │
│  🌙 Night Owl: 68% of commits after 6pm                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  YOUR AXES                                                       │
│  [6 axis cards with scores]                                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  YOUR STORY                                    [AI-generated ✨] │
│  [Narrative text]                                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ▸ Timeline, metrics, and details                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Profile Page (New Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR UNIFIED VCP                          [Add repo] [VCPs] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [SHARE CARD - GRADIENT BACKGROUND]                       │  │
│  │                                                           │  │
│  │  MY UNIFIED VCP                                  │  │
│  │                                                           │  │
│  │  🎭 The Vibe Prototyper                                  │  │
│  │  "You prompt fast, ship fast, and let the code evolve"           │  │
│  │  High confidence                                          │  │
│  │                                                           │  │
│  │  [Optional LLM tagline row]                              │  │
│  │                                                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ AI-Heavy │ │   Fast   │ │  Bursty  │ │Afternoons│    │  │
│  │  │    72    │ │ Builder  │ │          │ │          │    │  │
│  │  │STRONGEST │ │  STYLE   │ │  RHYTHM  │ │   PEAK   │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │                                                           │  │
│  │  vibed.dev                  5 repos · 2,341 commits      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [📋 Copy] [🔗 Link] [⬇️ Download ▾] [𝕏] [in] [f] [Share] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  INSIGHT                                       [AI-generated ✨] │
│                                                                  │
│  "Across 5 projects, you consistently show Prototyper           │
│  patterns. On acme/dashboard you lean into rapid iteration,     │
│  while on acme/api you show more Guardian tendencies."          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  YOUR AXES                                                       │
│  [6 axis cards with scores and bars]                            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  YOUR REPOS                                                      │
│  [Repo breakdown with per-repo personas]                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ▸ How we calculated this                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Open Questions

1. **Should share card include repo name?** For repo analysis, showing the repo name makes the card less portable (user might not want to share which repo). Consider making it optional or using generic "my project" language.

2. **Profile share: include top repo?** Should the profile share card mention the dominant repo, or stay fully aggregated?

3. **Social platform priority?** Which platforms should be most prominent? Twitter/X and LinkedIn seem highest priority for developers.

4. **Share tracking?** Should we track share actions for analytics? Need to balance insights with privacy.

5. **Public profiles?** This PRD focuses on owner-facing share. Public profile pages (viewable without auth) are a future feature that would build on this work.

---

## Appendix: Current vs. Proposed Component Structure

### Current (Inline)

```
apps/web/src/app/analysis/[jobId]/AnalysisClient.tsx
├── Share card rendered inline (~100 lines)
├── Share actions rendered inline (~150 lines)
├── createShareSvg() function (~80 lines)
└── All share state managed locally
```

### Proposed (Componentized)

```
apps/web/src/components/share/
├── ShareCard.tsx           # Reusable card component
├── ShareActions.tsx        # Share button bar
├── ShareImageGenerator.ts  # SVG/PNG generation
├── types.ts                # Shared types
└── index.ts                # Exports

apps/web/src/app/analysis/[jobId]/AnalysisClient.tsx
└── Uses <ShareCard> and <ShareActions>

apps/web/src/app/page.tsx
└── Uses <ShareCard> and <ShareActions>
```

---

## Appendix B: ShareCard Metrics Specification

### Overview

The ShareCard displays **4 computed metrics** derived from the 6 vibe axes. These metrics are designed to be:
- **Engaging**: Spark curiosity and conversation
- **Glanceable**: Understood in < 3 seconds
- **Unique**: Reflect individual vibe coding style, not generic stats

### Metric Definitions

| Metric | Label | Computation | Example Output |
|--------|-------|-------------|----------------|
| **Strongest** | `STRONGEST` | Highest-scoring axis (highLabel + name) | "AI-Heavy Automation" |
| **Style** | `STYLE` | 2-word descriptor from axis combo | "Fast Builder" |
| **Rhythm** | `RHYTHM` | Shipping pattern from `shipping_rhythm` axis | "Bursty", "Steady", "Mixed" |
| **Peak** | `PEAK` | Most active time of day (from commit timing) | "Mornings", "Afternoons", "Evenings", "Night Owl" |

### Style Descriptor Logic

The "Style" metric combines the top 2 axes to generate a 2-word descriptor:

| Top Axis | Secondary Axis | Style Descriptor |
|----------|----------------|------------------|
| automation_heaviness | iteration_loop_intensity | "Fast Builder" |
| automation_heaviness | planning_signal | "Prompt Architect" |
| guardrail_strength | planning_signal | "Careful Planner" |
| planning_signal | surface_area_per_change | "Methodical Architect" |
| iteration_loop_intensity | guardrail_strength | "Iterative Validator" |
| *any other* | *any other* | "Balanced Builder" |

### Rhythm Label Logic

| Shipping Rhythm Score | Label |
|-----------------------|-------|
| >= 65 | "Bursty" |
| <= 35 | "Steady" |
| 36-64 | "Mixed" |

### Peak Time Logic

Based on the most common commit hour:
| Hour Range | Label |
|------------|-------|
| 5am - 11am | "Mornings" |
| 12pm - 4pm | "Afternoons" |
| 5pm - 8pm | "Evenings" |
| 9pm - 4am | "Night Owl" |

### Implementation

These metrics are computed in `apps/web/src/lib/vcp/metrics.ts`:

```typescript
import { computeShareCardMetrics } from "@/lib/vcp/metrics";

const metrics = computeShareCardMetrics(axes);
// Returns: { strongest: "AI-Heavy Automation", style: "Fast Builder", rhythm: "Bursty", peak: "Afternoons" }
```

### Footer Content

The ShareCard footer displays:
- **Left**: `vibed.dev` (brand)
- **Right**: `{N} repos · {M} commits` (context)

---

*This PRD focuses on the share experience layer. See [`PRD.md`](../core/PRD.md) for core analysis and [`PRD-vibed-ux.md`](./PRD-vibed-ux.md) for overall UX direction.*
