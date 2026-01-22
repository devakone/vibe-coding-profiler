<!-- Vibe Coding Profile PRD: product definition for persona insights, share layer, api + worker -->

# PRD: Vibe Coding Profile Narrative Layer

**Status:** Mostly Implemented — See `docs/implementation-trackers/vibed.md` for details

> **Reference Documentation:** For technical details on how analysis works, see:
> - [How Vibe Coding Profile Works](./how-vibed-works.md) — Product-friendly overview
> - [Vibe Coding Profile Analysis Pipeline](./architecture/vibed-analysis-pipeline.md) — Technical architecture

## 1. Context & Vision

Bolokono now surfaces “vibe coding profiles” through the Vibe Coding Profile experience: a playful, reflective interpretation of commit history modeled on Spotify Wrapped. The goal is to make craftsmanship visible—narrative cards first, data second—while preserving trust through evidence-backed insights. This PRD defines the UX, UI, API, database, and worker investments required to deliver deterministic insights, persona-aware storytelling, and share-ready outputs.

## 2. Product Goals

1. **Craftsmanship-first narrative**: Provide a high-level Vibe Coding Profile layer that highlights streaks, preferred rhythms, chunkiness, persona clues, and confidence-fueled observations.
2. **Deterministic insights**: Move Wrapped computation server-side so the client only renders consistent cards regardless of locale or UI refactors.
3. **Share & reflect**: Enable share cards (PNG/SVG) and copy-ready summaries tied to the same deterministic data.
4. **Evidence & depth**: Keep a deep-dive layer with raw metrics, commit samples, evidence SHAs, and persona signal explanations for power users.
5. **Persona-aware confidence**: Surface persona tags + confidence metadata so insights stay observational (“You tend to…”, “Often, etc.”).

## 3. Supporting Research & Attribution

