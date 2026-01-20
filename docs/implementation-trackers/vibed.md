# Implementation Tracker: Vibed Narrative Layer

## Context
This tracker accompanies `docs/PRD-vibed.md`. It captures the discrete implementation tasks needed to move Bolokono from a metrics-heavy analysis tool to the Vibed narrative experience, covering schema, worker, API, UI, and sharing layers.

## Tracker

### F1. Insights & Persona Schema
**Task:** Design `analysis_insights` (and related persona signals) to capture deterministic Vibed outputs.
**Deliverables:**
- [ ] Schema defined (longest streak, weekday/time window, chunkiness, persona tag + confidence, tech signals, share template).
- [ ] Migration file created for `analysis_insights`.
- [ ] Story for persona evolution + deltas captured (per-job history).
**Blocks:** F2

### F2. Worker & Narrative Pipeline
**Task:** Extend the worker to compute `insights_json`, persist to `analysis_insights`, and feed narratives.
**Deliverables:**
- [ ] Insight computation logic implemented + unit tested (streak, persona, chunkiness, tech signal detection).
- [ ] `analysis_insights` row inserted per job with persona/confidence + evidence.
- [ ] Updated Narrative LLM prompt referencing insights explicitly.
- [ ] Share-card payload generation (colors/text template) included in worker output.
**Depends on:** F1
**Blocks:** F3, F4

### F3. API + Supabase Access
**Task:** Expose insights/share data through REST endpoints and Supabase RLS.
**Deliverables:**
- [ ] `GET /api/analysis/:jobId/insights` returns `analysis_insights` + key metrics.
- [ ] `GET /api/analysis/:jobId/report` includes persona badge, confidence, and share template.
- [ ] (Optional) `POST /api/analysis/:jobId/share` triggers share card export or return template data.
- [ ] Supabase policies mirror `analysis_reports` access.
**Depends on:** F2
**Blocks:** F4

### F4. Vibed UX/UI + Share Experience
**Task:** Build the new hero/data UI plus “Show me the data” deep dive and share cards.
**Deliverables:**
- [ ] Vibed highlights layer (streak, rhythms, chunkiness, persona archetype line, confidence text).
- [ ] Share section offering PNG/SVG export plus copyable summary, reusing precomputed templates.
- [ ] Persona timeline/history component showing persona evolution per job/repo.
- [ ] Deep dive panel linking to raw metrics/narrative/evidence and persona signals.
- [ ] Light theme/sticker aesthetic consistent with Vibed marketing.
**Depends on:** F3

### F5. Reflection & Testing
**Task:** Ensure deterministic insight generation, persona detection, and share assets behave as expected.
**Deliverables:**
- [ ] Unit tests covering streak, persona classification outcomes, and chunkiness thresholds.
- [ ] Visual regression or storybook story for share cards.
- [ ] Documented confidence thresholds + persona hints for designers.
- [ ] Workflow documentation updated (`docs/research` links, PRD updates).
**Depends on:** F2, F4

