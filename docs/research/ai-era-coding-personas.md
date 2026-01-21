<!-- draft: AI-Era Coding Personas research summary -->

# AI-Era Coding Personas: Research-Backed Classification

## Executive Summary

Based on deep research into developer practices, tool adoption patterns, and public engineering discussions, I’ve identified six distinct coding personas emerging as developers adopt AI helpers. Each persona differs in its planning approach, AI mode, observable git signals, and risk tolerance. The goal is to keep claims grounded in evidence (engineering blogs, academic papers, tool docs, GitClear 2024 data) so Bolokono can speak to each profile honestly.

## Persona Summaries

1. **The Spec-Driven Architect** – Plans before coding, values design docs, ADRs, and test-first discipline. Manifested by deliberate, multi-file commits tied to documentation and low refactor churn.
2. **The Test-First Validator** – Writes tests first and lets AI satisfy them, visible through high test-to-code ratio commits, coverage-first PRs, and TDD loops.
3. **The Iterative Prototyper (Vibe Coder)** – Ships fast, iterates constantly, commits tiny changes, rarely refactors early, and relies on exploratory AI prompts.
4. **The Multi-Agent Orchestrator** – Spins up parallel agents/worktrees for large refactors, coordinates commits, and aggregates diffs across modules.
5. **The Specialist Consultant** – Assigns AI roles (architect, implementer, reviewer) and sequences design → tests → code explicitly, with rich documentation and ordered commits.
6. **The Infrastructure Architect** – Enforces governance via architectural rules, ADRs, and AI validations (CodeQL/Qodo), especially in microservice environments.
7. **The Hands-On Debugger (Bonus)** – Uses AI for rapid triage and fixes; commits spike during debugging with targeted scope and regression tests.

## Data Model Reality

Current Wrapped insights are still computed client-side using:
- `analysis_metrics`: `events_json`, `metrics_json`
- `analysis_reports`: `narrative_json`, `evidence_json`, matched criteria
- commit metadata (timestamps, messages, additions/deletions, files changed)

The UI is doing interpretation work. This holds short-term but should move to the worker soon.

## Next Product Steps

1. **Insights table** – Add `analysis_insights` (job_id, `insights_json`, version, generated_at) for deterministic outputs (longest streak, weekday heatmap, chunkiness, early pattern, confidence language).
2. **Worker-side insight computation** – Move Wrapped logic out of the client to keep UI render-only and reproducible.
3. **Tech signals** – Collect GitHub language breakdowns or extension counts (no file contents) so we can say “TypeScript-heavy” vs. “backend focus”.
4. **Craftsmanship language** – Focus on how work unfolds (stabilize before expand, revisit quickly after shipping) using fix-after-feature, inter-commit timing, and refactor density.
5. **Confidence language** – Each insight should include claim + confidence + evidence refs (`insight { claim, confidence, evidence_refs[] }`) to stay observational and probabilistic.
6. **Theming** – Keep the playful “Vibed” theme for Wrapped/analysis while leaving other routes neutral; later consider toggles or recap pages.

## Signals for Classification

- **High confidence**: tests precede code (Validator), detailed ADR commits (Architect), high-frequency single-concern commits (Prototyper), coordinated multi-file refactors (Orchestrator).
- **Medium**: repo docs aligning with structure, high refactor ratio, regression tests after fixes.
- **Low**: sparse tests or high duplicate code (context-dependent).

## Research Sources

Primary sources:

- [Addy Osmani: The Future of Agentic Coding](https://addyosmani.com/blog/future-agentic-coding/) — Orchestrator vs conductor patterns
- [Andrej Karpathy's "Vibe Coding" tweet](https://x.com/karpathy/status/1886192184808149383) — Origin of the term (Feb 2025)
- [GitClear 2024 Code Quality Report](https://www.gitclear.com/) — Code churn and developer productivity metrics
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot) — Co-author attribution, agent workflows
- [Cursor Documentation](https://cursor.com/docs) — AI-assisted development patterns
- [Vibe Coding Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding) — Collins Dictionary Word of the Year 2025
- Academic TDD benchmarks (arxiv 2025)
- Developer persona frameworks from humanwhocodes.com

## Final Thought

Bolokono has shifted toward narrative, craftsmanship-aware insight. The next priorities are formalizing that insight data, moving computation to the worker, and enriching signals (languages, confidence, craft observations). The research above is ready to inform persona definitions, metric design, share-layer copy, and product storytelling.