### External Sources
- **"Vibe coding"**: Term coined by [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383) (February 2025), [Collins Dictionary Word of the Year 2025](https://en.wikipedia.org/wiki/Vibe_coding).
- **Orchestrator vs Conductor patterns**: [Addy Osmani's agentic coding research](https://addyosmani.com/blog/future-agentic-coding/).
- **Code analytics**: [GitClear developer productivity studies](https://www.gitclear.com/).
- **Copilot workflows**: [GitHub Copilot documentation](https://docs.github.com/en/copilot).

### Internal Research
- [AI-Era Coding Personas](./research/ai-era-coding-personas.md)
- [AI-Era Developer Personas (ChatGPT synthesis)](./research/ai-era-developer-personas-chatgpt.md)
- [Persona Insight Synthesis](./research/persona-insight-synthesis.md)

### Personas Detected
Spec-Driven Architect, Test-First Validator, Vibe Prototyper, Agent Orchestrator, Hands-On Debugger, Rapid Risk-Taker, Reflective Balancer. Insights emphasize craft behavior, guardrails, and risk tolerance.

## 4. Metrics & Signals to Capture

### From commits/analysis tables
- Longest streak (days between consecutive commits with <24h gap)
- Day-of-week frequency + time-window heatmap
- Fix-before-feature vs feature-only ratios, fix-after-feature sequences, fixup count
- Chunkiness (files_changed, lines per commit distribution)
- Early build patterns (category_first_occurrence, tech signals)
- Burstiness/inter-commit timing
- Confidence (data_quality_score, commit count tier)
- Persona signals: tests-before-code, doc presence, agent config files, commit scope, refactor ratio
- Narrative evidence references (SHAs, metrics)

### New tech signals
- GitHub language breakdown (via repo metadata API or extensions)
- Presence of AI config files (e.g. `.cursorrules`)
- Folder/doc markers (`ARCHITECTURE.md`, `.adr-dir/`, `tests/` structure)

## 5. Experience Requirements

### Vibe Coding Profile Highlights layer (UX)
- Hero cards: “Your longest coding streak”, “Friday evenings are your sweet spot”, “Fixes are your most common commits”, “You deliver X features for every fix”, “Chunky commit average” etc.
- Each card shows persona-aligned service message + confidence level + evidence reference metadata (metric + sample SHA).
- Provide filters for time range (Last 30 days, 90 days, Year, All time).
- Share section: generate share cards (PNG/SVG) plus copyable summary text; underlying data identical to VCP cards; include persona badge/confidence.
- Embed “Show me the data” toggle to reveal deep dive table (timeline, metrics, evidence, persona signals).

### Deep Dive layer
- Table of metrics from `analysis_metrics.metrics_json`.
- Timeline view with build categories + commit size/behavior.
- Evidence panel listing SHAs + links, matched criteria, narratives referencing persona insights.
- Persona card describing detected persona, confidence, and key signals (explain how measurement determined).

## 6. API & Worker Changes

### API
- Add new endpoint `GET /api/analysis/:jobId/insights` returning `analysis_insights` content plus metric summary (streak, persona, tech signals).
- Extend `GET /api/analysis/:jobId/report` to include persona metadata and share card data (colors, wording templates).
- Provide `POST /api/analysis/:jobId/share` to trigger share card generation (or use precomputed template + bundle).
- Ensure Supabase data layer uses RLS for insights similar to reports/metrics.

### Worker
- Compute `insights_json` during job processing with:
  * deterministically derived values (streaks, weekdays, time windows, chunkiness classification, fix ratios, persona tags + confidence).
  * references to evidence SHAs and metric values.
  * tech signal summaries (languages, config hints).
  * natural-language claim templates with placeholders (for share cards) but no final copy—copy generated by UI per persona.
- Persist to new table `analysis_insights` (job_id PK, insights_json JSONB, version text, generated_at timestamp).
- Link `insights_json` into narrative generation (LLM prompt references these insights explicitly).
- Provide share-card payload (colors, icons, persona badge) for quick front-end rendering.
- Add automated tests for deterministic insight computation (unit test for streak, persona detection, chunkiness).

## 7. Database Changes

### New table `analysis_insights`
- Columns: `id` uuid PK, `job_id` uuid FK unique, `insights_json` jsonb not null, `persona_id` text, `confidence` text, `tech_signals` jsonb, `share_template` jsonb, `version` text, `generated_at` timestamptz default now().
- Add indexes on `job_id` and `persona_id` for querying per user.
- RLS policies paralleling `analysis_reports` (owner-only).
- Provide migrations for data backfill (empty for now).

### Optionally augment `analysis_metrics`
- Add fields capturing derived signals (e.g., `longest_streak`, `time_window_summary`, `tech_breakdown`) to avoid recomputation outside insights table.
- Alternatively store computed values solely in `analysis_insights` to keep metrics immutable.

## 8. Implementation Plan

1. Finalize insights schema and persona classifier (per `persona-insight-synthesis` document).
2. Extend worker to compute insights, persist to new table, and feed narrative generation.
3. Update API routes + Supabase RLS to expose insights and share payloads.
4. Build Vibe Coding Profile UI (high-level cards, share layer, toggles for data). Ensure persona confidence badges/wording.
5. Expand documentation (research, persona map) and implement tests for deterministic logic + share card assets.
6. Optional: add share card export job (server side) or pre-render from reusable component.

## 9. Success Criteria

- >95% of analyses produce insights_json with persona + confidence.
- Share cards render without additional worker parse (client uses precomputed template).
- Narrative UI displays share layer + deep dive within the same time ranges with no data drift.
- RLS confirms only job owners access insights.
- Product messaging aligns with research language (craftmanship, reflection, confidence).

## 10. Open Questions

1. Should persona detection be exclusive (one persona per job) or multi-label? (default: one primary plus secondary hints).
2. What’s the versioning strategy for `insights_json`? (consider  semantic version like `v1.0` to handle template evolution).
3. Share cards: server-side PNG vs. client-side SVG? (default start with client template; worker supplies colors/text).
4. How do we determine persona confidence thresholds using commit counts and metrics? Need thresholds defined before worker change.

