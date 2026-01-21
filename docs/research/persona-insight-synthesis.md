<!-- synthesis: persona research cross-reference -->

# Persona Research Synthesis & Data Implications

This document cross-references the Perplexity-based `AI-Era Coding Personas` research and the ChatGPT-derived `AI-Era Developer Personas` research. Together they provide:

1. A unified persona taxonomy for Bolokono.
2. Product signals we want to surface in the “Vibe Coding Profile” narrative layer.
3. Architectural guidance for what data to capture and how to compute metrics.

## Unified Persona Taxonomy

| Persona | Origin | Key Signals | Bolokono relevance |
|---|---|---|---|
| Spec-Driven Architect / Cautious Traditionalist | Both docs | ADRs, design docs before code, deliberate commits, sparse AI metadata | Highlight craftsmanship, low-risk builds, “stabilize before expanding” insights. |
| Test-First Validator / Pragmatic Augmenter | Both | Tests before code, high test-to-code ratio, incremental commits, guardrails | Show TDD adherence, highlight guardrail success metrics, share-card for discipline. |
| Iterative Prototyper / Vibe Coder | Both | High-frequency small commits, large initial scaffolds, minimal docs, exploratory prompts | Provide “most daring streaks”, “Friday evenings were ripe for prototypes”. |
| Multi-Agent Orchestrator / Autonomous AI Orchestrator | Perplexity / ChatGPT | Multi-file bursts, agent config files, parallel workflows | Surface “agentic bursts vs review cycles” and highlight evidence refs. |
| Specialist Consultant | Perplexity | Role sequencing, docs/tests-code order | Use for “role-specific insight cards” and persona-aware metric presentation. |
| Infrastructure Architect | Perplexity | Governance docs, consistent patterns, cross-service rules | Use for compliance/craft insight layers. |
| Hands-On Debugger / Rapid Risk Taker | Perplexity / ChatGPT | Hotfix spikes, direct commits to main, odd-hour pushes | Show “fix ratio” vs “velocity” and confidence disclaimers. |

## Product Insights (Vibe Coding Profile Layer)

- **Narrative cards** should mention persona-aligned observations (e.g., “You lay down tests before code, which matches your Validator rhythm,” “Friday evening prototypes keep your creative streak alive”).
- **Confidence language** sourced from persona confidence levels—high-confidence personas can have bolder observations; medium ones are framed probabilistically.
- **Sharing & prompts**: share cards highlight signals like “Longest streak,” “Most active weekday,” “Fixes vs features,” referencing both research sets that value reflective feedback for Pragmatists and Vibe coders.
- **Persona-aware prompts**: prompt the user to reflect on their persona (e.g., “Are you balancing vibe exploration with guardrails?”).

## Architectural / Data Implications

Source data to capture:
- `analysis_metrics.metrics_json` and `events_json` (commit rhythm, burstiness, file counts).
- `analysis_reports.narrative_json` + `evidence_json` (LLM claims, matched criteria).
- GitHub metadata (languages, repo structure, AI config files like `.cursorrules`).
- Derived tech signals (language/extension breakdown, commit tags referencing ADRs/tests).

Next steps (confirmed by both docs):

1. **Insights table (`analysis_insights`)** – Worker emits deterministic JSON (longest streaks, weekday heatmaps, chunkiness, persona affinity, confidence, evidence refs) so UI is render-only.
2. **Move Wrapped insight computation server-side** – worker merges commit data + persona classifiers, outputs `insights_json`/confidence; UI just renders cards and share layers.
3. **Capture tech signals** – fetch GitHub language stats or extension counts (no file contents) to report “TypeScript-heavy” or “Backend vs Frontend shift” per persona needs.
4. **Craftmanship metrics** – fix-after-feature ratios, refactor density, time-to-next-commit to describe “how work unfolds” (Perplexity recommendation).
5. **Persona classification** – use signals (tests timing, commit size, docs presence, agent configs, commit frequency) to tag job insights with a primary persona and highlight in narratives (both research sets value persona-aware feedback).

## Closing Thought

Both research streams converge on the idea that Bolokono should celebrate diverse craftsmanship paths while grounding every claim in observable data. Implementing the data captures above keeps the product aligned with this vision—narrative cards for the Vibe Coding Profile layer, deep-dive evidence for trust, and architecture-level JSON that future APIs or share cards can reuse.
