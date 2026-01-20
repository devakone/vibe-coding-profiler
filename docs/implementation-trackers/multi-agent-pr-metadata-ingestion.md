# Implementation Tracker: PR Metadata Ingestion (Multi-Agent Detection)

## Context
This tracker accompanies `docs/prd/multi-agent-detection.md` (Extension PRD: PR Metadata Ingestion). It captures the discrete implementation tasks required to ingest GitHub pull request metadata and incorporate it into multi-agent workflow detection.

## Tracker

### F1. Database Schema
**Task:** Add schema for PR metadata storage with correct access controls.
**Deliverables:**
- [x] Migration adds `pull_requests` (and optional `pull_request_reviews`)
- [x] RLS policies allow users to read PRs for repos they own/connect
- [x] Indexes on `(repo_id, github_pr_number)` and `(repo_id, created_at)`
**Blocks:** F2, F3

### F2. GitHub Fetch + Upsert
**Task:** Fetch PR metadata from GitHub and upsert idempotently into Supabase.
**Deliverables:**
- [x] Worker fetches PR metadata for the target repo
- [x] Upserts into `pull_requests` (idempotent)
- [x] Stores/updates the per-repo watermark (`last_pr_sync_at` or `repo_sync_state`)
**Depends on:** F1
**Blocks:** F3, F4

### F3. Signal Extraction
**Task:** Parse PR content into deterministic PR-derived multi-agent signals.
**Deliverables:**
- [x] Parse PR body for checklist/template markers and linked issue numbers
- [x] Compute aggregate PR signals per repo and/or per job
- [x] Add PR-derived fields to `multi_agent_signals` output
**Depends on:** F2
**Blocks:** F4

### F4. Scoring Integration
**Task:** Incorporate PR-derived signals into persona detection and confidence.
**Deliverables:**
- [x] Incorporate PR-derived signals into persona detection confidence
- [x] Keep commit-only behavior unchanged when PR data is missing
**Depends on:** F3
**Blocks:** F5, F6

### F5. Artifacts & Traceability Signals
**Task:** Compute “artifact trail” signals to separate conductor vs orchestrator workflows.
**Deliverables:**
- [x] Add aggregate artifact/traceability fields to insights output (`ArtifactTraceability` interface)
- [x] Add evidence outputs (PR numbers, merge method distribution, issue-link counts)
- [x] Feed artifact/traceability signals into conductor vs orchestrator scoring (`WorkflowStyle`)
**Depends on:** F3, F4
**Blocks:** F6

### F6. Testing & Verification
**Task:** Validate PR ingestion, parsing, and scoring behavior.
**Deliverables:**
- [x] Unit tests for PR parsing (issue linking, checklist detection)
- [x] Integration test against vibed-coding repo (detected 16 Claude co-authored commits)
**Depends on:** F2, F4, F5
