# PRD: Multi-Agent Workflow Detection

## Overview

**Status:** Implemented (Phases 1-6 complete)
**Priority:** High
**Owner:** TBD
**Created:** January 2026

### Problem Statement
Vibe Coding Profile currently has limited detection of multi-agent workflows and AI-assisted development patterns. As vibe coding becomes mainstream (25% of YC W25 batch has 95% AI-generated codebases), we need stronger signals to identify and characterize these workflows.

### Goal
Implement three high-ROI detection capabilities that require no new data ingestion:
1. Commit trailer parsing (Co-authored-by, AI provenance)
2. AI config file detection (.cursorrules, CLAUDE.md, etc.)
3. Expanded agent keyword matching

### Success Metrics
- Detect AI assistance signals in repos where known AI tools were used
- Surface multi-agent indicators in persona detection
- No false positives on repos without AI tooling

---

## Research Summary

See: [multi-agent-vibe-coding-patterns.md](../../research/multi-agent-vibe-coding-patterns.md)

### What We Have Today
| Capability | Status | Location |
|------------|--------|----------|
| Bot/automation filtering | ✅ Done | `isAutomationCommit()` in index.ts |
| Agent keyword regex | ✅ Partial | `agentKeywordRegex` - only 5 terms |
| File path subsystem classification | ✅ Done | `SUBSYSTEM_PATTERNS` in vibe.ts |
| Episode building from file_paths | ✅ Done | `buildWorkEpisodes()` in vibe.ts |
| Commit trailer parsing | ❌ Missing | — |
| AI config file detection | ❌ Missing | — |

### What We Can Add (No New Ingestion)
We already store full commit messages and file_paths, enabling:
- **Trailer parsing**: Parse `Co-authored-by:`, `Signed-off-by:`, custom AI trailers
- **AI config detection**: Match file paths against AI tool config patterns
- **Expanded keywords**: Add copilot, claude, aider, cline, etc. to regex

---

## Implementation Tracker

### Phase 1: AI Config File Detection
**File:** `packages/core/src/vibe.ts`

| Task | Status | Notes |
|------|--------|-------|
| Add `ai_config` to Subsystem type | ✅ Done | |
| Add AI config patterns to SUBSYSTEM_PATTERNS | ✅ Done | Before "infra" for priority |
| Verify patterns don't over-match | ✅ Done | Unit tests added |

**Patterns to add:**
```
.cursorrules, .cursor/rules/*
CLAUDE.md, .claude, .claudeignore
.github/copilot-instructions.md, .github/copilot/*, .copilotignore
.aider.conf, aider.conf
.clinerules, .cline/
.ai-config, .airc
```

### Phase 2: Expanded Agent Keywords
**File:** `packages/core/src/index.ts`

| Task | Status | Notes |
|------|--------|-------|
| Expand agentKeywordRegex | ✅ Done | Add ~8 new terms |
| Verify no false positives | ✅ Done | "agent" in unrelated context |

**Keywords to add:**
- copilot, claude, aider, cline, roo, swe-agent, devin, codegen, windsurf

### Phase 3: Commit Trailer Parsing
**File:** `packages/core/src/index.ts`

| Task | Status | Notes |
|------|--------|-------|
| Add `parseCommitTrailers()` function | ✅ Done | Extract key-value pairs from message body |
| Add trailer evidence collection in loop | ✅ Done | coAuthorEvidence, aiTrailerEvidence |
| Update PersonaDetectionArgs interface | ✅ Done | Add new fields |
| Update detectPersona() scoring | ✅ Done | Co-author → spec-architect, AI trailers → agent-orchestrator |
| Add multi_agent_signals to AnalysisInsights | ✅ Done | Surface counts and evidence |

**Trailers to detect:**
- `Co-authored-by:` - pairing/supervision signal
- `Signed-off-by:`, `Reviewed-by:`, `Tested-by:` - structured collaboration
- `Generated-by:`, `AI-assisted-by:` - custom AI provenance
- Values containing "claude", "copilot", "cursor" - AI co-author attribution

### Phase 4: Testing & Verification

| Task | Status | Notes |
|------|--------|-------|
| Unit tests for parseCommitTrailers() | ✅ Done | |
| Unit tests for AI config patterns | ✅ Done | |
| Integration test with known AI repo | ⬜ Todo | |
| Run npm test in packages/core | ✅ Done | 31 tests passing |
| Run npm build in packages/core | ✅ Done | |

### Phase 5: Artifacts & Traceability (Conductor vs Orchestrator)

