# Multi-Agent Workflows & Emerging Vibe Coding Patterns

## Research Summary
**Date:** January 2026  
**Goal:** Document how Vibe Coding Profile currently detects “agentic” workflows, what multi-agent/worktree workflows look like in Git signals, and what’s missing to detect them reliably.

Multi-agent workflow (for Vibe Coding Profile) means: multiple autonomous tools/agents working in parallel with human steering via PR review, commit trailers, structured instructions, and/or branch management. It is adjacent to “automation” but not the same as bot maintenance (Dependabot/Renovate).

---

## 1) What Vibe Coding Profile Can Observe Today (Repo Audit)

### What data we actually ingest

The current analysis pipeline fetches commit metadata via GitHub and stores it per job:
- Commit message is stored as `commit.message` (full message body, not just the subject).
- Commit author email + timestamps + parents + additions/deletions + file list when available.
- File paths are collected from GitHub’s commit detail “files” array and stored as `file_paths`.

Primary implementation: [analyze-repo.ts](file:///Users/devakone/Projects/vibed-codingn/apps/web/src/inngest/functions/analyze-repo.ts#L426-L899)

### Where we compute “vibes” and personas today

There are two interpretation layers:
- A commit-insights layer that computes a simple persona + timing + category stats from commit messages only: [computeAnalysisInsights](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/index.ts#L1005-L1244)
- A v2 “axes → persona → cards” layer that computes 6 axes and then maps to personas: [computeVibeFromCommits](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/vibe.ts#L1358-L1493) and [detectVibePersona](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/vibe.ts#L812-L967)

### What “agentic” detection exists right now

**1) Bot/automation filtering**
- We filter likely bot commits by email substrings (e.g., dependabot, renovate, github-actions) and subject patterns.
- This cleans up human behavioral signals but can hide “agent commits” if they come from bot-like emails.

Implementation: [isAutomationCommit](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/index.ts#L599-L645)

**2) Agent keyword evidence (commit messages)**
- We collect “agent evidence” by matching a keyword regex against the commit subject.
- Persona “Multi-Agent Orchestrator” in the insights layer is currently driven by “chunkiness” + file-change breadth + this keyword evidence.

Implementation: [computeAnalysisInsights](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/index.ts#L1026-L1199) and [detectPersona](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/index.ts#L296-L430)

**3) Broad-change proxies**
- Vibe v2 uses “automation heaviness” and “surface area per change” (via file paths / episodes) as indirect proxies.

Implementation: [computeVibeFromCommits](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/vibe.ts#L1358-L1493)

### What we are not ingesting (but architecture anticipates)

The architecture doc explicitly calls for PR metadata and commit→PR mapping, but the current worker/pipeline does not populate those tables yet.

Reference: [vibe-coding-profile-metrics-v2.md](file:///Users/devakone/Projects/vibed-codingn/docs/architecture/vibe-coding-profile-metrics-v2.md#L13-L122)

---

## 2) Worktrees: What We Can and Cannot Detect

**Hard limitation:** local Git worktrees are not visible to GitHub APIs. Worktree metadata lives in `.git/worktrees/*` locally, so Vibe Coding Profile cannot “see worktrees” for GitHub-hosted analysis unless we ingest local repo state (we do not).

Practical implication: “worktree usage” must be inferred indirectly via GitHub-visible artifacts:
- branch naming conventions
- multiple branches / PRs in flight concurrently
- commit/PR attribution patterns that indicate autonomous execution

External background reading (not a product dependency): https://nx.dev/blog/git-worktrees-ai-agents

---

## 3) Multi-Agent Signals We Can Add Without New Data Sources

These are the best “high signal, low ambiguity” additions because we already store the required fields.

### A) Commit trailer parsing (strong signal)

Because we store the full commit message body, we can parse Git trailers:
- `Co-authored-by:` (pairing, supervision, some agent systems)
- `Reviewed-by:`, `Tested-by:`, `Signed-off-by:` (structured collaboration signals)
- Custom provenance trailers (teams sometimes adopt `Generated-by:` / `AI-assisted-by:`)

Why this matters for multi-agent: autonomous agents and review-driven workflows tend to leave structured attribution trails rather than ad-hoc prose.

External reference (Copilot coding agent co-authorship): https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent

### B) AI-tool instruction/config file “touches” (strong signal)

We have per-commit file paths. That enables detecting when repos add or edit:
- `.cursor/rules/*` (Cursor project rules), `.cursorrules` (legacy / deprecated)
- `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md` (Claude Code memory/rules)
- `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` (Copilot instructions)
- `AGENTS.md` (agent instructions; increasingly cross-tool)
- `.aider.conf*`, `.clinerules`, etc.

This avoids reading file contents; it’s purely “file was modified”.

### C) “Orchestration language” in subjects (medium signal)

We already regex for `agent|cursor|autonomous|auto-gpt`. We could expand to include:
- `copilot`, `claude`, `aider`, `cline`, `roo`, `swe-agent`

This is weaker than trailers because it’s easy to false-positive (“agent” in unrelated context).

### D) Standards reference: what these files mean across tools

**Cursor rules**
- Current recommended location: `.cursor/rules/*.md` or `.cursor/rules/*.mdc` (rules are markdown with optional frontmatter).
- Legacy: `.cursorrules` in repo root is still supported but deprecated in favor of `.cursor/rules/`.
- Reference: https://cursor.com/docs/context/rules

**Claude Code memory / rules**
- Team-shared project memory: `./CLAUDE.md` or `./.claude/CLAUDE.md`
- Modular project rules: `./.claude/rules/*.md` (optional frontmatter can scope by paths/globs)
- Local-only project memory: `./CLAUDE.local.md` (typically gitignored)
- Reference: https://code.claude.com/docs/en/memory and https://code.claude.com/docs/en/settings

**GitHub Copilot instructions**
- Repo-wide instructions: `./.github/copilot-instructions.md`
- Path-specific instructions: `./.github/instructions/*.instructions.md` (applies to matching paths; merges with repo-wide)
- Agent instructions: one or more `AGENTS.md` files anywhere in the repo (nearest file in directory tree takes precedence)
- Reference: https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot

**AGENTS.md (cross-tool open convention)**
- Format is plain Markdown; no required schema.
- Intended conflict behavior is “closest AGENTS.md wins” (monorepo-friendly).
- Reference: https://agents.md/ and https://developers.openai.com/codex/guides/agents-md

---

## 4) Multi-Agent Signals That Require New Ingestion

### A) PR metadata and review dynamics (strong signal once available)

Multi-agent orchestration often shows up as:
- bot-authored PRs with human review
- rapid PR creation after issue assignment
- consistent PR templates/checklists
- high squash-merge rate (agentic PR hygiene)

We have a clear target schema in [vibe-coding-profile-metrics-v2.md](file:///Users/devakone/Projects/vibed-codingn/docs/architecture/vibe-coding-profile-metrics-v2.md#L173-L265), but it’s not currently populated.

### B) Branch topology / parallelism (medium signal)

Worktree workflows typically imply:
- multiple active branches at once
- frequent short-lived branches
- predictable prefixes like `copilot/`, `agent/`, `cursor/`, `claude/`, `wt/`

GitHub exposes branch refs and PR metadata, but Vibe Coding Profile would need to fetch and persist those.

### C) Commit-to-PR mapping (enabler)

Mapping commits to PRs enables:
- “how many commits land outside PRs”
- “how many commits are squash merges”
- “how chunkiness differs inside PRs vs direct-to-main”

Reference architecture: [vibe-coding-profile-metrics-v2.md](file:///Users/devakone/Projects/vibed-codingn/docs/architecture/vibe-coding-profile-metrics-v2.md#L141-L191)

---

## 5) Patterns We’re Missing (Beyond Multi-Agent)

These are “emerging or consolidating” Git-visible patterns that align with vibe-coding behaviors, and can be measured without reading code contents.

### A) Provenance and accountability conventions
- Git trailers indicating AI assistance or review structure (pair-programming, agent authorship, supervisor co-authorship).
- Systematic commit templates vs free-form.

### B) Context engineering as versioned artifacts
- Presence and evolution of tool instruction files (via file path touches).
- Early appearance of docs/spec markers (already partially covered by first-touch logic in vibe v2).

### C) “Stabilize after ship” cadence signatures
- Strong “fix-after-feature adjacency” and “episode ends with tests/docs/ci” patterns (already partially present in axes + episodes, can be expanded).

---

## 6) Recommended Next Additions (Ordered by ROI)

### Highest ROI (no new ingestion)
1) Parse commit trailers and treat them as first-class evidence (especially `Co-authored-by`).
2) Add a “AI tooling config touched” indicator from `file_paths`.
3) Expand agent keyword evidence, but downweight relative to trailers.

### Medium ROI (new ingestion)
4) Fetch PR metadata + commit-to-PR mapping to unlock planning/review/merge-method signals.
5) Track branch naming + concurrent PRs as “parallelism” proxy for worktree-style development.

---

## Appendix: Key Internal References

- [analyze-repo.ts](file:///Users/devakone/Projects/vibed-codingn/apps/web/src/inngest/functions/analyze-repo.ts)
- [packages/core/src/index.ts](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/index.ts)
- [packages/core/src/vibe.ts](file:///Users/devakone/Projects/vibed-codingn/packages/core/src/vibe.ts)
- [vibe-coding-profile-metrics-v2.md](file:///Users/devakone/Projects/vibed-codingn/docs/architecture/vibe-coding-profile-metrics-v2.md)

## Appendix: Sources

### Web research
- Wikipedia: Vibe coding — https://en.wikipedia.org/wiki/Vibe_coding
- The New Stack: AI Engineering Trends in 2025 — https://thenewstack.io/ai-engineering-trends-in-2025-agents-mcp-and-vibe-coding/
- MIT Technology Review: From vibe coding to context engineering — https://www.technologyreview.com/2025/11/05/1127477/from-vibe-coding-to-context-engineering-2025-in-software-development/
- DEV Community: Git worktree + Claude Code — https://dev.to/kevinz103/git-worktree-claude-code-my-secret-to-10x-developer-productivity-520b
- Nx Blog: Git worktrees for AI agents — https://nx.dev/blog/git-worktrees-ai-agents
- Medium: Git worktrees with Claude Code (parallel development) — https://medium.com/@dtunai/mastering-git-worktrees-with-claude-code-for-parallel-development-workflow-41dc91e645fe
- GitHub: git-ai repository — https://github.com/acunniffe/git-ai
- Sonar: Auto-detect AI-generated code (Copilot) — https://www.sonarsource.com/blog/auto-detect-and-review-ai-generated-code-from-github-copilot/
- arXiv: An empirical study on detecting AI-generated source code — https://arxiv.org/abs/2411.04299
