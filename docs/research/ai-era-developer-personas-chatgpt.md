<!-- draft: ChatGPT AI-era developer personas research -->

# AI-Era Developer Personas (ChatGPT Research)

## Overview

ChatGPT identifies six primary personas emerging as AI tools enter the development workflow. Each persona is described with goals, AI usage patterns, guardrails, observable git signals, and confidence levels. These profiles complement the Perplexity research (see `ai-era-coding-personas.md`) and focus more explicitly on attitude toward AI (adoption spectrum) while still referencing the idea of “vibe coding” vs. disciplined workflows.

## Personas

1. **The Cautious Traditionalist** – AI refusers or heavy guardrails; spec-driven, slow commits, extensive docs and reviews, rarely uses AI in production.
2. **The Pragmatic Augmenter** – AI-assisted engineer who keeps human specs/tests upfront; guardrails, incremental commits, evidence of review, uses AI for boilerplate/tests.
3. **The Vibe Prototyper** – “Vibe” coding persona; rapid prompts, large scaffold commits, minimal guardrails, iterative patches, exploratory prototypes.
4. **The Autonomous AI Orchestrator** – Agentic mode; delegates multi-file tasks to agents, large bursts of additions, agent config files, fewer mid-step reviews.
5. **The Rapid Risk-Taker (Cowboy Coder)** – Velocity-focused, ad-hoc prompts, occasional AI snippets; commits straight to main, odd-hour pushes, frequent hotfixes.
6. **(Implied) The Reflective Balancer** – Tool aims to surface insights for the middle ground (Pragmatists, Vibe coders maturing) with metrics that highlight strengths and pitfalls.

## Shared Insight

- Reflective tooling helps Pragmatic Augmenters and Vibe Prototypers balance speed with quality; it may gently nudge Rapid Risk-Takers and reassure Cautious Traditionalists.
- Observable signals (commit size, test timing, AI config files, burst patterns) map closely to the Perplexity personas.
- The research emphasizes “vibe coding” for creativity and “spect-driven engineering” for governance, reinforcing Bolokono’s narrative tension between autonomy and craftsmanship.

## Confidence & Evidence

- Most personas are high confidence (Traditionalist, Pragmatic, Vibe, Agentic). Rapid Risk-Taker is medium confidence due to overlap with existing cowboy archetypes.
- Sources include Addy Osmani, Charlie Gerard, GitClear, Cursor docs, and community anecdotes highlighting both successes and cautionary tales.