Orchestrator workflows tend to leave a durable “git trail” (branches, commits, pull requests, and issue linkage) that improves traceability and collaboration, while conductor-style IDE chat can be more ephemeral unless the developer captures intermediate work in commits and PRs. Source: [Addy Osmani: The future of agentic coding (conductors to orchestrators)](https://addyosmani.com/blog/future-agentic-coding/).

**Gate:** Requires PR metadata ingestion (see “Extension PRD: PR Metadata Ingestion (vNext)”). Branch topology ingestion further strengthens these signals.

| Task | Status | Notes |
|------|--------|-------|
| Add “artifact traceability” signals to insights | ✅ Done | `ArtifactTraceability` interface with PR coverage, issue link rate, structured PR rate |
| Add conductor vs orchestrator scoring hooks | ✅ Done | `WorkflowStyle` type with orchestrator/conductor/hybrid detection |
| Surface artifact evidence in UI | ✅ Done | Workflow Style section with metrics and score breakdown |

### Phase 6: AI Tool Metrics & VCP Display

Surfaces per-tool AI usage data to users. Formalizes the distinction between raw **signals** (extracted from commits) and derived **metrics** (displayed in UI).

**Files modified:**
- `packages/core/src/index.ts` — AI tool registry, `identifyAITool()`, per-tool collection in trailer loop
- `packages/core/src/vibe.ts` — `AIToolMetrics` type, `extractAIToolMetrics()`, aggregation across repos
- `packages/core/src/__tests__/parseCommitTrailers.test.ts` — 20 new tests for tool identification and metrics
- `supabase/migrations/20260130003641_add_ai_tools_to_vibe_insights.sql` — `ai_tools_json` JSONB column
- `packages/db/src/database.types.ts` — Column types
- `apps/web/src/inngest/functions/analyze-repo.ts` — Store and aggregate `ai_tools_json`
- `apps/web/src/components/vcp/blocks/VCPAIToolsSection.tsx` — **NEW** display component
- `apps/web/src/app/analysis/[jobId]/AnalysisClient.tsx` — Repo VCP integration
- `apps/web/src/app/page.tsx` — Unified VCP dashboard integration
- `apps/web/src/components/public-profile/PublicProfileView.tsx` — Public profile integration
- `apps/web/src/types/public-profile.ts` — `show_ai_tools` toggle
- `apps/web/src/components/settings/PublicProfileSettings.tsx` — Settings UI toggle

| Task | Status | Notes |
|------|--------|-------|
| AI tool registry (11 tools) and `identifyAITool()` | ✅ Done | Pattern-based matching against Co-Authored-By values |
| Per-tool signal collection in trailer loop | ✅ Done | `tool_co_authors` in `multi_agent_signals` |
| `AIToolMetrics` type and `extractAIToolMetrics()` | ✅ Done | Self-contained in vibe.ts (no circular imports) |
| `ai_tools` in `VibeInsightsV1` | ✅ Done | Computed during `computeVibeFromCommits()` |
| Cross-repo aggregation (`aggregateAIToolMetrics()`) | ✅ Done | Merges tool counts, recomputes percentages |
| Database migration (`ai_tools_json` column) | ✅ Done | JSONB on `vibe_insights` |
| Storage in Inngest worker | ✅ Done | Stored during vibe_insights upsert |
| `VCPAIToolsSection` component | ✅ Done | Primary tool badge, per-tool bars, stats grid |
| Repo VCP integration | ✅ Done | Between narrative and contribution card |
| Unified VCP dashboard integration | ✅ Done | Between axes and evolution sections |
| Public profile integration | ✅ Done | Prominent placement after axes chart |
| `show_ai_tools` settings toggle | ✅ Done | Default: true |
| Unit tests (20 new) | ✅ Done | identifyAITool, extractAIToolMetrics, edge cases |

**Signal vs Metric classification:** See [AI Tool Metrics Architecture](../../architecture/ai-tool-metrics.md).

**Supported tools:** Claude, GitHub Copilot, Cursor, Aider, Cline, Roo Code, Windsurf, Devin, Codegen, SWE-Agent, Gemini.

---

## Technical Design

### 1. Trailer Parsing Function

```typescript
interface CommitTrailer {
  name: string;
  value: string;
}

function parseCommitTrailers(message: string): CommitTrailer[] {
  const lines = message.split('\n');
  const trailers: CommitTrailer[] = [];

  // Trailers at end of message after blank line
  let inTrailerSection = false;
  for (const line of lines.reverse()) {
    const trimmed = line.trim();
    if (!trimmed) {
      inTrailerSection = true;
      continue;
    }
    if (!inTrailerSection) continue;

    const match = trimmed.match(/^([A-Z][a-zA-Z-]+):\s*(.+)$/);
    if (match) {
      trailers.push({ name: match[1], value: match[2] });
    } else if (trailers.length > 0) {
      break; // Stop at non-trailer content
    }
  }

  return trailers;
}
```

### 2. AI Config Subsystem Patterns

```typescript
{
  subsystem: "ai_config",
  patterns: [
    /\.cursorrules$/i,
    /\.cursor\/rules/i,
    /CLAUDE\.md$/i,
    /\.claude$/i,
    /\.claudeignore$/i,
    /\.github\/copilot-instructions\.md$/i,
    /\.github\/copilot\//i,
    /\.copilotignore$/i,
    /\.aider\.conf/i,
    /\.clinerules$/i,
    /\.cline\//i,
  ],
}
```

### 3. Updated PersonaDetectionArgs

```typescript
interface PersonaDetectionArgs {
  // ... existing fields ...
  coAuthorCount: number;
  coAuthorEvidence: string[];
  aiTrailerCount: number;
  aiTrailerEvidence: string[];
}
```

### 4. New Output Structure

```typescript
multi_agent_signals: {
  co_author_count: number;
  ai_trailer_count: number;
  ai_keyword_count: number;
  ai_config_touched: boolean;
  confidence: AnalysisInsightConfidence;
  evidence_shas: string[];
}
```

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives on "agent" keyword | Medium | Low | Downweight keywords vs trailers in scoring |
| Over-matching AI config patterns | Low | Low | Test against diverse repos |
| Performance impact of trailer parsing | Low | Low | Simple string operations, no external calls |

---

## Future Work (Requires New Ingestion)

These are documented but out of scope for this PRD:

1. **PR metadata** - merge method, issue links, review patterns
2. **Branch topology** - parallel branches, naming conventions
3. **Commit-to-PR mapping** - squash detection, PR hygiene signals

See architecture spec: [vibe-metrics-v2.md](../../architecture/vibe-metrics-v2.md)

---

## Extension PRD: PR Metadata Ingestion (vNext)

This section turns “PR metadata” from future work into an implementable plan. It is intentionally separate from Phases 1–4 because it requires new ingestion and new tables.

### Goal
Ingest enough pull request metadata to strengthen multi-agent orchestration detection beyond commit-only signals.

### Non-Goals (vNext)
- Full PR timeline ingestion (every event)
- Cross-platform PR/merge request normalization (GitLab/Bitbucket)
- Perfect commit-to-PR mapping across all merge styles (tracked separately)

### Data to Ingest (GitHub)
- PR fields: number, title, body, state, created_at, closed_at, merged_at, merged, author login, base/head refs, merge_commit_sha
- Size fields: changed_files, additions, deletions, commits
- Collaboration fields: comments, review_comments, review decision (if available), reviews count

### Signals We Can Derive
- Merge method distribution: squash vs merge vs rebase
- Review dynamics: review counts, time-to-first-review, approvals vs comments-only
- Template/checklist usage: checkboxes in body, “## Checklist” markers, template headings
- Issue linking: “Fixes #123”, “Closes #123”, “Resolves #123”
- Orchestration shape (aggregate): many small PRs, high squash rate, consistent templating

### Proposed Schema
**Primary tables**
- `pull_requests`
  - Align with architecture sketch in [vibe-metrics-v2.md](../../architecture/vibe-metrics-v2.md)
  - Key columns: `repo_id`, `github_pr_number`, `title`, `body`, `state`, `merged`, `merged_at`, `created_at`, `closed_at`, size and collaboration counts, `merge_method`

**Optional tables**
- `pull_request_reviews`
  - `repo_id`, `github_pr_number`, `github_review_id`, `author_login`, `state`, `submitted_at`

### Ingestion Approach
- Fetch scope: last N PRs per repo (e.g. 200) or last X days (e.g. 90), whichever yields fewer rows
- Store per-repo watermark: `last_pr_sync_at` (new column on `repos` or separate `repo_sync_state`)
- Run ingestion as part of analysis job execution, before computing `AnalysisInsights`

### Implementation Tracker (vNext)
See: [PR Metadata Ingestion Tracker](../../implementation-trackers/multi-agent-pr-metadata-ingestion.md)

---

## References

- [Research: Multi-Agent Vibe Coding Patterns](../../research/multi-agent-vibe-coding-patterns.md)
- [Architecture: Vibe Metrics v2](../../architecture/vibe-metrics-v2.md)
- [Addy Osmani: The future of agentic coding (conductors to orchestrators)](https://addyosmani.com/blog/future-agentic-coding/)
- [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent)
- [Git Worktrees for AI Agents](https://nx.dev/blog/git-worktrees-ai-agents)
