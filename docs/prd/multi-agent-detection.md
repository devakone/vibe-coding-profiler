# PRD: Multi-Agent Workflow Detection

## Overview

**Status:** Planning
**Priority:** High
**Owner:** TBD
**Created:** January 2026

### Problem Statement
Vibed currently has limited detection of multi-agent workflows and AI-assisted development patterns. As vibe coding becomes mainstream (25% of YC W25 batch has 95% AI-generated codebases), we need stronger signals to identify and characterize these workflows.

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

See: [multi-agent-vibe-coding-patterns.md](../research/multi-agent-vibe-coding-patterns.md)

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
| Add `ai_config` to Subsystem type | ⬜ Todo | |
| Add AI config patterns to SUBSYSTEM_PATTERNS | ⬜ Todo | Before "infra" for priority |
| Verify patterns don't over-match | ⬜ Todo | |

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
| Expand agentKeywordRegex | ⬜ Todo | Add ~8 new terms |
| Verify no false positives | ⬜ Todo | "agent" in unrelated context |

**Keywords to add:**
- copilot, claude, aider, cline, roo, swe-agent, devin, codegen, windsurf

### Phase 3: Commit Trailer Parsing
**File:** `packages/core/src/index.ts`

| Task | Status | Notes |
|------|--------|-------|
| Add `parseCommitTrailers()` function | ⬜ Todo | Extract key-value pairs from message body |
| Add trailer evidence collection in loop | ⬜ Todo | coAuthorEvidence, aiTrailerEvidence |
| Update PersonaDetectionArgs interface | ⬜ Todo | Add new fields |
| Update detectPersona() scoring | ⬜ Todo | Co-author → spec-architect, AI trailers → agent-orchestrator |
| Add multi_agent_signals to AnalysisInsights | ⬜ Todo | Surface counts and evidence |

**Trailers to detect:**
- `Co-authored-by:` - pairing/supervision signal
- `Signed-off-by:`, `Reviewed-by:`, `Tested-by:` - structured collaboration
- `Generated-by:`, `AI-assisted-by:` - custom AI provenance
- Values containing "claude", "copilot", "cursor" - AI co-author attribution

### Phase 4: Testing & Verification

| Task | Status | Notes |
|------|--------|-------|
| Unit tests for parseCommitTrailers() | ⬜ Todo | |
| Unit tests for AI config patterns | ⬜ Todo | |
| Integration test with known AI repo | ⬜ Todo | |
| Run pnpm test in packages/core | ⬜ Todo | |
| Run pnpm build in apps/web | ⬜ Todo | |

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

See architecture spec: [vibe-metrics-v2.md](../architecture/vibe-metrics-v2.md)

---

## References

- [Research: Multi-Agent Vibe Coding Patterns](../research/multi-agent-vibe-coding-patterns.md)
- [Architecture: Vibe Metrics v2](../architecture/vibe-metrics-v2.md)
- [GitHub Copilot Coding Agent](https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent)
- [Git Worktrees for AI Agents](https://nx.dev/blog/git-worktrees-ai-agents)
