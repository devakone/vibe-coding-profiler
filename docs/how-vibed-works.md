# How Vibe Coding Profile Works

> **Last Updated:** January 2026  
> **Maintainer:** Update this document when analysis logic, personas, or metrics change.

Vibe Coding Profile analyzes your git history to reveal your vibe coding/ AI Assisted Engineering style and patterns. Think of it as "Spotify Wrapped for vibe coders." We look at *how* you build, not *what* you build.

Note: The term "vibe coding" can be polarizing, but it captures the cultural moment around AI-shaped development. We personally prefer "AI Assisted Engineering" because it’s more explicit about the role of AI. This is a playful side project, so we lean into the pop framing and keep it approachable for non-technical folks.

---

## The Big Picture

```
Your Git History → Analysis → Vibe Coding Profile (VCP)
     ↓                ↓            ↓
  Commits         Metrics      Persona + Insights
  PRs             Axes         Narrative
  Timing          Scores       Share Cards
```

**Key Principle:** Vibe Coding Profile is *observational, not judgmental*. We detect patterns, not quality. Every coding style has strengths.

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
| **Automation Heaviness** | How much you rely on AI agents and tools for generating code |
| **Guardrail Strength** | How closely tests, CI, and docs follow your AI-generated changes |
| **Iteration Loop Intensity** | How often you run prompt-fix-run loops to refine AI output |
| **Planning Signal** | How much structure you define before prompting AI to generate code |
| **Surface Area per Change** | How many parts of the codebase your typical prompt or change touches |
| **Shipping Rhythm** | Your coding session pattern — steady output vs intense vibe sessions |

### Step 5: Detect Persona
Based on your axes, we match you to one of 7 Vibe Personas:

| Persona | Signature Pattern | Tagline |
|---------|-------------------|---------|
| **Vibe Prototyper** | High automation, rapid iteration, minimal guardrails | "You prompt fast, ship fast, and let the code evolve" |
| **Test-First Validator** | Strong guardrails with automation | "You give AI the wheel but keep tests and CI in the passenger seat" |
| **Spec-Driven Architect** | High planning signal, early guardrails | "You write the spec before the prompt — AI follows your blueprint" |
| **Agent Orchestrator** | Wide surface area, high automation | "You orchestrate agents across the stack" |
| **Hands-On Debugger** | Intense fix loops, fast shipping | "You prompt, run, fix, repeat — tight feedback loops" |
| **Rapid Risk-Taker** | High automation, low guardrails, fast shipping | "You trust the AI output and ship" |
| **Reflective Balancer** | Balanced across all axes (fallback) | "You blend AI-assisted speed with manual craft" |

### Step 6: Generate Insights
Deterministic insights are computed server-side:

- **Longest Streak:** Consecutive days with commits
- **Peak Window:** When you code most (mornings, afternoons, evenings, late nights)
- **Chunkiness:** Slicer (focused), Mixer (balanced), or Chunker (wide scope)
- **Tech Signals:** Keywords detected in commit messages
- **Multi-Agent Signals:** Co-author trailers, AI attribution patterns
- **AI Tool Metrics:** Per-tool usage breakdown from Co-Authored-By trailers (see below)

### Step 7: LLM Narrative (Optional)
If LLM is configured, we generate a human-readable narrative about your *AI-assisted coding patterns*, never about what you built, only how you built it and how AI tools shaped your workflow.

**Privacy:** The LLM only sees metadata (timestamps, categories, metrics), never commit message content or code.

---

## AI Tool Detection

Vibe Coding Profile detects which AI coding tools you use by parsing `Co-Authored-By` trailers in your commit messages. Many AI tools automatically add these trailers when they help write code.

### How It Works

1. **Extract** — We parse `Co-Authored-By` trailers from every commit message.
2. **Identify** — Each trailer value is matched against a registry of 11 known AI tools (Claude, GitHub Copilot, Cursor, Aider, Cline, Roo Code, Windsurf, Devin, Codegen, SWE-Agent, Gemini).
3. **Quantify** — We count how many commits each tool co-authored, compute an overall AI collaboration rate, and identify the primary tool.

### What You See

| Metric | Description |
|--------|-------------|
| **AI Collaboration Rate** | Fraction of commits with AI co-authorship (0–100%) |
| **Primary Tool** | The AI tool that appears most frequently |
| **Tool Breakdown** | Per-tool usage percentages |
| **Tool Diversity** | Number of different AI tools detected |
| **Confidence** | high/medium/low based on number of AI-assisted commits |

### Limitations

- **Trailer-dependent:** If an AI tool doesn't add `Co-Authored-By` trailers, we can't detect it. IDE autocomplete, copy-paste from ChatGPT, etc. are invisible.
- **Pattern matching:** A human co-author whose name matches a tool pattern (e.g., someone named "Claude") could be counted. This is rare in practice.
- **Not usage tracking:** We detect presence in commits, not how much of the code the tool wrote.

### Where It Appears

- **Repo VCP:** AI tools section on individual repo analysis pages
- **Unified VCP:** Aggregated across all your repos on the dashboard
- **Public Profile:** Visible when the "AI Tools" toggle is enabled (default: on)

See [AI Tool Metrics Architecture](./architecture/ai-tool-metrics.md) for technical details.

---

## Profile Aggregation

### Single Repo Analysis
One repo gives you a snapshot of your coding style for that project.

### Multi-Repo Unified VCP
When you analyze multiple repos, Vibe Coding Profile aggregates them into a single **Unified VCP**:

```
Repo A Analysis  ─┐
Repo B Analysis  ─┼─→ Unified VCP
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

## What Vibe Coding Profile Is NOT

- **Not a productivity tracker:** We don't measure "good" vs "bad"
- **Not a code quality tool:** We don't analyze code, just patterns
- **Not an AI policing tool:** We show which AI tools you use as a feature, not a judgment. Every coding style has strengths.
- **Not surveillance:** You control what repos to analyze, data is yours

---

## Privacy Principles

1. **No code access:** We only read metadata from GitHub API
2. **No message content to LLM:** Commit messages are classified locally, never sent to AI
3. **User-controlled:** You choose which repos to analyze
4. **Deletable:** Disconnect a repo and all analysis data is removed

---

## Attribution

Vibe Coding Profile builds on research and concepts from the developer tooling community:

- **"Vibe coding"**: Term coined by [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383) in February 2025, later named [Collins Dictionary Word of the Year 2025](https://en.wikipedia.org/wiki/Vibe_coding).
- **Orchestrator vs Conductor patterns**: From [Addy Osmani's work on agentic coding](https://addyosmani.com/blog/future-agentic-coding/).
- **Code analytics research**: Informed by [GitClear's developer productivity studies](https://www.gitclear.com/).
- **Persona taxonomy**: Original synthesis drawing from academic TDD research, [GitHub Copilot documentation](https://docs.github.com/en/copilot), and developer workflow studies.

Our internal research documents are available in [docs/research/](./research/).

---

## Related Documentation

- [Technical Architecture](./architecture/vibed-analysis-pipeline.md): Deep dive with Mermaid diagrams
- [Vibe Metrics v2](./architecture/vibe-metrics-v2.md): Axis computation details
- [AI Tool Metrics](./architecture/ai-tool-metrics.md): Tool detection pipeline and registry
- [PRD: Vibe Coding Profile Narrative Layer](./PRD-vibed.md): Product requirements
- [PRD: Profile Aggregation](./PRD-profile-aggregation.md): Multi-repo aggregation

---

*This document should be updated whenever analysis logic, personas, or metrics change.*
