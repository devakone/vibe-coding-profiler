# AI Tool Metrics Architecture

> **Last Updated:** January 2026
> **Maintainer:** Update this document when AI tool detection logic, registry, or display changes.

This document describes how Vibe Coding Profile detects, quantifies, and displays AI coding tool usage from Git metadata.

---

## Overview

AI tool metrics answer the question: **"Which AI coding tools does this developer use, and how much?"**

The system parses `Co-Authored-By` trailers from commit messages, identifies known AI tools via pattern matching, and computes per-tool usage breakdowns. These metrics are stored per-repo in `vibe_insights` and aggregated across repos for unified profiles and public profiles.

**Relation to Multi-Agent Detection:** AI tool metrics are a downstream consumer of the multi-agent signal pipeline (see [multi-agent-detection.md](../prd/analysis/multi-agent-detection.md)). Multi-agent detection extracts raw trailer signals; AI tool metrics normalize and quantify them for display.

---

## Signal → Metric Pipeline

```
Git History
    │
    ▼
┌─────────────────────────────┐
│  1. EXTRACTION (Signals)    │
│  parseCommitTrailers()      │   packages/core/src/index.ts
│  → Co-Authored-By values    │
│  → AI trailer values        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  2. IDENTIFICATION          │
│  identifyAITool()           │   packages/core/src/index.ts
│  → Pattern match against    │   packages/core/src/vibe.ts
│    AI_TOOL_REGISTRY         │
│  → Returns tool_id or null  │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  3. AGGREGATION (Metrics)   │
│  extractAIToolMetrics()     │   packages/core/src/vibe.ts
│  → Per-tool commit counts   │
│  → Collaboration rate       │
│  → Primary tool             │
│  → Confidence level         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  4. STORAGE                 │
│  vibe_insights.ai_tools_json│   Supabase (JSONB)
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  5. DISPLAY                 │
│  VCPAIToolsSection          │   apps/web/src/components/
│  → Repo VCP                 │     vcp/blocks/VCPAIToolsSection.tsx
│  → Unified VCP dashboard    │
│  → Public profile           │
└─────────────────────────────┘
```

---

## Signal vs Metric Classification

### Signals (Raw Extracted Data)

Signals are atomic observations extracted directly from commit data. They are **inputs** to the analysis pipeline.

| Signal | Source | Description |
|--------|--------|-------------|
| `co_author_count` | `Co-Authored-By` trailers | Total Co-Authored-By trailers across all commits |
| `ai_trailer_count` | `Generated-by`, `AI-assisted-by`, or values containing AI tool names | Total AI-related trailers |
| `ai_keyword_count` | Commit message subject lines | Matches against agent keyword regex |
| `tool_co_authors` | Co-Authored-By values parsed by tool | Per-tool commit counts and evidence SHAs |
| `ai_config_files` | File paths in commits | Presence of .cursorrules, CLAUDE.md, etc. |

**Location:** Signals are stored in `analysis_insights.insights_json.multi_agent_signals`.

### Metrics (Derived, Displayable)

Metrics are meaningful measurements computed from signals. They are **outputs** for display.

| Metric | Derived From | Description |
|--------|-------------|-------------|
| `ai_collaboration_rate` | `ai_assisted_commits / total_commits` | Fraction of commits with AI co-authorship (0–1) |
| `primary_tool` | Highest count in `tool_co_authors` | Most frequently used AI tool |
| `tool_diversity` | Count of distinct tools in `tool_co_authors` | Number of different AI tools used |
| `tool_breakdown` | `tool_co_authors` ranked by count | Per-tool usage with percentages |
| `confidence` | Total signal count | high/medium/low based on data volume |

**Location:** Metrics are stored in `vibe_insights.ai_tools_json` as `AIToolMetrics`.

---

## Tool Registry

The registry maps Co-Authored-By values to known AI tools via regex patterns.

**Location:** `packages/core/src/index.ts` (`AI_TOOL_REGISTRY`) and `packages/core/src/vibe.ts` (`VIBE_AI_TOOL_PATTERNS`, a local copy to avoid circular imports).

| Tool ID | Display Name | Patterns | Detection Source |
|---------|-------------|----------|-----------------|
| `claude` | Claude | `/claude/i`, `/anthropic/i` | Co-Authored-By trailers from Claude Code, Claude CLI |
| `copilot` | GitHub Copilot | `/copilot/i` | Co-Authored-By from Copilot coding agent |
| `cursor` | Cursor | `/cursor/i` | Co-Authored-By from Cursor IDE |
| `aider` | Aider | `/aider/i` | Co-Authored-By from Aider CLI |
| `cline` | Cline | `/cline/i` | Co-Authored-By from Cline extension |
| `roo` | Roo Code | `/\broo\b/i` | Co-Authored-By from Roo Code |
| `windsurf` | Windsurf | `/windsurf/i`, `/codeium/i` | Co-Authored-By from Windsurf/Codeium |
| `devin` | Devin | `/devin/i`, `/cognition/i` | Co-Authored-By from Devin agent |
| `codegen` | Codegen | `/codegen/i` | Co-Authored-By from Codegen |
| `swe-agent` | SWE-Agent | `/swe-?agent/i` | Co-Authored-By from SWE-Agent |
| `gemini` | Gemini | `/gemini/i`, `/google.*ai/i` | Co-Authored-By from Gemini |

