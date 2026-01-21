# How Vibed Coding Works

> **Last Updated:** January 2026  
> **Maintainer:** Update this document when analysis logic, personas, or metrics change.

Vibed Coding analyzes your git history to reveal your coding style and patterns. Think of it as "Spotify Wrapped for vibe coders." We look at *how* you build, not *what* you build.

---

## The Big Picture

```
Your Git History → Analysis → Vibe Profile
     ↓                ↓            ↓
  Commits         Metrics      Persona + Insights
  PRs             Axes         Narrative
  Timing          Scores       Share Cards
```

**Key Principle:** Vibed is *observational, not judgmental*. We detect patterns, not quality. Every coding style has strengths.

---

## What We Analyze

### Data Sources (All from GitHub API)

| Source | What We Extract | Privacy Note |
|--------|-----------------|--------------|
| **Commits** | Timestamps, file counts, additions/deletions, message structure | We never store or analyze code content |
| **Pull Requests** | Merge methods, checklists, issue links, templates | Body text parsed for structure only |
| **File Paths** | Subsystem classification (ui, api, tests, etc.) | Paths only, no file contents |

### What We Don't Access
- Source code contents
- Private comments or discussions
- IDE activity or local history
- Unpushed commits

---

## The Analysis Pipeline

### Step 1: Fetch Commits
We retrieve up to 300 commits from your repository via GitHub API, sampling evenly across the repo's lifetime to capture patterns from start to present.

### Step 2: Filter Automation
Bot commits (dependabot, renovate, release-please, etc.) are automatically filtered out so your analysis reflects *your* work, not automation.

### Step 3: Compute Metrics
We calculate 25+ metrics across several dimensions:

**Volume & Timing**
- Total commits, additions, deletions
- Active days vs span days
- Commit frequency patterns

**Rhythm & Burstiness**
- Hours between commits (median, p90)
- Burstiness score (-1 = steady, +1 = bursty)
- Peak coding hours and days

**Commit Patterns**
- Size distribution (p50, p90)
- Conventional commit ratio
- Fix-after-feature sequences

**Build Categories**
- Classification: feature, fix, test, docs, infra, refactor, etc.
- Category distribution and first-occurrence order

### Step 4: Compute Vibe Axes
Six deterministic axes (0-100 scores) capture your workflow style:

| Axis | What It Measures |
|------|------------------|
| **Automation Heaviness** | How "agentic" your workflow looks: large commits, chunky PRs |
| **Guardrail Strength** | How much you stabilize with tests, CI, docs early |
| **Iteration Loop Intensity** | How often you do rapid fix cycles |
| **Planning Signal** | Structured commits, issue linking, docs-first patterns |
| **Surface Area per Change** | How many subsystems you touch per work session |
| **Shipping Rhythm** | Bursty vs steady shipping patterns |

### Step 5: Detect Persona
Based on your axes, we match you to one of 7 Vibe Personas:

| Persona | Signature Pattern |
|---------|-------------------|
| **Vibe Prototyper** | High automation, rapid iteration, minimal guardrails |
| **Test-First Validator** | Strong guardrails with automation |
| **Spec-Driven Architect** | High planning signal, early guardrails |
| **Agent Orchestrator** | Wide surface area, high automation |
| **Hands-On Debugger** | Intense fix loops, fast shipping |
| **Rapid Risk-Taker** | High automation, low guardrails, fast shipping |
| **Reflective Balancer** | Balanced across all axes (fallback) |

### Step 6: Generate Insights
Deterministic insights are computed server-side:

- **Longest Streak:** Consecutive days with commits
- **Peak Window:** When you code most (mornings, afternoons, evenings, late nights)
- **Chunkiness:** Slicer (focused), Mixer (balanced), or Chunker (wide scope)
- **Tech Signals:** Keywords detected in commit messages
- **Multi-Agent Signals:** Co-author trailers, AI attribution patterns

### Step 7: LLM Narrative (Optional)
If LLM is configured, we generate a human-readable narrative about your *engineering patterns*, never about what you built, only how you built it.

**Privacy:** The LLM only sees metadata (timestamps, categories, metrics), never commit message content or code.

---

## Profile Aggregation

### Single Repo Analysis
One repo gives you a snapshot of your coding style for that project.

### Multi-Repo User Profile
When you analyze multiple repos, Vibed aggregates them into a single **User Profile**:

```
Repo A Analysis  ─┐
Repo B Analysis  ─┼─→ Aggregated User Profile
Repo C Analysis  ─┘
```

**Aggregation Logic:**
- Metrics are weighted by commit count (larger repos contribute more)
- Axes are averaged across repos
- Persona is re-detected from aggregated axes
- Confidence increases with more repos (3+ repos = stronger signal)

---

## Confidence Levels

Every insight includes a confidence level:

| Level | Meaning |
|-------|---------|
| **High** | 200+ commits or 15+ PRs, good data quality |
| **Medium** | 80+ commits or 6+ PRs |
| **Low** | Limited data, take insights with a grain of salt |

---

## What Vibed Is NOT

- **Not a productivity tracker:** We don't measure "good" vs "bad"
- **Not a code quality tool:** We don't analyze code, just patterns
- **Not AI detection:** We detect workflow patterns, not AI usage
- **Not surveillance:** You control what repos to analyze, data is yours

---

## Privacy Principles

1. **No code access:** We only read metadata from GitHub API
2. **No message content to LLM:** Commit messages are classified locally, never sent to AI
3. **User-controlled:** You choose which repos to analyze
4. **Deletable:** Disconnect a repo and all analysis data is removed

---

## Attribution

Vibed Coding builds on research and concepts from the developer tooling community:

- **"Vibe coding"**: Term coined by [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383) in February 2025, later named [Collins Dictionary Word of the Year 2025](https://en.wikipedia.org/wiki/Vibe_coding).
- **Orchestrator vs Conductor patterns**: From [Addy Osmani's work on agentic coding](https://addyosmani.com/blog/future-agentic-coding/).
- **Code analytics research**: Informed by [GitClear's developer productivity studies](https://www.gitclear.com/).
- **Persona taxonomy**: Original synthesis drawing from academic TDD research, [GitHub Copilot documentation](https://docs.github.com/en/copilot), and developer workflow studies.

Our internal research documents are available in [docs/research/](./research/).

---

## Related Documentation

- [Technical Architecture](./architecture/vibed-analysis-pipeline.md): Deep dive with Mermaid diagrams
- [Vibe Metrics v2](./architecture/vibe-metrics-v2.md): Axis computation details
- [PRD: Vibed Narrative Layer](./PRD-vibed.md): Product requirements
- [PRD: Profile Aggregation](./PRD-profile-aggregation.md): Multi-repo aggregation

---

*This document should be updated whenever analysis logic, personas, or metrics change.*
