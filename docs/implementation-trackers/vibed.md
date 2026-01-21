# Implementation Tracker: Vibed Narrative Layer

## Context
This tracker accompanies `docs/PRD-vibed.md`. It captures the discrete implementation tasks needed to move from a metrics-heavy analysis tool to the Vibed narrative experience, covering schema, worker, API, UI, and sharing layers.

## Tracker

### F1. Insights & Persona Schema
**Task:** Design `analysis_insights` (and related persona signals) to capture deterministic Vibed outputs.
**Deliverables:**
- [x] Schema defined (longest streak, weekday/time window, chunkiness, persona tag + confidence, tech signals, share template).
- [x] Migration file created for `analysis_insights` (`0005_add_analysis_insights.sql`, `0006_enrich_analysis_insights.sql`).
- [x] Vibe insights table added (`0010_add_vibe_insights.sql`).
- [x] Story for persona evolution + deltas captured (per-job history via `vibe_insights`).
**Blocks:** F2

### F2. Worker & Narrative Pipeline
**Task:** Extend the worker to compute `insights_json`, persist to `analysis_insights`, and feed narratives.
**Deliverables:**
- [x] Insight computation logic implemented + unit tested (streak, persona, chunkiness, tech signal detection) in `@vibed/core`.
- [x] `vibe_insights` row inserted per job with persona/confidence + evidence via Inngest function.
- [x] Updated Narrative LLM prompt referencing insights explicitly.
- [x] Share-card payload generation (colors/text template) included in worker output.
**Depends on:** F1
**Blocks:** F3, F4

### F3. API + Supabase Access
**Task:** Expose insights/share data through REST endpoints and Supabase RLS.
**Deliverables:**
- [x] API endpoints expose insights + key metrics (`/api/analysis/[id]/*`).
- [x] Report includes persona badge, confidence, and share template.
- [x] Supabase policies mirror `analysis_reports` access.
**Depends on:** F2
**Blocks:** F4

### F4. Vibed UX/UI + Share Experience
**Task:** Build the new hero/data UI plus "Show me the data" deep dive and share cards.
**Deliverables:**
- [x] Vibed highlights layer (streak, rhythms, chunkiness, persona archetype line, confidence text).
- [x] Persona timeline/history component showing persona evolution per job/repo.
- [x] Deep dive panel linking to raw metrics/narrative/evidence and persona signals.
- [ ] Share section offering PNG/SVG export plus copyable summary (partially implemented).
- [ ] Light theme/sticker aesthetic consistent with Vibed marketing (ongoing polish).
**Depends on:** F3

### F5. Reflection & Testing
**Task:** Ensure deterministic insight generation, persona detection, and share assets behave as expected.
**Deliverables:**
- [x] Unit tests covering streak, persona classification outcomes, and chunkiness thresholds (31+ tests in `@vibed/core`).
- [ ] Visual regression or storybook story for share cards.
- [x] Documented confidence thresholds + persona hints in `vibe.ts`.
- [x] Workflow documentation updated (`docs/research` links, PRD updates).
**Depends on:** F2, F4

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| F1. Insights & Persona Schema | ✅ Complete | Multiple migrations applied |
| F2. Worker & Narrative Pipeline | ✅ Complete | Inngest + fallback worker |
| F3. API + Supabase Access | ✅ Complete | RLS policies in place |
| F4. Vibed UX/UI + Share Experience | 🟡 Mostly Complete | Share export needs polish |
| F5. Reflection & Testing | 🟡 Mostly Complete | Visual regression pending |