**Adding a new tool:** Add an entry to `AI_TOOL_REGISTRY` in `index.ts` and `VIBE_AI_TOOL_PATTERNS` in `vibe.ts`. Add a test in `parseCommitTrailers.test.ts`.

---

## Data Model

### AIToolMetrics (TypeScript)

```typescript
interface AIToolMetrics {
  detected: boolean;
  ai_assisted_commits: number;
  ai_collaboration_rate: number;  // 0–1
  primary_tool: { id: string; name: string } | null;
  tool_diversity: number;
  tools: Array<{
    tool_id: string;
    tool_name: string;
    commit_count: number;
    percentage: number;  // 0–100
  }>;
  confidence: "high" | "medium" | "low";
}
```

### Database Column

```sql
-- vibe_insights table
ai_tools_json JSONB DEFAULT NULL
```

Stores a single `AIToolMetrics` JSON object per repo analysis.

### Cross-Repo Aggregation

For unified profiles and public profiles, AI tool metrics are aggregated across repos:

```typescript
function aggregateAIToolMetrics(
  repoMetrics: Array<{ aiTools: AIToolMetrics | null; totalCommits: number }>
): AIToolMetrics
```

**Aggregation logic:**
1. Merge tool commit counts across all repos
2. Sum `ai_assisted_commits` across repos
3. Recompute `ai_collaboration_rate` from total commits across all repos
4. Recompute `percentage` for each tool from merged totals
5. Determine `primary_tool` from aggregate counts
6. Set `confidence` based on aggregate `ai_assisted_commits`

---

## Confidence Calculation

| Level | Threshold | Rationale |
|-------|-----------|-----------|
| **high** | ≥10 AI-assisted commits | Enough data for reliable percentages |
| **medium** | 3–9 AI-assisted commits | Some data, take with context |
| **low** | 1–2 AI-assisted commits | Limited evidence |

If `detected` is `false` (zero AI co-authors), the section is hidden entirely.

---

## UI Integration Points

### 1. Repo VCP (`/analysis/[jobId]`)

**File:** `apps/web/src/app/analysis/[jobId]/AnalysisClient.tsx`

Computes `aiToolMetrics` from `vibe_insights.ai_tools_json`, with fallback to `analysis_insights.insights_json.multi_agent_signals.tool_co_authors` for legacy analyses.

### 2. Unified VCP Dashboard (`/` authenticated)

**File:** `apps/web/src/app/page.tsx`

Aggregates AI tools from `vibe_insights.ai_tools_json` across all user job IDs stored in `user_profiles.job_ids`.

### 3. Public Profile (`/u/[username]`)

**File:** `apps/web/src/app/u/[username]/page.tsx`

Same aggregation as unified VCP. Gated by `show_ai_tools` setting (default: `true`).

### 4. Public Profile API (`/api/public/[username]`)

**File:** `apps/web/src/app/api/public/[username]/route.ts`

Returns `ai_tools` in response when `show_ai_tools` is enabled.

### Display Component

**File:** `apps/web/src/components/vcp/blocks/VCPAIToolsSection.tsx`

Shows:
- Section header ("Vibe Coding Tools")
- Primary tool badge with percentage
- Per-tool progress bars sorted by usage
- Summary stats grid: AI collaboration rate, tools used, confidence level

Returns `null` when `!detected || tools.length === 0`.

---

## Known Limitations

1. **Not all tools add Co-Authored-By:** Some AI tools (IDE extensions, autocomplete) don't leave commit trailers. These are invisible to the system.
2. **Keyword matching has false positive risk:** A human co-author named "Claude" would match. The system relies on the combination of trailer format + pattern matching to reduce false positives.
3. **Only detects tools that leave commit metadata:** Local AI usage that doesn't result in trailers (e.g., copying from ChatGPT) is undetectable.
4. **Backfill required:** Existing analyses before this feature won't have `ai_tools_json` until re-analyzed. UI handles `null` gracefully by hiding the section.
5. **Registry maintenance:** New AI tools must be manually added to the registry. The patterns may need updating as tools change their trailer formats.
6. **Per-commit deduplication:** If a commit has multiple Co-Authored-By trailers for the same tool, each is counted separately.

---

## Related Documentation

- [Multi-Agent Detection PRD](../prd/analysis/multi-agent-detection.md) — Signal extraction phases
- [Vibe Coding Profile Metrics v2](./vibe-coding-profile-metrics-v2.md) — Core axis computation
- [Analysis Pipeline](./vibed-analysis-pipeline.md) — End-to-end architecture
- [How Vibe Coding Profile Works](../how-vibe-coding-profile-works.md) — Product-facing overview

---

*This document should be updated whenever AI tool detection logic, the tool registry, or display components change.*
